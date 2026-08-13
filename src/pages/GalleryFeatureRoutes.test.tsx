import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppErrorBoundary } from '@/components/core/AppErrorBoundary';
import { GalleryGuestFeaturesCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryGuestFeaturesCard';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';
import { GalleryUploadFeaturePage } from './GalleryUploadFeaturePage';
import { GalleryTextGuestbookFeaturePage } from './GalleryTextGuestbookFeaturePage';
import { GalleryPhotoBoothFeaturePage } from './GalleryPhotoBoothFeaturePage';

const hooks = vi.hoisted(() => ({
  events: vi.fn(),
  selected: vi.fn(),
  gallery: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@/hooks/useEvents', () => ({ useEvents: hooks.events }));
vi.mock('@/hooks/useSelectedEvent', () => ({ useSelectedEvent: hooks.selected }));
vi.mock('@/hooks/useEventMediaGallery', () => ({
  useEventMediaGallery: hooks.gallery,
  GALLERY_ALBUMS: ['Ceremony', 'Reception', 'Dance Floor', 'Speeches', 'Bridal Party', 'Other'],
}));
vi.mock('@/components/SEO/SeoHead', () => ({ SeoHead: () => null }));
vi.mock('@/components/Dashboard/PhotoVideoGallery/PhotoBoothTemplatePreview', () => ({
  PhotoBoothTemplatePreview: () => <div data-testid="photo-booth-preview" />,
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: hooks.getSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}));

const event = { id: 'event-1', name: "Jason & Linda's Wedding", date: '2026-09-01' };

const meta: GalleryMeta = {
  gallery_id: 'gallery-1', is_open: true, primary_token: 'token', max_photos: 100,
  max_videos: 50, max_total_bytes: 1_000_000, max_video_bytes: 100_000,
  max_video_duration_sec: 60, max_photo_bytes: 50_000, gallery_title: 'Gallery',
  welcome_message: null, show_event_date: true, slideshow_photo_duration_sec: 5,
  password_enabled: false, has_password: false, theme_color: null, background_style: 'dark',
  cover_image_url: null, logo_image_url: null, show_branding: true, background_mode: 'preset',
  background_color: null, background_image_url: null, voice_guestbook_enabled: true,
  photo_booth_enabled: true, photo_booth_mode: 'strip', photo_booth_single_bottom_text: null,
  photo_booth_single_logo_url: null, photo_booth_single_template_url: null,
  photo_booth_strip_bottom_text: null, photo_booth_strip_logo_url: null,
  photo_booth_strip_template_url: null, photo_booth_strip_style: null, slideshow_enabled: true,
  guest_upload_enabled: true, gallery_view_enabled: true, guestbook_text_enabled: true,
  slideshow_include_photos: true, slideshow_include_videos: true, slideshow_albums: [],
  slideshow_order: 'newest', slideshow_slide_duration_sec: 5, slideshow_transition: 'fade',
  slideshow_show_caption: true, slideshow_loop: true,
};

const gallery = {
  meta, items: [], loading: false, error: null,
  refresh: vi.fn(), setOpen: vi.fn(), deleteItem: vi.fn(), deleteItems: vi.fn(),
  setModeration: vi.fn(), setAlbum: vi.fn(), bulkSetAlbum: vi.fn(), setGuestFeature: vi.fn(),
  setGuestbookEnabled: vi.fn(), setGuestbookShare: vi.fn(), setPhotoBoothEnabled: vi.fn(),
  setPhotoBoothMode: vi.fn(), updatePhotoBoothTemplate: vi.fn(), setPassword: vi.fn(),
  updateBranding: vi.fn(), setSlideshowEnabled: vi.fn(), updateSlideshowSettings: vi.fn(),
};

const affectedRoutes = [
  {
    path: '/dashboard/photo-video-gallery/photo-video-sharing',
    Page: GalleryUploadFeaturePage,
    title: 'Photo & Video Sharing',
  },
  {
    path: '/dashboard/photo-video-gallery/digital-guestbook',
    Page: GalleryTextGuestbookFeaturePage,
    title: 'Digital Guestbook',
  },
  {
    path: '/dashboard/photo-video-gallery/digital-photo-booth',
    Page: GalleryPhotoBoothFeaturePage,
    title: 'Digital Photo Booth',
  },
] as const;

const renderDirectRoute = (path: string, Page: React.ComponentType) => render(
  <MemoryRouter initialEntries={[path]}>
    <AppErrorBoundary>
      <Routes><Route path={path} element={<Page />} /></Routes>
    </AppErrorBoundary>
  </MemoryRouter>,
);

const featureProps = {
  meta,
  onToggleUpload: vi.fn(async () => undefined),
  onToggleGalleryView: vi.fn(async () => undefined),
  onToggleGuestbook: vi.fn(async () => undefined),
  onTogglePhotoBooth: vi.fn(async () => undefined),
  onToggleSlideshow: vi.fn(async () => undefined),
};

describe('affected gallery feature routes', () => {
  beforeEach(() => {
    hooks.events.mockReturnValue({ events: [event], loading: false });
    hooks.selected.mockReturnValue({ selectedEventId: event.id, selectedEvent: event, setSelectedEventId: vi.fn() });
    hooks.gallery.mockReturnValue(gallery);
    hooks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  for (const { path, Page, title } of affectedRoutes) {
    it(`opens ${title} directly and again after a refresh remount`, async () => {
      const firstMount = renderDirectRoute(path, Page);

      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
      expect(screen.getByText(event.name)).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();

      firstMount.unmount();
      renderDirectRoute(path, Page);

      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
      expect(screen.getByText(event.name)).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it(`opens ${title} through its Manage button with the selected event`, async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AppErrorBoundary>
            <Routes>
              <Route path="/" element={<GalleryGuestFeaturesCard {...featureProps} />} />
              <Route path={path} element={<Page />} />
            </Routes>
          </AppErrorBoundary>
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByRole('button', { name: `Manage ${title}` }));

      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
      expect(screen.getByText(event.name)).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  }
});
