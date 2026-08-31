import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { GalleryItem, GalleryMeta } from '@/hooks/useEventMediaGallery';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';
import { GallerySlideshowFeaturePage } from './GallerySlideshowFeaturePage';

const mocks = vi.hoisted(() => ({
  events: vi.fn(), selectedEvent: vi.fn(), gallery: vi.fn(), getSession: vi.fn(), qrToDataUrl: vi.fn(),
}));

vi.mock('@/hooks/useEvents', () => ({ useEvents: mocks.events }));
vi.mock('@/hooks/useSelectedEvent', () => ({ useSelectedEvent: mocks.selectedEvent }));
vi.mock('@/hooks/usePhotoVideoFeatureWorkspace', () => ({
  usePhotoVideoFeatureWorkspace: () => ({ ...mocks.gallery(), ...mocks.selectedEvent(), selectionStatus: 'selected' }),
}));
vi.mock('@/hooks/useEventMediaGallery', () => ({ useEventMediaGallery: mocks.gallery }));
vi.mock('@/components/SEO/SeoHead', () => ({ SeoHead: () => null }));
vi.mock('qrcode', () => ({ default: { toDataURL: mocks.qrToDataUrl } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

const event = { id: 'event-1', name: "Jason & Linda's Wedding", date: '2026-12-20' };
const meta = {
  gallery_id: 'gallery-1', primary_token: 'public-token', gallery_title: event.name,
  slideshow_enabled: true, slideshow_include_photos: true, slideshow_include_videos: true,
  slideshow_albums: ['Dance Floor'], slideshow_order: 'newest', slideshow_slide_duration_sec: 5,
  slideshow_transition: 'fade', slideshow_show_caption: true, slideshow_loop: true,
} as unknown as GalleryMeta;
const legacyItem = {
  id: 'legacy-1', kind: 'photo', mime_type: 'image/jpeg', byte_size: 1234, duration_sec: null,
  storage_path: 'event/photo.jpg', uploader_name: 'Fiona', caption: 'First dance', guestbook_message: null,
  uploaded_at: '2026-08-04T10:00:00Z', moderation_status: 'approved', album: 'Dance Floor',
  is_guestbook: false, is_photo_booth: false, is_photo_booth_strip: false,
  source_category: 'guest_upload', signed_url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
} as GalleryItem;

describe('Live Slideshow premium appearance', () => {
  const updateSlideshowSettings = vi.fn(async () => undefined);

  beforeEach(() => {
    mocks.events.mockReturnValue({ events: [event], loading: false });
    mocks.selectedEvent.mockReturnValue({ selectedEventId: event.id, selectedEvent: event });
    mocks.gallery.mockReturnValue({
      meta, items: [legacyItem], loading: false, error: null,
      setSlideshowEnabled: vi.fn(async () => undefined), updateSlideshowSettings,
    });
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    mocks.qrToDataUrl.mockResolvedValue('data:image/png;base64,qr');
    HTMLElement.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => undefined) } });
  });

  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

  it('applies the route-scoped espresso treatment while protecting the QR and preview stage', async () => {
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<MemoryRouter><GallerySlideshowFeaturePage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Live Slideshow', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Photo & Video Sharing' })).toHaveClass(managementStyles.glassAction);
    const launchAction = screen.getAllByRole('button', { name: 'Launch Live Slideshow' })[0];
    expect(launchAction).toHaveClass(managementStyles.glassAction);
    expect(launchAction).toHaveClass(managementStyles.workspaceHeaderAction);
    expect(launchAction).toBeEnabled();
    expect(screen.getByText('Selected event')).toHaveClass(managementStyles.selectedEventLabel);
    expect(screen.getByText(event.name)).toHaveClass(managementStyles.selectedEventName);
    expect(screen.getByRole('switch', { name: 'Live Slideshow enabled' })).toHaveClass(managementStyles.galleryViewToggle);

    for (const heading of ['How the Live Slideshow Works', 'Live Slideshow Access', 'Slideshow Settings', 'Slideshow Preview']) {
      expect(screen.getByRole('heading', { name: heading }).closest('[data-appearance="espresso-glass"]')).toHaveClass(managementStyles.glassCard);
    }
    expect(screen.getByText('Media types').parentElement).toHaveClass(managementStyles.galleryViewInsetPanel);
    expect(screen.getByText('Playback').parentElement).toHaveClass(managementStyles.galleryViewInsetPanel);
    expect(screen.getByText('Albums').parentElement).toHaveClass(managementStyles.galleryViewInsetPanel);

    const qr = await screen.findByRole('img', { name: 'Live Slideshow QR code' });
    expect(mocks.qrToDataUrl).toHaveBeenCalledWith(expect.stringContaining('public-token'), {
      width: 512, margin: 2, color: { dark: '#1D1D1F', light: '#FFFFFF' },
    });
    expect(qr).toHaveClass('w-40', 'h-40', 'sm:w-44', 'sm:h-44');
    expect(qr).not.toHaveAttribute('style');
    expect(qr.parentElement).toHaveClass(managementStyles.galleryViewQrFrame);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('public-token')));
    fireEvent.click(screen.getAllByRole('button', { name: 'Launch Live Slideshow' })[1]);
    expect(open).toHaveBeenCalledWith(expect.stringContaining('public-token'), '_blank', 'noopener,noreferrer');
    fireEvent.click(screen.getByRole('button', { name: 'Download QR code' }));
    expect(anchorClick).toHaveBeenCalled();

    expect(screen.getByText('Shared by Fiona').closest('.aspect-video')).toHaveClass('bg-black');
    const previewCard = screen.getByRole('heading', { name: 'Slideshow Preview' }).closest('[data-appearance="espresso-glass"]')!;
    const previewHeader = previewCard.querySelector('[data-slideshow-preview-header]')!;
    const previewControls = previewCard.querySelector('[data-slideshow-preview-controls]')!;
    const previewStage = previewCard.querySelector('[data-slideshow-preview-stage]')!;
    expect(previewHeader).toContainElement(screen.getByRole('heading', { name: 'Slideshow Preview' }));
    expect(previewHeader).toContainElement(screen.getByText('Exactly what your guests will see on the big screen.'));
    expect(previewHeader).toHaveClass('flex-wrap', 'justify-between');
    expect(Array.from(previewControls.querySelectorAll('button')).map((button) => button.textContent?.trim())).toEqual([
      'Previous',
      'Pause',
      'Next',
      'Restart',
      'Fullscreen',
    ]);
    expect(previewHeader.nextElementSibling).toBe(previewControls);
    expect(previewControls.nextElementSibling).toBe(previewStage);
    expect(previewStage.nextElementSibling).toBeNull();
    for (const label of ['Previous', 'Pause', 'Next', 'Restart', 'Fullscreen']) {
      expect(screen.getByRole('button', { name: label })).toHaveClass(managementStyles.galleryControl);
    }
    expect(screen.getByRole('button', { name: 'Save Settings' })).toHaveClass(managementStyles.galleryViewPrimaryAction);
  });

  it('uses the requested two-row responsive settings layout and route-only width', async () => {
    const { container } = render(<MemoryRouter><GallerySlideshowFeaturePage /></MemoryRouter>);
    const settingsHeading = await screen.findByRole('heading', { name: 'Slideshow Settings' });
    const settingsPanel = settingsHeading.closest('[data-appearance="espresso-glass"]');
    const primaryGrid = settingsPanel?.querySelector('[data-slideshow-primary-grid]');
    const secondaryGrid = settingsPanel?.querySelector('[data-slideshow-secondary-grid]');

    expect(container.querySelector('main')).toHaveClass('max-w-[1500px]');
    expect(primaryGrid).toHaveClass(
      'grid-cols-1',
      'md:grid-cols-2',
      'gap-5',
      'min-[1440px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.78fr)]',
    );
    expect(Array.from(primaryGrid?.children ?? []).map((card) => card.getAttribute('data-slideshow-workspace-card'))).toEqual([
      'steps',
      'access',
      'playback',
    ]);
    expect(secondaryGrid).toHaveClass(
      'grid-cols-1',
      'md:grid-cols-2',
      'gap-5',
      'min-[1440px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.78fr)]',
    );
    expect(primaryGrid?.className).toBe(secondaryGrid?.className);
    expect(Array.from(secondaryGrid?.children ?? []).map((card) => card.getAttribute('data-slideshow-workspace-card'))).toEqual([
      'albums',
      'media-types',
      'save-settings',
    ]);

    const accessLayout = settingsPanel?.querySelector('[data-slideshow-access-layout]');
    expect(accessLayout).toHaveClass('grid-cols-1', 'min-[1440px]:grid-cols-[180px_minmax(0,1fr)]');
    const qr = await screen.findByRole('img', { name: 'Live Slideshow QR code' });
    expect(qr).toHaveClass('w-40', 'h-40', 'sm:w-44', 'sm:h-44');

    const playback = settingsPanel?.querySelector('[data-slideshow-workspace-card="playback"]') as HTMLElement;
    const playbackControls = within(playback).getAllByRole('combobox');
    expect(playbackControls).toHaveLength(3);
    const playbackText = playback.textContent ?? '';
    expect(playbackText.indexOf('Display order')).toBeLessThan(playbackText.indexOf('Slide duration'));
    expect(playbackText.indexOf('Slide duration')).toBeLessThan(playbackText.indexOf('Transition'));
    expect(playbackText.indexOf('Transition')).toBeLessThan(playbackText.indexOf('Show guest name / caption'));
    expect(playbackText.indexOf('Show guest name / caption')).toBeLessThan(playbackText.indexOf('Loop continuously'));

    const albums = screen.getByText('Albums').parentElement;
    expect(settingsPanel?.contains(albums)).toBe(true);
    expect(settingsPanel?.compareDocumentPosition(albums as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Slideshow Preview' }).closest('[data-appearance="espresso-glass"]')).not.toBe(settingsPanel);
  });

  it('shows only the shared album options, normalises legacy selections, and preserves save behaviour', async () => {
    render(<MemoryRouter><GallerySlideshowFeaturePage /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Slideshow Settings' });

    const albumsPanel = screen.getByText('Albums').parentElement!;
    for (const label of ['All Albums', 'Ceremony', 'Reception', 'Other']) {
      expect(within(albumsPanel).getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }
    for (const retired of ['Dance Floor', 'Speeches', 'Bridal Party']) {
      expect(within(albumsPanel).queryByRole('button', { name: retired })).not.toBeInTheDocument();
    }
    expect(within(albumsPanel).getByRole('button', { name: /Other/ })).toHaveClass(managementStyles.galleryControlActive);

    fireEvent.click(within(albumsPanel).getByRole('button', { name: /Reception/ }));
    const save = screen.getByRole('button', { name: 'Save Settings' });
    expect(save).not.toBeDisabled();
    fireEvent.click(save);
    await waitFor(() => expect(updateSlideshowSettings).toHaveBeenCalledWith(expect.objectContaining({ albums: ['Other', 'Reception'] })));

    const order = screen.getAllByRole('combobox')[0];
    expect(order).toHaveClass(managementStyles.galleryControl);
    fireEvent.keyDown(order, { key: 'ArrowDown' });
    const menu = await screen.findByRole('listbox');
    expect(menu).toHaveClass(managementStyles.gallerySelectContent);
    expect(within(menu).getByRole('option', { name: 'Newest First' })).toHaveClass(managementStyles.gallerySelectItem);
  });

  it('keeps interaction styling scoped and reduced-motion aware', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css'), 'utf8');
    expect(css).toContain('.slideshowWorkspace');
    expect(css).toContain('@media (hover: hover) and (pointer: fine)');
    expect(css).toContain('@media (hover: none), (pointer: coarse)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
