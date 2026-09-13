import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GalleryLimitsCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryLimitsCard';
import { validateFile } from './mediaValidation';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
const meta = { max_photos: 5000, max_videos: 100, max_total_bytes: 10 * 1024 ** 3,
  max_photo_bytes: 25 * 1024 ** 2, max_video_bytes: 600 * 1024 ** 2,
  max_video_duration_sec: 300, allowed_photo_mimes: ['image/jpeg'], allowed_video_mimes: ['video/mp4'] };
afterEach(() => vi.restoreAllMocks());

describe('approved event media allowances', () => {
  it('saves approved limits and discloses the shared storage cap', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<GalleryLimitsCard meta={meta as any} onUpdate={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText(/Storage may fill before these counts/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ max_photos: 5000, max_videos: 100, max_video_duration_sec: 300, max_total_bytes: 10 * 1024 ** 3 }));
  });
  it.each([['photos', 5001], ['videos', 101], ['totalGb', 11], ['videoSec', 301]])('rejects raising %s above its approved maximum', (field, value) => {
    const save = vi.fn();
    render(<GalleryLimitsCard meta={meta as any} onUpdate={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const index = { photos: 0, videos: 1, totalGb: 2, videoSec: 5 }[field];
    fireEvent.change(screen.getAllByRole('spinbutton')[index!], { target: { value } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });
  it.each([[300, true], [301, false]])('validates a %s-second video against the new duration', async (duration, accepted) => {
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const element = create(tag);
      if (tag === 'video') {
        Object.defineProperty(element, 'duration', { value: duration });
        queueMicrotask(() => element.dispatchEvent(new Event('loadedmetadata')));
      }
      return element;
    }) as any);
    const result = await validateFile(new File(['video'], 'clip.mp4', { type: 'video/mp4' }), meta);
    expect(result.ok).toBe(accepted);
    if (!accepted) expect(result.reason).toBe('video_too_long');
  });
  it('changes database defaults and enforces caps without deleting media or raising storage', () => {
    const sql = readFileSync('supabase/migrations/20260913065740_event_media_upload_allowance_expansion.sql', 'utf8');
    expect(sql).toContain('max_photos SET DEFAULT 5000');
    expect(sql).toContain('max_videos SET DEFAULT 100');
    expect(sql).toContain('max_video_duration_sec SET DEFAULT 300');
    expect(sql).toContain('max_total_bytes BETWEEN 1 AND 10737418240');
    expect(sql).not.toMatch(/DELETE FROM|DROP TABLE|storage\.objects/i);
  });
});
