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
    expect(screen.getByText('Leave a written, audio or video message—or any combination.')).toHaveClass(
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
});
