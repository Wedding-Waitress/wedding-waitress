import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { GalleryItem, GalleryMeta } from '@/hooks/useEventMediaGallery';
import { PB_STRIP_COUNT, PB_STRIP_PRINT, PB_STRIP_SINGLE, FOOTER_PANEL_HEIGHT, FOOTER_PANEL_WIDTH } from '@/lib/photoBoothTemplate';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';
import { GalleryPhotoBoothFeaturePage } from './GalleryPhotoBoothFeaturePage';

const mocks = vi.hoisted(() => ({
  events: vi.fn(), selectedEvent: vi.fn(), gallery: vi.fn(), getSession: vi.fn(), qrToDataUrl: vi.fn(),
}));

vi.mock('@/hooks/useEvents', () => ({ useEvents: mocks.events }));
vi.mock('@/hooks/useSelectedEvent', () => ({ useSelectedEvent: mocks.selectedEvent }));
vi.mock('@/hooks/useEventMediaGallery', () => ({
  useEventMediaGallery: mocks.gallery,
  GALLERY_ALBUMS: ['Ceremony', 'Reception', 'Dance Floor', 'Speeches', 'Bridal Party', 'Other'],
}));
vi.mock('@/components/SEO/SeoHead', () => ({ SeoHead: () => null }));
vi.mock('qrcode', () => ({ default: { toDataURL: mocks.qrToDataUrl } }));
vi.mock('@/components/Dashboard/PhotoVideoGallery/PhotoBoothTemplatePreview', () => ({
  PhotoBoothTemplatePreview: ({ kind }: { kind: string }) => <div data-testid="photo-booth-preview" data-kind={kind} />,
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: vi.fn() }) },
  },
}));

const event = { id: 'event-1', name: "Jason & Linda's Wedding", date: '2026-12-20' };
const meta = {
  gallery_id: 'gallery-1', primary_token: 'public-token', photo_booth_enabled: true,
  gallery_title: "Jason & Linda's Wedding", photo_booth_strip_style: null,
  photo_booth_strip_bottom_text: null, photo_booth_strip_logo_url: null,
  photo_booth_strip_template_url: null,
} as unknown as GalleryMeta;
const capture: GalleryItem = {
  id: 'capture-1', kind: 'photo', mime_type: 'image/jpeg', byte_size: 1234, duration_sec: null,
  storage_path: 'event/capture.jpg', uploader_name: 'Nader', caption: null, guestbook_message: null,
  uploaded_at: '2026-08-04T10:00:00Z', moderation_status: 'approved', album: null,
  is_guestbook: false, is_photo_booth: true, is_photo_booth_strip: false,
  source_category: 'photo_booth', signed_url: 'https://example.test/capture.jpg',
};
const gallery = {
  meta, items: [capture], loading: false, error: null,
  deleteItem: vi.fn(), deleteItems: vi.fn(), setModeration: vi.fn(async () => undefined),
  setAlbum: vi.fn(async () => undefined), bulkSetAlbum: vi.fn(async () => 1),
  setPhotoBoothEnabled: vi.fn(async () => undefined), setPhotoBoothMode: vi.fn(async () => undefined),
  updatePhotoBoothTemplate: vi.fn(async () => undefined),
};

describe('Digital Photo Booth premium appearance', () => {
  beforeEach(() => {
    mocks.events.mockReturnValue({ events: [event], loading: false });
    mocks.selectedEvent.mockReturnValue({ selectedEventId: event.id, selectedEvent: event });
    mocks.gallery.mockReturnValue(gallery);
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    mocks.qrToDataUrl.mockResolvedValue('data:image/png;base64,qr');
    HTMLElement.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => undefined) } });
  });

  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('applies the route-scoped glass treatment while retaining the complete workspace structure', async () => {
    render(<MemoryRouter><GalleryPhotoBoothFeaturePage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Digital Photo Booth', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Photo & Video Sharing' })).toHaveClass(managementStyles.glassAction);
    expect(screen.getAllByRole('button', { name: 'Launch Digital Photo Booth' })[0]).toHaveClass(managementStyles.glassAction);
    expect(screen.getByText('Selected event')).toHaveClass(managementStyles.selectedEventLabel);
    expect(screen.getByText(event.name)).toHaveClass(managementStyles.selectedEventName);
    expect(screen.getByRole('switch', { name: 'Digital Photo Booth enabled' })).toBeChecked();

    for (const heading of ['How the Digital Photo Booth Works', 'Digital Photo Booth Access']) {
      expect(screen.getByRole('heading', { name: heading }).closest('[data-appearance="espresso-glass"]')).toHaveClass(managementStyles.glassCard);
    }
    for (const heading of ['Photo Strip Background', 'Live Photo Strip Preview', 'Photo Strip Footer']) {
      expect(screen.getByRole('heading', { name: heading }).closest(`.${managementStyles.glassCard}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('photo-booth-preview')).toHaveAttribute('data-kind', 'strip');
    expect(screen.getByText('Background Colour').parentElement?.parentElement).toHaveClass(managementStyles.galleryViewInsetPanel);
    expect(screen.getByText('Custom Footer Text').parentElement).toHaveClass(managementStyles.galleryViewInsetPanel);

    const captures = screen.getByRole('heading', { name: 'Digital Photo Booth Captures (1)' }).closest('[data-appearance="espresso-glass"]');
    expect(captures).toHaveClass(managementStyles.galleryPanel);
    expect(screen.getByPlaceholderText(/Search uploader/)).toHaveClass(managementStyles.galleryControl);
    expect(screen.getByRole('button', { name: /Download all Photo Booth/ })).toHaveClass(managementStyles.galleryControl);
    expect(screen.getByText('Nader').closest(`.${managementStyles.galleryMediaFooter}`)).toBeInTheDocument();
  });

  it('protects the QR code and all photo-strip output geometry constants', async () => {
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<MemoryRouter><GalleryPhotoBoothFeaturePage /></MemoryRouter>);

    const qr = await screen.findByRole('img', { name: 'Digital Photo Booth QR code' });
    expect(mocks.qrToDataUrl).toHaveBeenCalledWith(expect.stringContaining('public-token'), {
      width: 512, margin: 2, color: { dark: '#1D1D1F', light: '#FFFFFF' },
    });
    expect(qr).toHaveClass('w-40', 'h-40', 'sm:w-44', 'sm:h-44');
    expect(qr).not.toHaveAttribute('style');
    expect(qr.parentElement).toHaveClass(managementStyles.galleryViewQrFrame);

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('public-token')));
    fireEvent.click(screen.getAllByRole('button', { name: 'Launch Digital Photo Booth' })[1]);
    expect(open).toHaveBeenCalledWith(expect.stringContaining('public-token'), '_blank', 'noopener,noreferrer');
    fireEvent.click(screen.getByRole('button', { name: 'Download QR code' }));
    expect(anchorClick).toHaveBeenCalled();

    expect(PB_STRIP_PRINT).toEqual({ w: 1440, h: 2000 });
    expect(PB_STRIP_SINGLE).toEqual({ w: 720, h: 2000 });
    expect(PB_STRIP_COUNT).toBe(4);
    expect(FOOTER_PANEL_WIDTH).toBe(720);
    expect(FOOTER_PANEL_HEIGHT).toBe(216);
  });

  it('styles portal controls and includes touch and reduced-motion support', async () => {
    render(<MemoryRouter><GalleryPhotoBoothFeaturePage /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Photo Strip Footer' });

    const headerFont = screen.getByText('Footer Header Font').parentElement!;
    const trigger = within(headerFont).getAllByRole('combobox')[0];
    expect(trigger).toHaveClass(managementStyles.galleryControl);
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const menu = await screen.findByRole('listbox');
    expect(menu).toHaveClass(managementStyles.gallerySelectContent);
    expect(within(menu).getByRole('option', { name: 'Inter' })).toHaveClass(managementStyles.gallerySelectItem);

    const css = fs.readFileSync(path.join(process.cwd(), 'src/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css'), 'utf8');
    expect(css).toContain('.photoBoothTemplates');
    expect(css).toContain('@media (hover: none), (pointer: coarse)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('uses the requested two-column background and preview layout without changing preview output geometry', async () => {
    render(<MemoryRouter><GalleryPhotoBoothFeaturePage /></MemoryRouter>);

    const backgroundHeading = await screen.findByRole('heading', { name: 'Photo Strip Background' });
    const backgroundCard = backgroundHeading.parentElement?.parentElement;
    const previewCard = screen.getByRole('heading', { name: 'Live Photo Strip Preview' }).parentElement?.parentElement;
    expect(backgroundCard).not.toBeNull();
    expect(previewCard).not.toBeNull();
    expect(backgroundCard?.parentElement).toBe(previewCard?.parentElement);
    expect(backgroundCard?.parentElement).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2', 'gap-6', 'items-start', 'lg:items-stretch');
    expect(backgroundCard).toHaveClass('lg:h-full', 'lg:flex', 'lg:flex-col');

    const backgroundSections = [
      screen.getByRole('heading', { name: 'Background Colour' }),
      screen.getByRole('heading', { name: 'Add Background Template' }),
      screen.getByRole('heading', { name: 'Add Your Custom Template' }),
    ];
    const backgroundSectionsGrid = backgroundSections[0].parentElement?.parentElement?.parentElement;
    expect(backgroundSections.every((heading) => heading.parentElement?.parentElement?.parentElement === backgroundSectionsGrid)).toBe(true);
    expect(backgroundSectionsGrid).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2');
    expect(backgroundSectionsGrid).not.toHaveClass('md:grid-cols-2', 'lg:grid-cols-3');
    expect(backgroundSections[0].parentElement?.parentElement).toHaveClass('lg:col-span-2');
    expect(backgroundSections[1].parentElement?.parentElement?.parentElement).toBe(backgroundSections[2].parentElement?.parentElement?.parentElement);

    expect(screen.getByTestId('photo-booth-preview').parentElement).toHaveClass('w-full', 'max-w-[420px]');
    expect(PB_STRIP_PRINT).toEqual({ w: 1440, h: 2000 });
    expect(PB_STRIP_SINGLE).toEqual({ w: 720, h: 2000 });
    expect(PB_STRIP_COUNT).toBe(4);
  });

  it('uses the compact Photo Strip Footer instructional and four-card layout', async () => {
    render(<MemoryRouter><GalleryPhotoBoothFeaturePage /></MemoryRouter>);

    const footerHeading = await screen.findByRole('heading', { name: 'Photo Strip Footer' });
    const footerDescription = screen.getByText('Everything that appears in the footer band under the four photos.');
    expect(footerHeading.parentElement).toBe(footerDescription.parentElement);
    expect(footerHeading.parentElement).toHaveClass('sm:flex-row', 'sm:items-baseline', 'sm:justify-between');

    const uploadHeading = screen.getByRole('heading', { name: 'Upload Custom Footer Design' });
    const uploadCard = uploadHeading.parentElement!;
    const guidance = screen.getByText(/Upload one complete footer design using the exact dimensions below/);
    expect(uploadCard).not.toContainElement(guidance);
    expect(uploadCard).not.toHaveTextContent('Required size:');
    expect(uploadCard).not.toHaveTextContent('recommended safe area');
    expect(screen.getByText(/Required size:/)).toHaveTextContent(`${FOOTER_PANEL_WIDTH} × ${FOOTER_PANEL_HEIGHT} px`);
    expect(screen.getByText('JPG/JPEG:').closest('p')).toHaveTextContent('fills the complete footer with its own background.');
    expect(screen.getByText('Transparent PNG:').closest('p')).toHaveTextContent('overlays your design while the selected photo-strip background remains visible.');
    expect(screen.getByText('Keep important text and logos inside the recommended safe area.')).toBeInTheDocument();

    expect(within(uploadCard).getByText('No image')).toBeInTheDocument();
    expect(within(uploadCard).getByRole('button', { name: 'Choose file' })).toBeInTheDocument();
    expect(within(uploadCard).getByRole('button', { name: 'Download Blank Footer Template' })).toBeInTheDocument();
    expect(uploadCard.parentElement).toHaveClass('grid', 'grid-cols-1', 'xl:grid-cols-4', 'items-start');
    expect(screen.getByRole('heading', { name: 'Custom Footer Text' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Footer Header Font' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Footer Date Font' })).toBeInTheDocument();
  });
});
