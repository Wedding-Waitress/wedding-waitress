import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sign: vi.fn(),
  remove: vi.fn(),
  upload: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/lib/djmcPronunciationStorage', () => ({
  createDJMCPronunciationSignedUrl: mocks.sign,
  deleteDJMCPronunciation: mocks.remove,
  uploadDJMCPronunciation: mocks.upload,
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

import { DJMCPronunciationRecorder } from './DJMCPronunciationRecorder';

const eventId = '20000000-0000-4000-8000-000000000002';
const itemId = '30000000-0000-4000-8000-000000000003';
const path = `10000000-0000-4000-8000-000000000001/${eventId}/${itemId}/40000000-0000-4000-8000-000000000004.webm`;

describe('DJMCPronunciationRecorder secure lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sign.mockResolvedValue('https://signed.example/recording');
    mocks.remove.mockResolvedValue(undefined);
  });

  it('removes the storage object before clearing the saved database path', async () => {
    const onChange = vi.fn();
    render(<DJMCPronunciationRecorder audioPath={path} eventId={eventId} itemId={itemId} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete recording' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(path, { eventId, itemId, shareToken: undefined }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(onChange.mock.invocationCallOrder[0]);
  });

  it('keeps the database path when storage deletion fails', async () => {
    const onChange = vi.fn();
    mocks.remove.mockRejectedValue(new Error('Storage unavailable'));
    render(<DJMCPronunciationRecorder audioPath={path} eventId={eventId} itemId={itemId} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete recording' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete failed' })));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables public view-only recording controls', () => {
    render(
      <DJMCPronunciationRecorder
        audioPath={path}
        eventId={eventId}
        itemId={itemId}
        shareToken="share-token"
        onChange={vi.fn()}
        disabled
      />,
    );
    expect(screen.getByRole('button', { name: 'Play recording' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete recording' })).toBeDisabled();
  });

  it('preserves organiser playback for an unmigrated legacy recording without exposing it to share views', async () => {
    const legacyUrl = 'https://project.supabase.co/storage/v1/object/public/venue-logos/pronunciations/pronunciation_1.webm';
    const { rerender } = render(
      <DJMCPronunciationRecorder audioPath={null} legacyAudioUrl={legacyUrl} eventId={eventId} itemId={itemId} onChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Play recording' })).toBeInTheDocument();
    expect(mocks.sign).not.toHaveBeenCalled();

    rerender(
      <DJMCPronunciationRecorder audioPath={null} legacyAudioUrl={legacyUrl} eventId={eventId} itemId={itemId} shareToken="share-token" onChange={vi.fn()} />,
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Play recording' })).not.toBeInTheDocument());
  });
});
