import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { GalleryItem, GalleryMeta } from '@/hooks/useEventMediaGallery';
import { PB_DEFAULT_STYLE, PB_STRIP_COUNT, PB_STRIP_PRINT, PB_STRIP_SINGLE, PB_STRIP_CUT_X, FOOTER_PANEL_HEIGHT, FOOTER_PANEL_WIDTH } from '@/lib/photoBoothTemplate';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';
import { GalleryPhotoBoothFeaturePage } from './GalleryPhotoBoothFeaturePage';

const mocks = vi.hoisted(() => ({
  events: vi.fn(), selectedEvent: vi.fn(), gallery: vi.fn(), getSession: vi.fn(), qrToDataUrl: vi.fn(),
}));

vi.mock('@/hooks/useEvents', () => ({ useEvents: mocks.events }));
vi.mock('@/hooks/useSelectedEvent', () => ({ useSelectedEvent: mocks.selectedEvent }));
vi.mock('@/hooks/usePhotoVideoFeatureWorkspace', () => ({
  usePhotoVideoFeatureWorkspace: () => ({ ...mocks.gallery(), ...mocks.selectedEvent(), selectionStatus: 'selected' }),
}));
vi.mock('@/hooks/useEventMediaGallery', () => ({
  useEventMediaGallery: mocks.gallery,
  GALLERY_ALBUMS: ['Ceremony', 'Reception', 'Dance Floor', 'Speeches', 'Bridal Party', 'Other'],
}));
vi.mock('@/components/SEO/SeoHead', () => ({ SeoHead: () => null }));
vi.mock('qrcode', () => ({ default: { toDataURL: mocks.qrToDataUrl } }));
vi.mock('@/hooks/useIsAdmin', () => ({ useIsAdmin: () => ({ isAdmin: false, loading: false }) }));
vi.mock('@/hooks/usePhotoBoothTemplateLibrary', () => ({
  usePhotoBoothTemplateLibrary: () => ({
    templates: [], loading: false, error: null, refetch: vi.fn(), remove: vi.fn(), update: vi.fn(),
  }),
}));
vi.mock('@/components/Dashboard/PhotoVideoGallery/PhotoBoothTemplatePreview', () => ({
  PhotoBoothTemplatePreview: ({ kind, opts }: { kind: string; opts: { templateUrl?: string | null; logoUrl?: string | null; bottomText?: string | null; style?: { bgColor?: string; nameColor?: string; dateColor?: string; textBackdrop?: string } } }) => (
    <div
      data-testid="photo-booth-preview"
      data-kind={kind}
      data-template-url={opts.templateUrl ?? ''}
      data-logo-url={opts.logoUrl ?? ''}
      data-bottom-text={opts.bottomText ?? ''}
      data-background-colour={opts.style?.bgColor ?? ''}
      data-name-colour={opts.style?.nameColor ?? ''}
      data-date-colour={opts.style?.dateColor ?? ''}
      data-text-backdrop={opts.style?.textBackdrop ?? ''}
    />
  ),
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
  updatePhotoBoothTemplate: vi.fn(async (_mode: 'single' | 'strip', _payload: Record<string, any>) => undefined),
};

describe('Digital Photo Booth premium appearance', () => {
  beforeEach(() => {
    gallery.updatePhotoBoothTemplate.mockReset().mockResolvedValue(undefined);
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
    const launchAction = screen.getAllByRole('button', { name: 'Launch Digital Photo Booth' })[0];
    expect(launchAction).toHaveClass(managementStyles.glassAction);
    expect(launchAction).toHaveClass(managementStyles.workspaceHeaderAction);
    expect(launchAction).toBeEnabled();
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
    expect(screen.getByRole('heading', { name: 'Photo Booth Customisation' })).toBeInTheDocument();
    expect(screen.getByText('2. Take four photos')).toBeInTheDocument();
    expect(screen.getByText('The on-screen countdown guides guests through four photo captures.')).toBeInTheDocument();
    expect(screen.getByText('The completed photo strip and four individual photos appear below for review, approval and download.')).toBeInTheDocument();
    expect(screen.getByText('Choose one background for the complete 1200 × 1800 print. The four photo positions in each strip and the footer remain layered above it.')).toBeInTheDocument();
    expect(screen.getByText('Review, organise, approve, hide and download completed photo strips and individual photos captured in your Digital Photo Booth.')).toBeInTheDocument();

    const captures = screen.getByRole('heading', { name: 'Digital Photo Booth Captures (1)' }).closest('[data-appearance="espresso-glass"]');
    expect(captures).toHaveClass(managementStyles.galleryPanel);
    expect(screen.getByPlaceholderText(/Search uploader/)).toHaveClass(managementStyles.galleryControl);
    expect(screen.getByRole('button', { name: /Download all Photo Booth/ })).toHaveClass(managementStyles.galleryControl);
    expect(document.querySelector(`.${managementStyles.mediaLoadingSurface}`)).toBeInTheDocument();
    expect(document.querySelector(`.${managementStyles.mediaLoadingSpinner}`)).toBeInTheDocument();
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

    expect(PB_STRIP_PRINT).toEqual({ w: 1200, h: 1800 });
    expect(PB_STRIP_SINGLE).toEqual({ w: 600, h: 1800 });
    expect(PB_STRIP_CUT_X).toBe(600);
    expect(PB_STRIP_COUNT).toBe(4);
    expect(FOOTER_PANEL_WIDTH).toBe(600);
    expect(FOOTER_PANEL_HEIGHT).toBe(256);
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

    expect(screen.getByText(/Exact required size:/)).toHaveTextContent('1200 × 1800 px');
    expect(screen.getByText(/Exact required size:/).closest('p')).toHaveTextContent('JPEG only (.jpg or .jpeg), exactly 1200 × 1800 px in portrait orientation (4 × 6 inches at 300 DPI)');
    expect(screen.getByText(/Exact required size:/).closest('p')).toHaveTextContent('both 2 × 6 inch strips');

    const customTemplateCard = screen.getByRole('heading', { name: 'Add Your Custom Template' }).parentElement?.parentElement!;
    const chooseTemplate = within(customTemplateCard).getByRole('button', { name: 'Choose File' });
    const downloadDesignGuide = within(customTemplateCard).getByRole('button', { name: 'Download Photo Strip Design Template' });
    expect(downloadDesignGuide).toHaveClass(managementStyles.galleryControl);
    expect(chooseTemplate.compareDocumentPosition(downloadDesignGuide) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const templatesCardSource = fs.readFileSync(path.join(
      process.cwd(),
      'src/components/Dashboard/PhotoVideoGallery/GalleryPhotoBoothTemplatesCard.tsx',
    ), 'utf8');
    expect(templatesCardSource).toContain("a.download = 'wedding-waitress-photo-strip-design-template-1200x1800.png'");
    expect(templatesCardSource).toMatch(/makePhotoStripDesignTemplate\(\)[\s\S]*?canvas\.toBlob\([\s\S]*?'image\/png'\)/);

    expect(screen.getByTestId('photo-booth-preview').parentElement).toHaveClass('w-full', 'max-w-[420px]');
    expect(PB_STRIP_PRINT).toEqual({ w: 1200, h: 1800 });
    expect(PB_STRIP_SINGLE).toEqual({ w: 600, h: 1800 });
    expect(PB_STRIP_COUNT).toBe(4);
  });

  it('uses the compact Photo Strip Footer instructional and four-card layout', async () => {
    render(<MemoryRouter><GalleryPhotoBoothFeaturePage /></MemoryRouter>);

    const footerHeading = await screen.findByRole('heading', { name: 'Photo Strip Footer' });
    const footerDescription = screen.getByText('Everything that appears in the footer band beneath the four photos in each strip.');
    expect(footerHeading.parentElement).toBe(footerDescription.parentElement);
    expect(footerHeading.parentElement).toHaveClass('sm:flex-row', 'sm:items-baseline', 'sm:justify-between');

    const uploadHeading = screen.getByRole('heading', { name: 'Upload Custom Footer Design' });
    const uploadCard = uploadHeading.parentElement!;
    const guidance = screen.getByText(/Upload one complete footer design using the exact dimensions below/);
    expect(uploadCard).not.toContainElement(guidance);
    expect(uploadCard).not.toHaveTextContent('Required size:');
    expect(uploadCard).not.toHaveTextContent('recommended safe area');
    expect(screen.getByText(/Required size:/)).toHaveTextContent(`${FOOTER_PANEL_WIDTH} × ${FOOTER_PANEL_HEIGHT} px`);
    expect(screen.getByText('JPEG only:').closest('p')).toHaveTextContent('upload a .jpg or .jpeg file.');
    expect(screen.getByText('Complete background:').closest('p')).toHaveTextContent('the footer JPEG replaces the complete footer background.');
    expect(screen.getByText('Keep important text and logos inside the recommended safe area.')).toBeInTheDocument();

    expect(within(uploadCard).getByText('No image')).toBeInTheDocument();
    expect(within(uploadCard).getByRole('button', { name: 'Choose file' })).toBeInTheDocument();
    expect(within(uploadCard).getByRole('button', { name: 'Download Blank Footer Template' })).toBeInTheDocument();
    expect(uploadCard.parentElement).toHaveClass('grid', 'grid-cols-1', 'xl:grid-cols-4', 'items-start');
    expect(screen.getByRole('heading', { name: 'Custom Footer Text' })).toBeInTheDocument();
    const backdrop = screen.getByRole('combobox', { name: 'Text Backdrop' });
    expect(backdrop).toHaveTextContent('None');
    expect(backdrop).toBeEnabled();
    expect(screen.getByText('Improve text visibility over detailed backgrounds.')).toBeInTheDocument();
    expect(screen.getByTestId('photo-booth-preview')).toHaveAttribute('data-text-backdrop', 'none');
    fireEvent.keyDown(backdrop, { key: 'ArrowDown' });
    const backdropMenu = await screen.findByRole('listbox');
    expect(within(backdropMenu).getAllByRole('option').map(option => option.textContent)).toEqual(['None', 'White', 'Black']);
    fireEvent.click(within(backdropMenu).getByRole('option', { name: 'White' }));
    expect(screen.getByTestId('photo-booth-preview')).toHaveAttribute('data-text-backdrop', 'white');
    expect(screen.getByRole('heading', { name: 'Footer Header Font' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Footer Date Font' })).toBeInTheDocument();

    const customisationInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
    expect(customisationInputs).toHaveLength(2);
    expect(customisationInputs.every((input) => input.accept === 'image/jpeg,.jpg,.jpeg')).toBe(true);
  });

  it('disables Text Backdrop while a complete custom footer design is active', async () => {
    mocks.gallery.mockReturnValue({
      ...gallery,
      meta: { ...meta, photo_booth_strip_logo_url: 'https://storage.test/custom-footer.jpg' },
    });
    render(<MemoryRouter><GalleryPhotoBoothFeaturePage /></MemoryRouter>);

    expect(await screen.findByRole('combobox', { name: 'Text Backdrop' })).toBeDisabled();
    expect(document.getElementById('photo-booth-text-backdrop-help')).toHaveTextContent(
      'Improve text visibility over detailed backgrounds. Available only when generated footer text is used.',
    );
  });

  it('resets and immediately persists only the Photo Strip Background, including stale custom-template state', async () => {
    const initialMeta = {
      ...meta,
      photo_booth_strip_bottom_text: 'Keep this footer',
      photo_booth_strip_logo_url: 'https://storage.test/custom-footer.jpg',
      photo_booth_strip_template_url: 'https://storage.test/custom-background.jpg',
      photo_booth_strip_style: {
        bgColor: '#123456',
        nameFontFamily: 'Playfair Display',
        nameColor: '#ABCDEF',
        nameSize: 54,
        dateFontFamily: 'Manrope',
        dateColor: '#FEDCBA',
        dateSize: 36,
        textBackdrop: 'black',
        backgroundMode: 'template',
        templateId: null,
      },
    } as unknown as GalleryMeta;
    mocks.gallery.mockReturnValue({ ...gallery, meta: initialMeta });
    render(<MemoryRouter><GalleryPhotoBoothFeaturePage /></MemoryRouter>);

    const backgroundCard = (await screen.findByRole('heading', { name: 'Photo Strip Background' })).closest<HTMLElement>(`.${managementStyles.glassCard}`)!;
    fireEvent.click(within(backgroundCard).getByRole('button', { name: 'Reset to default' }));

    expect(screen.getByTestId('photo-booth-preview')).toHaveAttribute('data-template-url', '');
    expect(screen.getByTestId('photo-booth-preview')).toHaveAttribute('data-background-colour', '#967A59');
    expect(screen.getAllByText('No Template Selected')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Background Colour' }).parentElement).toHaveTextContent('Active');

    await waitFor(() => expect(gallery.updatePhotoBoothTemplate).toHaveBeenCalledTimes(1));
    const saved = gallery.updatePhotoBoothTemplate.mock.calls[0][1];
    expect(gallery.updatePhotoBoothTemplate).toHaveBeenCalledWith('strip', {
      bottom_text: 'Keep this footer',
      logo_url: 'https://storage.test/custom-footer.jpg',
      template_url: null,
      style: expect.objectContaining({
        bgColor: '#967A59',
        backgroundMode: 'colour',
        templateId: null,
        nameFontFamily: 'Playfair Display',
        nameColor: '#ABCDEF',
        dateFontFamily: 'Manrope',
        dateColor: '#FEDCBA',
        textBackdrop: 'black',
      }),
    });

    cleanup();
    mocks.gallery.mockReturnValue({
      ...gallery,
      meta: {
        ...initialMeta,
        photo_booth_strip_bottom_text: saved.bottom_text,
        photo_booth_strip_logo_url: saved.logo_url,
        photo_booth_strip_template_url: saved.template_url,
        photo_booth_strip_style: saved.style,
      },
    });
    render(<MemoryRouter><GalleryPhotoBoothFeaturePage /></MemoryRouter>);
    expect(await screen.findByTestId('photo-booth-preview')).toHaveAttribute('data-template-url', '');
    expect(screen.getByTestId('photo-booth-preview')).toHaveAttribute('data-background-colour', '#967A59');
    expect(screen.getAllByText('No Template Selected')).toHaveLength(2);
  });

  it('resets and immediately persists only the Photo Strip Footer defaults across a fresh render', async () => {
    const initialMeta = {
      ...meta,
      photo_booth_strip_bottom_text: 'Custom footer copy',
      photo_booth_strip_logo_url: 'https://storage.test/custom-footer.jpg',
      photo_booth_strip_template_url: 'https://storage.test/custom-background.jpg',
      photo_booth_strip_style: {
        bgColor: '#123456',
        nameFontFamily: 'Playfair Display',
        nameColor: '#111111',
        nameSize: 60,
        dateFontFamily: 'Manrope',
        dateColor: '#222222',
        dateSize: 38,
        textBackdrop: 'white',
        backgroundMode: 'template',
        templateId: 'remote-template-id',
      },
    } as unknown as GalleryMeta;
    mocks.gallery.mockReturnValue({ ...gallery, meta: initialMeta });
    render(<MemoryRouter><GalleryPhotoBoothFeaturePage /></MemoryRouter>);

    const footerCard = (await screen.findByRole('heading', { name: 'Photo Strip Footer' })).closest<HTMLElement>(`.${managementStyles.glassCard}`)!;
    fireEvent.click(within(footerCard).getByRole('button', { name: 'Reset to default' }));

    const preview = screen.getByTestId('photo-booth-preview');
    expect(preview).toHaveAttribute('data-template-url', 'https://storage.test/custom-background.jpg');
    expect(preview).toHaveAttribute('data-background-colour', '#123456');
    expect(preview).toHaveAttribute('data-logo-url', '');
    expect(preview).toHaveAttribute('data-bottom-text', '');
    expect(preview).toHaveAttribute('data-name-colour', '#FFFFFF');
    expect(preview).toHaveAttribute('data-date-colour', '#FFFFFF');
    expect(preview).toHaveAttribute('data-text-backdrop', 'none');
    expect(within(footerCard).getByText('No image')).toBeInTheDocument();

    await waitFor(() => expect(gallery.updatePhotoBoothTemplate).toHaveBeenCalledTimes(1));
    const saved = gallery.updatePhotoBoothTemplate.mock.calls[0][1];
    expect(gallery.updatePhotoBoothTemplate).toHaveBeenCalledWith('strip', {
      bottom_text: null,
      logo_url: null,
      template_url: 'https://storage.test/custom-background.jpg',
      style: {
        bgColor: '#123456',
        fontFamily: PB_DEFAULT_STYLE.fontFamily,
        fontColor: '#FFFFFF',
        nameSize: PB_DEFAULT_STYLE.nameSize,
        dateSize: PB_DEFAULT_STYLE.dateSize,
        nameFontFamily: PB_DEFAULT_STYLE.nameFontFamily,
        nameColor: '#FFFFFF',
        dateFontFamily: PB_DEFAULT_STYLE.dateFontFamily,
        dateColor: '#FFFFFF',
        textBackdrop: 'none',
        backgroundMode: 'template',
        templateId: 'remote-template-id',
      },
    });

    cleanup();
    mocks.gallery.mockReturnValue({
      ...gallery,
      meta: {
        ...initialMeta,
        photo_booth_strip_bottom_text: saved.bottom_text,
        photo_booth_strip_logo_url: saved.logo_url,
        photo_booth_strip_template_url: saved.template_url,
        photo_booth_strip_style: saved.style,
      },
    });
    render(<MemoryRouter><GalleryPhotoBoothFeaturePage /></MemoryRouter>);
    expect(await screen.findByTestId('photo-booth-preview')).toHaveAttribute('data-template-url', 'https://storage.test/custom-background.jpg');
    expect(screen.getByTestId('photo-booth-preview')).toHaveAttribute('data-logo-url', '');
    expect(screen.getByTestId('photo-booth-preview')).toHaveAttribute('data-text-backdrop', 'none');
    expect(within(screen.getByRole('heading', { name: 'Photo Strip Footer' }).closest<HTMLElement>(`.${managementStyles.glassCard}`)!).getByText('No image')).toBeInTheDocument();
  });

  it('shows the existing default background when persisted settings reference a retired library asset', async () => {
    mocks.gallery.mockReturnValue({
      ...gallery,
      meta: { ...meta, photo_booth_strip_template_url: '/photobooth-templates/midnight-navy.jpg' },
    });
    render(<MemoryRouter><GalleryPhotoBoothFeaturePage /></MemoryRouter>);

    const backgroundColour = await screen.findByRole('heading', { name: 'Background Colour' });
    expect(backgroundColour.parentElement).toHaveTextContent('Active');
    expect(screen.getAllByText('No Template Selected').length).toBeGreaterThan(0);
  });

  it('falls back to the selected solid colour when persisted settings reference a removed built-in', async () => {
    mocks.gallery.mockReturnValue({
      ...gallery,
      meta: {
        ...meta,
        photo_booth_strip_template_url: '/photobooth-templates/Emerald%20Garden.jpg',
      },
    });
    render(<MemoryRouter><GalleryPhotoBoothFeaturePage /></MemoryRouter>);

    expect(await screen.findByTestId('photo-booth-preview')).toHaveAttribute('data-template-url', '');
    expect(screen.getByRole('heading', { name: 'Background Colour' }).parentElement).toHaveTextContent('Active');
  });

  it('keeps the Template Library controls available with the approved empty-catalogue state', async () => {
    render(<MemoryRouter><GalleryPhotoBoothFeaturePage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Browse Template Library' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('textbox', { name: 'Search templates by name' })).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: 'Filter templates by category' })).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: 'Filter templates by colour' })).toBeInTheDocument();
    expect(within(dialog).getByText('No background templates are currently available.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Select Template' })).toBeDisabled();
    expect(gallery.updatePhotoBoothTemplate).not.toHaveBeenCalled();
  });
});
