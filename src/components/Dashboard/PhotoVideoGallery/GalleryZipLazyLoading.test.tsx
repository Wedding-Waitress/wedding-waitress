import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { GalleryDownloadsCard } from './GalleryDownloadsCard';
import { GuestbookDownloadAllButton } from './GuestbookDownloadAllButton';
import { PhotoBoothDownloadAllButton } from './PhotoBoothDownloadAllButton';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';

const jsZipModuleLoaded = vi.fn();
const jsZipConstructed = vi.fn();

vi.mock('jszip', () => {
  jsZipModuleLoaded();
  return {
    default: class MockJSZip {
      files: Record<string, Blob> = {};

      constructor() {
        jsZipConstructed();
      }

      file(name: string, blob: Blob) {
        this.files[name] = blob;
      }

      async generateAsync() {
        return new Blob(['zip']);
      }
    },
  };
});

const item: GalleryItem = {
  id: 'media-1',
  kind: 'photo',
  mime_type: 'image/jpeg',
  byte_size: 1024,
  duration_sec: null,
  storage_path: 'media-1.jpg',
  uploader_name: 'Guest',
  caption: null,
  guestbook_message: null,
  uploaded_at: '2026-08-13T00:00:00Z',
  moderation_status: 'approved',
  album: null,
  is_guestbook: false,
  is_photo_booth: true,
  is_photo_booth_strip: false,
  source_category: 'photo_booth',
  signed_url: 'https://example.com/media-1.jpg',
};

const videoItem: GalleryItem = {
  ...item,
  id: 'media-2',
  kind: 'video',
  mime_type: 'video/mp4',
  storage_path: 'media-2.mp4',
  signed_url: 'https://example.com/media-2.mp4',
};

describe('gallery ZIP controls', () => {
  it('loads JSZip only after a download action, not while the three route-level controls render', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['media']),
    });
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:test-download'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    expect(jsZipModuleLoaded).not.toHaveBeenCalled();

    render(
      <>
        <div data-testid="gallery-downloads">
          <GalleryDownloadsCard items={[item, videoItem]} eventName="Test Event" appearance="espresso-glass" />
        </div>
        <div data-testid="guestbook-downloads">
          <GuestbookDownloadAllButton items={[item]} eventName="Test Event" />
        </div>
        <div data-testid="photo-booth-downloads">
          <PhotoBoothDownloadAllButton items={[item]} eventName="Test Event" />
        </div>
      </>,
    );

    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    expect(jsZipModuleLoaded).not.toHaveBeenCalled();

    const galleryDownloads = within(screen.getByTestId('gallery-downloads'));
    const galleryButtons = [
      galleryDownloads.getByRole('button', { name: /download all/i }),
      galleryDownloads.getByRole('button', { name: /download approved only/i }),
      galleryDownloads.getByRole('button', { name: /download photos only/i }),
      galleryDownloads.getByRole('button', { name: /download videos only/i }),
    ];

    for (let index = 0; index < galleryButtons.length; index += 1) {
      expect(galleryButtons[index]).toBeEnabled();
      fireEvent.click(galleryButtons[index]);
      await waitFor(() => expect(jsZipConstructed).toHaveBeenCalledTimes(index + 1));
      await waitFor(() => expect(galleryButtons[index]).toBeEnabled());
    }

    fireEvent.click(within(screen.getByTestId('guestbook-downloads')).getByRole('button', { name: /download all guestbook messages/i }));
    await waitFor(() => expect(jsZipConstructed).toHaveBeenCalledTimes(5));

    fireEvent.click(within(screen.getByTestId('photo-booth-downloads')).getByRole('button', { name: /download all photo booth/i }));
    await waitFor(() => expect(jsZipConstructed).toHaveBeenCalledTimes(6));

    // The dynamic module evaluates once, then every download scope reuses the cached module.
    expect(jsZipModuleLoaded).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });
});
