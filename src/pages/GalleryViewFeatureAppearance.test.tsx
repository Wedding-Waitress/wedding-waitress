import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';
import { GalleryViewFeaturePage } from './GalleryViewFeaturePage';

const mocks = vi.hoisted(() => ({
  events: vi.fn(),
  selectedEvent: vi.fn(),
  gallery: vi.fn(),
  getSession: vi.fn(),
  qrToDataUrl: vi.fn(),
  open: vi.fn(),
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
      getUser: vi.fn(),
    },
    storage: { from: vi.fn() },
  },
}));

const event = { id: 'event-1', name: "Jason & Linda's Wedding", date: '2026-09-01' };
const meta = {
  gallery_id: 'gallery-1',
  is_open: true,
  primary_token: 'public-gallery-token',
  gallery_view_enabled: true,
  password_enabled: false,
  has_password: false,
  background_style: 'cream',
  background_mode: 'preset',
  background_color: null,
  background_image_url: null,
  cover_image_url: null,
  logo_image_url: null,
  show_branding: true,
} as GalleryMeta;

const gallery = {
  meta,
  items: [],
  loading: false,
  error: null,
  setPassword: vi.fn(async () => undefined),
  updateBranding: vi.fn(async () => undefined),
  setGuestFeature: vi.fn(async () => undefined),
};

describe('Photo & Video Gallery View premium appearance', () => {
  beforeEach(() => {
    mocks.events.mockReturnValue({ events: [event], loading: false });
    mocks.selectedEvent.mockReturnValue({ selectedEventId: event.id, selectedEvent: event });
    mocks.gallery.mockReturnValue(gallery);
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    mocks.qrToDataUrl.mockResolvedValue('data:image/png;base64,qr');
    mocks.open.mockReset();
    vi.stubGlobal('open', mocks.open);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('applies the approved glass treatment without changing layout or heading hierarchy', async () => {
    render(<MemoryRouter><GalleryViewFeaturePage /></MemoryRouter>);

    const pageHeading = await screen.findByRole('heading', { name: 'Photo & Video Gallery View', level: 1 });
    expect(pageHeading).toHaveClass('lg:text-3xl', 'font-bold');

    expect(screen.getByRole('button', { name: 'Back to Photo & Video Sharing' })).toHaveClass(managementStyles.glassAction);
    expect(screen.getByRole('button', { name: 'Preview as Guest' })).toHaveClass(managementStyles.glassAction);
    expect(screen.getByText('Selected event')).toHaveClass(managementStyles.selectedEventLabel);
    expect(screen.getByText(event.name)).toHaveClass(managementStyles.selectedEventName);
    expect(screen.getByRole('switch', { name: 'Photo & Video Gallery View enabled' })).toBeChecked();

    const cardHeadings = ['Branding & Theme', 'Guest Gallery Access', 'Password Protection'];
    for (const name of cardHeadings) {
      const card = screen.getByRole('heading', { name }).closest('[data-appearance="espresso-glass"]');
      expect(card).toHaveClass(managementStyles.glassCard);
    }
    expect(screen.getByRole('heading', { name: 'Branding & Theme' }).closest('.h-full')).toBeInTheDocument();
    expect(screen.getByText('These appearance settings are shared across your guest-facing gallery experiences.')).toHaveClass(managementStyles.galleryViewFootnote);

    expect(screen.getAllByText('No image')[0].parentElement?.parentElement).toHaveClass(managementStyles.galleryViewInsetPanel);
    expect(screen.getByRole('button', { name: 'Choose Image' })).toHaveClass(managementStyles.galleryControl);
    expect(screen.getByRole('button', { name: 'Reset to default' })).toHaveClass(managementStyles.galleryControl);
    expect(screen.getByRole('button', { name: 'Save branding' })).toHaveClass(managementStyles.galleryViewPrimaryAction);

    expect(screen.getByDisplayValue(/public-gallery-token/)).toHaveClass(managementStyles.galleryControl);
    for (const name of ['Copy Gallery Link', 'Open Gallery', 'Download QR code']) {
      expect(screen.getByRole('button', { name })).toHaveClass(managementStyles.galleryControl);
    }

    fireEvent.click(screen.getByRole('switch', { name: 'Password is off' }));
    expect(await screen.findByLabelText('Set a password')).toHaveClass(managementStyles.galleryControl);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass(managementStyles.galleryViewPrimaryAction);
  });

  it('keeps the QR encoder and image pure black-and-white and preserves its actions', async () => {
    const clipboardWrite = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboardWrite } });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<MemoryRouter><GalleryViewFeaturePage /></MemoryRouter>);

    const qr = await screen.findByRole('img', { name: 'Guest gallery QR code' });
    expect(mocks.qrToDataUrl).toHaveBeenCalledWith(
      expect.stringContaining('public-gallery-token'),
      { width: 512, margin: 2, color: { dark: '#1D1D1F', light: '#FFFFFF' } },
    );
    expect(qr).toHaveClass('w-40', 'h-40', 'sm:w-44', 'sm:h-44');
    expect(qr).not.toHaveAttribute('style');
    expect(qr.parentElement).toHaveClass(managementStyles.galleryViewQrFrame);

    fireEvent.click(screen.getByRole('button', { name: 'Copy Gallery Link' }));
    await waitFor(() => expect(clipboardWrite).toHaveBeenCalledWith(expect.stringContaining('public-gallery-token')));
    fireEvent.click(screen.getByRole('button', { name: 'Open Gallery' }));
    expect(mocks.open).toHaveBeenCalledWith(expect.stringContaining('public-gallery-token'), '_blank', 'noopener,noreferrer');
    fireEvent.click(screen.getByRole('button', { name: 'Download QR code' }));
    expect(anchorClick).toHaveBeenCalled();
  });

  it('retains accessible interaction states and true-green primary actions', () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css'),
      'utf8',
    );

    expect(css).toContain('.galleryViewPrimaryAction');
    expect(css).toContain('linear-gradient(180deg, #22c55e 0%, #16a34a 100%)');
    expect(css).toMatch(/\.galleryViewPrimaryAction[\s\S]*:disabled[\s\S]*rgba\(34, 197, 94, 0\.48\)/);
    expect(css).toContain(':focus-visible');
    expect(css).toContain('@media (hover: none), (pointer: coarse)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('.galleryViewQrFrame');
    expect(css).not.toMatch(/\.galleryViewQrFrame[^{]*\{[^}]*(?:filter|opacity|backdrop-filter)/);
  });
});
