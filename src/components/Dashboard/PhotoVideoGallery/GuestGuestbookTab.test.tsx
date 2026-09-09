import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveGalleryTheme } from '@/lib/galleryTheme';
import publicUploadStyles from '@/pages/guestMediaUpload.module.css';
import { GuestGuestbookTab } from './GuestGuestbookTab';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  upload: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: mocks.rpc },
}));

vi.mock('@/hooks/useGuestbookUpload', () => ({
  useGuestbookUpload: () => ({
    upload: mocks.upload,
    uploading: false,
    progress: 0,
  }),
}));

const theme = resolveGalleryTheme({ background_style: 'cream' });

const renderGuestbook = () => render(
  <GuestGuestbookTab
    token="public-token"
    theme={theme}
    accent="#967A59"
    voiceEnabled
    textEnabled
  />,
);

describe('public Digital Guestbook glass form', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.rpc.mockReset().mockResolvedValue({ data: 'message-id', error: null });
    mocks.upload.mockReset().mockResolvedValue('recording-id');
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' })) },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('uses the approved Upload glass tokens on the live Guestbook form without white surfaces', () => {
    const { container } = renderGuestbook();

    const heading = screen.getByRole('heading', { name: 'Sign the Guestbook' });
    const panel = heading.closest('.rounded-2xl');
    expect(panel).toHaveClass(publicUploadStyles.uploadPanel, publicUploadStyles.guestbookPanel);
    expect(heading).toHaveClass(publicUploadStyles.sectionHeading);
    expect(screen.getByText(/Leave a written, audio or video message—or any combination/)).toHaveClass(
      publicUploadStyles.secondaryText,
    );

    const name = screen.getByLabelText(/Your full name/i);
    const message = screen.getByPlaceholderText('Write your message for the couple…');
    expect(name).toHaveClass(publicUploadStyles.field);
    expect(message).toHaveClass(publicUploadStyles.field, publicUploadStyles.guestbookTextarea);

    const options = container.querySelectorAll(`.${publicUploadStyles.guestbookOption}`);
    expect(options).toHaveLength(3);
    options.forEach(option => expect(option).toHaveClass(publicUploadStyles.innerPanel));
    const legacyWhiteClasses = [...container.querySelectorAll('.bg-white')];
    expect(legacyWhiteClasses).toEqual([panel]);
    expect(panel).toHaveClass(publicUploadStyles.uploadPanel);
    expect(container.querySelectorAll('.bg-red-50, .bg-green-50')).toHaveLength(0);
    expect(container.querySelectorAll('.text-black')).toHaveLength(0);

    expect(screen.getByRole('button', { name: 'Start Audio Message' })).toHaveClass(publicUploadStyles.primaryAction);
    expect(screen.getByRole('button', { name: 'Start Video Message' })).toHaveClass(publicUploadStyles.primaryAction);
  });

  it('keeps validation and permission errors functional on a dark semantic surface', async () => {
    renderGuestbook();

    fireEvent.click(screen.getByRole('button', { name: 'Start Audio Message' }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Permission denied. Please allow microphone access.');
    expect(error).toHaveClass(publicUploadStyles.guestbookError);
  });

  it('preserves written-message submission and presents success on the scoped green glass state', async () => {
    renderGuestbook();

    fireEvent.change(screen.getByLabelText(/Your full name/i), { target: { value: 'Ken Wilson' } });
    fireEvent.change(screen.getByPlaceholderText('Write your message for the couple…'), {
      target: { value: 'Congratulations!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('submit_event_guestbook_text', {
      _token: 'public-token',
      _uploader_name: 'Ken Wilson',
      _message: 'Congratulations!',
    }));
    const success = await screen.findByRole('status');
    expect(success).toHaveClass(publicUploadStyles.guestbookSuccess);
    expect(success).toHaveTextContent('your message has been added to the guestbook');
  });
  it('clears a saved text draft and creates a separate submission for the next message', async () => {
    renderGuestbook();
    fireEvent.change(screen.getByLabelText(/Your full name/i), { target: { value: 'QA Guest' } });
    for (const value of ['First message', 'Second message']) {
      const input = screen.getByRole('textbox', { name: '' });
      fireEvent.change(input, { target: { value } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await screen.findByRole('button', { name: 'Write Another Message' });
      expect(screen.queryByRole('textbox', { name: '' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Write Another Message' }));
    }
    expect(mocks.rpc.mock.calls.map(call => call[0])).toEqual(['submit_event_guestbook_text', 'submit_event_guestbook_text']);
  });

  it('retains a rejected text draft for retry', async () => {
    mocks.rpc.mockResolvedValueOnce({ error: new Error('Save rejected') });
    renderGuestbook();
    fireEvent.change(screen.getByLabelText(/Your full name/i), { target: { value: 'QA Guest' } });
    const input = screen.getByRole('textbox', { name: '' });
    fireEvent.change(input, { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save rejected');
    expect(input).toHaveValue('Keep this draft');
  });

  it.each(['Audio', 'Video'])('allows two separate %s recordings and retains failed uploads', async (kind) => {
    const stopTrack = vi.fn();
    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
    class Recorder {
      static isTypeSupported() { return true; }
      mimeType: string; state = 'inactive'; ondataavailable: any; onstop: any;
      constructor(_stream: any, options: any) { this.mimeType = options.mimeType; }
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; this.ondataavailable({ data: new Blob(['qa recording'], { type: this.mimeType }) }); this.onstop(); }
    }
    vi.stubGlobal('MediaRecorder', Recorder);
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qa-recording');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    try {
      renderGuestbook();
      fireEvent.change(screen.getByLabelText(/Your full name/i), { target: { value: 'QA Guest' } });
      for (let attempt = 0; attempt < 2; attempt++) {
        fireEvent.click(screen.getByRole('button', { name: attempt === 0 ? 'Start ' + kind + ' Message' : 'Record Again' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Start recording' }));
        fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
        if (attempt === 0) {
          mocks.upload.mockRejectedValueOnce(new Error('Upload failed'));
          fireEvent.click(screen.getByRole('button', { name: 'Save' }));
          expect(await screen.findByRole('alert')).toHaveTextContent('Upload failed');
          expect(screen.getByRole('button', { name: 'Record again' })).toBeEnabled();
        }
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await screen.findByRole('button', { name: 'Record Again' });
        expect(screen.queryByRole('button', { name: 'Record again' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
      }
      expect(mocks.upload).toHaveBeenCalledTimes(3);
      expect(mocks.rpc).not.toHaveBeenCalled();
      expect(revokeUrl).toHaveBeenCalledTimes(2);
    } finally { createUrl.mockRestore(); revokeUrl.mockRestore(); play.mockRestore(); vi.unstubAllGlobals(); }
  });

});
