import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { GalleryGrid } from './GalleryGrid';
import { PhotoBoothDownloadAllButton } from './PhotoBoothDownloadAllButton';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';
import managementStyles from './photoVideoSharingManagement.module.css';

const sampleItems: GalleryItem[] = [
  {
    id: 'item-1',
    kind: 'photo',
    mime_type: 'image/jpeg',
    byte_size: 1024,
    duration_sec: null,
    storage_path: 'photo1.jpg',
    uploader_name: 'Jane Doe',
    caption: null,
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
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', { configurable: true, value: () => false });
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: () => undefined });
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', { configurable: true, value: () => undefined });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: () => undefined });
  });

  it('renders the toolbar controls in the expected photo booth order and hides booth/strip badges', () => {
    const { container } = render(
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
    expect(container.querySelector(`.${managementStyles.galleryPanel}`)).toBeNull();
    expect(container.querySelector(`.${managementStyles.galleryControl}`)).toBeNull();
    expect(container.querySelector(`.${managementStyles.galleryMediaTile}`)).toBeNull();
  });

  it('keeps filtering, album selection, tile selection and moderation working in the scoped gallery appearance', async () => {
    const onSetModeration = vi.fn(async () => undefined);
    const { container } = render(
      <GalleryGrid
        items={sampleItems}
        onDelete={noopAsync}
        onSetModeration={onSetModeration}
        onSetAlbum={noopAsync}
        onBulkSetAlbum={async () => 0}
        onDeleteMany={async () => ({ deletedIds: [], failedIds: [], storageFailedPaths: [] })}
        title="Shared Photos & Videos"
        description="Review, organise, approve, hide and download guest photos and videos."
        dark
        appearance="espresso-glass"
        hideCardActions
      />,
    );

    const panel = screen.getByRole('heading', { name: 'Shared Photos & Videos (2)' }).closest('[data-appearance="espresso-glass"]');
    expect(panel).toHaveClass(managementStyles.galleryPanel);

    const grid = container.querySelector('.grid.grid-cols-2');
    expect(grid).toHaveClass('sm:grid-cols-3', 'md:grid-cols-4', 'lg:grid-cols-5', 'xl:grid-cols-6');
    const tiles = container.querySelectorAll(`.${managementStyles.galleryMediaTile}`);
    expect(tiles).toHaveLength(2);
    tiles.forEach(tile => expect(tile.querySelector('.aspect-square')).toBeInTheDocument());

    const search = screen.getByPlaceholderText(/Search uploader, caption or message/);
    fireEvent.change(search, { target: { value: 'Alex' } });
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Alex Guest')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: '' } });
    const albumFilter = screen.getByRole('combobox', { name: 'Filter by album' });
    fireEvent.keyDown(albumFilter, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByRole('option', { name: 'Other' }));
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Alex Guest')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    const selectionButtons = screen.getAllByRole('button', { name: 'Select' });
    expect(selectionButtons).toHaveLength(2);
    fireEvent.click(selectionButtons[0]);

    const bulkBar = screen.getByText('1 selected').parentElement?.parentElement;
    expect(bulkBar).toBeInTheDocument();
    fireEvent.click(within(bulkBar as HTMLElement).getByRole('button', { name: 'Hide' }));
    await waitFor(() => expect(onSetModeration).toHaveBeenCalledWith('item-2', 'hidden'));
  });

  it('keeps the portal-rendered media and sort menus in the scoped smoked-glass treatment', async () => {
    render(
      <GalleryGrid
        items={sampleItems}
        onDelete={noopAsync}
        onSetModeration={noopAsync}
        onSetAlbum={noopAsync}
        onBulkSetAlbum={async () => 0}
        dark
        appearance="espresso-glass"
      />,
    );

    const mediaTrigger = screen.getByRole('combobox', { name: 'Filter by media type' });
    const albumTrigger = screen.getByRole('combobox', { name: 'Filter by album' });
    const sortTrigger = screen.getByRole('combobox', { name: 'Sort media' });
    fireEvent.keyDown(mediaTrigger, { key: 'ArrowDown' });
    const mediaMenu = await screen.findByRole('listbox');
    expect(mediaMenu).toHaveClass(managementStyles.gallerySelectContent);
    ['All Media', 'Photos', 'Videos', 'Photo Booth'].forEach(label => {
      expect(within(mediaMenu).getByRole('option', { name: label })).toHaveClass(managementStyles.gallerySelectItem);
    });
    fireEvent.keyDown(mediaTrigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.keyDown(sortTrigger, { key: 'ArrowDown' });
    const sortMenu = await screen.findByRole('listbox');
    expect(sortMenu).toHaveClass(managementStyles.gallerySelectContent);
    ['Newest first', 'Oldest first'].forEach(label => {
      expect(within(sortMenu).getByRole('option', { name: label })).toHaveClass(managementStyles.gallerySelectItem);
    });
    fireEvent.keyDown(sortTrigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.keyDown(albumTrigger, { key: 'ArrowDown' });
    const albumMenu = await screen.findByRole('listbox');
    ['All Albums', 'Ceremony', 'Reception', 'Other'].forEach(label => {
      expect(within(albumMenu).getByRole('option', { name: label })).toHaveClass(managementStyles.gallerySelectItem);
    });
    ['Dance Floor', 'Speeches', 'Bridal Party'].forEach(label => {
      expect(within(albumMenu).queryByRole('option', { name: label })).not.toBeInTheDocument();
    });
  });

  it('filters Photo Booth media by its authoritative source and includes a complete strip set', async () => {
    const boothSet: GalleryItem[] = [
      ...Array.from({ length: 4 }, (_, index) => ({
        ...sampleItems[0],
        id: `capture-${index + 1}`,
        uploader_name: `Capture ${index + 1}`,
        photo_booth_seq: index + 1,
      })),
      { ...sampleItems[1], id: 'completed-strip', uploader_name: 'Completed Strip', photo_booth_seq: 5 },
      {
        ...sampleItems[0],
        id: 'ordinary-photo',
        storage_path: 'looks-like-a-photo-booth-strip.jpg',
        uploader_name: 'Ordinary Guest Upload',
        source_category: 'guest_upload',
        is_photo_booth: true,
        is_photo_booth_strip: true,
      },
    ];

    render(
      <GalleryGrid
        items={boothSet}
        onDelete={noopAsync}
        onSetModeration={noopAsync}
        onSetAlbum={noopAsync}
        onBulkSetAlbum={async () => 0}
        dark
        appearance="espresso-glass"
      />,
    );

    const mediaTrigger = screen.getByRole('combobox', { name: 'Filter by media type' });
    fireEvent.keyDown(mediaTrigger, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByRole('option', { name: 'Photo Booth' }));

    for (let index = 1; index <= 4; index += 1) {
      expect(screen.getByText(`Capture ${index}`)).toBeInTheDocument();
    }
    expect(screen.getByText('Completed Strip')).toBeInTheDocument();
    expect(screen.queryByText('Ordinary Guest Upload')).not.toBeInTheDocument();
  });

  it('applies every scoped media and album filter choice', async () => {
    const filterItems: GalleryItem[] = [
      {
        ...sampleItems[0],
        id: 'ceremony-photo',
        uploader_name: 'Ceremony Photo',
        album: 'Ceremony',
        source_category: 'guest_upload',
        is_photo_booth: false,
      },
      {
        ...sampleItems[0],
        id: 'reception-video',
        kind: 'video',
        mime_type: 'video/mp4',
        uploader_name: 'Reception Video',
        album: 'Reception',
        source_category: 'guest_upload',
        is_photo_booth: false,
      },
      {
        ...sampleItems[1],
        id: 'booth-strip',
        uploader_name: 'Booth Strip',
        album: 'Dance Floor',
      },
    ];

    render(
      <GalleryGrid
        items={filterItems}
        onDelete={noopAsync}
        onSetModeration={noopAsync}
        onSetAlbum={noopAsync}
        onBulkSetAlbum={async () => 0}
        dark
        appearance="espresso-glass"
      />,
    );

    const choose = async (label: string, triggerName: string) => {
      const trigger = screen.getByRole('combobox', { name: triggerName });
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      fireEvent.click(await screen.findByRole('option', { name: label }));
    };

    await choose('Photos', 'Filter by media type');
    expect(screen.getByText('Ceremony Photo')).toBeInTheDocument();
    expect(screen.getByText('Booth Strip')).toBeInTheDocument();
    expect(screen.queryByText('Reception Video')).not.toBeInTheDocument();

    await choose('Videos', 'Filter by media type');
    expect(screen.getByText('Reception Video')).toBeInTheDocument();
    expect(screen.queryByText('Ceremony Photo')).not.toBeInTheDocument();
    expect(screen.queryByText('Booth Strip')).not.toBeInTheDocument();

    await choose('Photo Booth', 'Filter by media type');
    expect(screen.getByText('Booth Strip')).toBeInTheDocument();
    expect(screen.queryByText('Ceremony Photo')).not.toBeInTheDocument();
    expect(screen.queryByText('Reception Video')).not.toBeInTheDocument();

    await choose('All Media', 'Filter by media type');
    await choose('Ceremony', 'Filter by album');
    expect(screen.getByText('Ceremony Photo')).toBeInTheDocument();
    expect(screen.queryByText('Reception Video')).not.toBeInTheDocument();
    expect(screen.queryByText('Booth Strip')).not.toBeInTheDocument();

    await choose('Reception', 'Filter by album');
    expect(screen.getByText('Reception Video')).toBeInTheDocument();
    expect(screen.queryByText('Ceremony Photo')).not.toBeInTheDocument();

    await choose('Other', 'Filter by album');
    expect(screen.getByText('Booth Strip')).toBeInTheDocument();
    expect(screen.queryByText('Reception Video')).not.toBeInTheDocument();

    await choose('All Albums', 'Filter by album');
    expect(screen.getByText('Ceremony Photo')).toBeInTheDocument();
    expect(screen.getByText('Reception Video')).toBeInTheDocument();
    expect(screen.getByText('Booth Strip')).toBeInTheDocument();
  });

  it('normalises removed and missing albums to Other, saves per-tile changes, and omits empty footer messages', async () => {
    const onSetAlbum = vi.fn(async () => undefined);
    const legacyItems: GalleryItem[] = [
      { ...sampleItems[0], album: 'Dance Floor', caption: null, guestbook_message: null },
      { ...sampleItems[1], album: null, caption: 'A genuine caption', guestbook_message: 'A genuine message' },
    ];
    const { container } = render(
      <GalleryGrid
        items={legacyItems}
        onDelete={noopAsync}
        onSetModeration={noopAsync}
        onSetAlbum={onSetAlbum}
        onBulkSetAlbum={async () => 0}
        dark
        appearance="espresso-glass"
      />,
    );

    const albumFilter = screen.getByRole('combobox', { name: 'Filter by album' });
    fireEvent.keyDown(albumFilter, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByRole('option', { name: 'Other' }));
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Alex Guest')).toBeInTheDocument();

    const janeSelect = screen.getByRole('combobox', { name: 'Change album for Jane Doe' });
    expect(janeSelect).toHaveTextContent('Other');
    fireEvent.keyDown(janeSelect, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByRole('option', { name: 'Reception' }));
    await waitFor(() => expect(onSetAlbum).toHaveBeenCalledWith('item-1', 'Reception'));

    const footers = container.querySelectorAll(`.${managementStyles.galleryMediaFooter}`);
    expect(footers).toHaveLength(2);
    const janeFooter = screen.getByText('Jane Doe').closest(`.${managementStyles.galleryMediaFooter}`);
    const alexFooter = screen.getByText('Alex Guest').closest(`.${managementStyles.galleryMediaFooter}`);
    expect(janeFooter?.querySelector(`.${managementStyles.galleryMediaFooterMessage}`)).toBeNull();
    expect(within(alexFooter as HTMLElement).getByText('A genuine caption')).toBeInTheDocument();
    expect(within(alexFooter as HTMLElement).getByText('A genuine message')).toBeInTheDocument();
  });

  it('keeps removed album labels out of the scoped management lightbox', async () => {
    render(
      <GalleryGrid
        items={[{ ...sampleItems[0], album: 'Bridal Party' }]}
        onDelete={noopAsync}
        onSetModeration={noopAsync}
        onSetAlbum={noopAsync}
        onBulkSetAlbum={async () => 0}
        dark
        appearance="espresso-glass"
      />,
    );

    fireEvent.click(screen.getByRole('img'));
    fireEvent.click(await screen.findByRole('button', { name: 'Info' }));
    expect(screen.getAllByText('Other').length).toBeGreaterThan(0);
    expect(screen.queryByText('Bridal Party')).not.toBeInTheDocument();
  });

  it('keeps the default gallery album row, media choices and white meta strip unchanged', async () => {
    const { container } = render(
      <GalleryGrid
        items={sampleItems}
        onDelete={noopAsync}
        onSetModeration={noopAsync}
        onSetAlbum={noopAsync}
        onBulkSetAlbum={async () => 0}
      />,
    );

    expect(screen.getByRole('button', { name: 'All Albums' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dance Floor' })).toBeInTheDocument();
    expect(container.querySelector(`.${managementStyles.galleryMediaFooter}`)).toBeNull();
    expect(screen.getByText('Jane Doe').closest('.px-1\\.5')).toHaveClass('border-t', 'border-border');

    const mediaTrigger = screen.getByRole('combobox', { name: 'Filter by media type' });
    fireEvent.keyDown(mediaTrigger, { key: 'ArrowDown' });
    const menu = await screen.findByRole('listbox');
    expect(within(menu).queryByRole('option', { name: 'Photo Booth' })).not.toBeInTheDocument();
  });
});
