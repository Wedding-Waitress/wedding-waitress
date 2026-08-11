import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { GalleryGrid } from './GalleryGrid';
import { PhotoBoothDownloadAllButton } from './PhotoBoothDownloadAllButton';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';

const sampleItems: GalleryItem[] = [
  {
    id: 'item-1',
    kind: 'photo',
    mime_type: 'image/jpeg',
    byte_size: 1024,
    duration_sec: null,
    storage_path: 'photo1.jpg',
    uploader_name: 'Jane Doe',
    caption: 'Booth capture',
    guestbook_message: null,
    uploaded_at: '2026-08-11T12:00:00Z',
    moderation_status: 'approved',
    album: null,
    is_guestbook: false,
    is_photo_booth: true,
    is_photo_booth_strip: false,
    source_category: 'photo_booth',
    photo_booth_seq: 1,
    signed_url: 'https://example.com/photo1.jpg',
  },
  {
    id: 'item-2',
    kind: 'photo',
    mime_type: 'image/jpeg',
    byte_size: 2048,
    duration_sec: null,
    storage_path: 'strip1.jpg',
    uploader_name: 'Alex Guest',
    caption: 'Strip capture',
    guestbook_message: null,
    uploaded_at: '2026-08-11T12:05:00Z',
    moderation_status: 'approved',
    album: null,
    is_guestbook: false,
    is_photo_booth: true,
    is_photo_booth_strip: true,
    source_category: 'photo_booth',
    photo_booth_seq: 1,
    signed_url: 'https://example.com/strip1.jpg',
  },
];

const noopAsync = vi.fn(async () => undefined);

describe('PhotoBoothDownloadAllButton', () => {
  it('renders a compact label with an accessible label and count', () => {
    render(
      <PhotoBoothDownloadAllButton
        items={sampleItems}
        eventName="Test Event"
        galleryTitle="Wedding Gallery"
      />,
    );

    const button = screen.getByRole('button', { name: /download all/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Download all Photo Booth photos and videos');
    expect(screen.getByText('Download All')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

describe('GalleryGrid toolbar and badge rendering', () => {
  it('renders the toolbar controls in the expected photo booth order and hides booth/strip badges', () => {
    render(
      <GalleryGrid
        items={sampleItems}
        onDelete={noopAsync}
        onSetModeration={noopAsync}
        onSetAlbum={noopAsync}
        onBulkSetAlbum={async () => 0}
        onDeleteMany={async () => ({ deletedIds: [], failedIds: [], storageFailedPaths: [] })}
        boothSetOrder
        hideAlbumFeature
        eventName="Test Event"
        title="Digital Photo Booth Captures"
        description="Review, organise, approve, hide and download photos taken in your Digital Photo Booth."
        toolbarRight={
          <PhotoBoothDownloadAllButton
            items={sampleItems}
            eventName="Test Event"
            galleryTitle="Wedding Gallery"
            className="!h-9"
          />
        }
      />,
    );

    const toolbar = screen.getByTestId('gallery-toolbar');
    expect(toolbar).toBeInTheDocument();

    const controls = Array.from(toolbar.querySelectorAll('button, input'))
      .map(el => el.textContent?.trim() || el.getAttribute('placeholder') || '');

    expect(controls).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Search uploader, caption or message…'),
        expect.stringContaining('All Statuses'),
        expect.stringContaining('Approved'),
        expect.stringContaining('Hidden'),
        expect.stringContaining('All media'),
        expect.stringContaining('Newest first'),
        expect.stringContaining('Select'),
        expect.stringContaining('Download All'),
      ]),
    );

    const searchIndex = controls.findIndex(text => text.includes('Search uploader'));
    const statusIndex = controls.findIndex(text => text.includes('All Statuses'));
    const approvedIndex = controls.findIndex(text => text.includes('Approved'));
    const hiddenIndex = controls.findIndex(text => text.includes('Hidden'));
    const mediaIndex = controls.findIndex(text => text.includes('All media'));
    const sortIndex = controls.findIndex(text => text.includes('Newest first'));
    const selectIndex = controls.findIndex(text => text.includes('Select'));
    const downloadIndex = controls.findIndex(text => text.includes('Download All'));

    expect(searchIndex).toBeGreaterThan(-1);
    expect(searchIndex).toBeLessThan(statusIndex);
    expect(statusIndex).toBeLessThan(approvedIndex);
    expect(approvedIndex).toBeLessThan(hiddenIndex);
    expect(hiddenIndex).toBeLessThan(mediaIndex);
    expect(mediaIndex).toBeLessThan(sortIndex);
    expect(sortIndex).toBeLessThan(selectIndex);
    expect(selectIndex).toBeLessThan(downloadIndex);

    expect(screen.queryByText('Booth')).toBeNull();
    expect(screen.queryByText('Strip')).toBeNull();
  });
});
