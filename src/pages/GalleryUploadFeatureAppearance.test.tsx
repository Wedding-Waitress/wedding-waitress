import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { GalleryItem, GalleryMeta } from '@/hooks/useEventMediaGallery';
import { GalleryUploadAccessCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryUploadAccessCard';
import { GalleryDownloadsCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryDownloadsCard';
import { GalleryUsageCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryUsageCard';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';
import { GalleryUploadFeaturePage } from './GalleryUploadFeaturePage';
vi.mock('@/hooks/usePaidAccessState',()=>({usePaidAccessState:()=>({state:null,loading:false})}));

const mocks = vi.hoisted(() => ({
  events: vi.fn(),
  selectedEvent: vi.fn(),
  gallery: vi.fn(),
  getSession: vi.fn(),
  qrToDataUrl: vi.fn(),
}));

vi.mock('@/hooks/useEvents', () => ({ useEvents: mocks.events }));
vi.mock('@/hooks/useSelectedEvent', () => ({ useSelectedEvent: mocks.selectedEvent }));
vi.mock('@/hooks/usePhotoVideoFeatureWorkspace', () => ({
  usePhotoVideoFeatureWorkspace: () => {
    const gallery = mocks.gallery();
    return { ...gallery, ...mocks.selectedEvent(), selectionStatus: gallery.loading && !gallery.meta ? 'loading' : 'selected' };
  },
}));
vi.mock('@/hooks/useEventMediaGallery', () => ({
  useEventMediaGallery: mocks.gallery,
  GALLERY_ALBUMS: ['Ceremony', 'Reception', 'Dance Floor', 'Speeches', 'Bridal Party', 'Other'],
}));
vi.mock('@/components/SEO/SeoHead', () => ({ SeoHead: () => null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({select: () => ({eq: () => ({order: async () => ({data: [], error: null})})})}),
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));
vi.mock('qrcode', () => ({
  default: { toDataURL: mocks.qrToDataUrl },
}));

const event = { id: 'event-1', name: "Jason & Linda's Wedding", date: '2026-09-01' };

const meta = {
  gallery_id: 'gallery-1',
  is_open: true,
  primary_token: 'public-gallery-token',
  max_photos: 500,
  max_videos: 50,
  max_total_bytes: 10_000_000_000,
  max_video_bytes: 100_000_000,
  max_video_duration_sec: 60,
  max_photo_bytes: 20_000_000,
  gallery_title: 'Wedding Gallery',
  guest_upload_enabled: true,
} as GalleryMeta;

const item: GalleryItem = {
  id: 'media-1',
  kind: 'photo',
  mime_type: 'image/jpeg',
  byte_size: 1024,
  duration_sec: null,
  storage_path: 'event-1/media-1.jpg',
  uploader_name: 'Guest',
  caption: 'Reception photo',
  guestbook_message: null,
  uploaded_at: '2026-08-13T00:00:00Z',
  moderation_status: 'approved',
  album: 'Reception',
  is_guestbook: false,
  is_photo_booth: false,
  is_photo_booth_strip: false,
  source_category: 'guest_upload',
  signed_url: 'https://example.com/media-1.jpg',
};

const gallery = {
  meta,
  items: [item],
  loading: false,
  error: null,
  refresh: vi.fn(),
  setOpen: vi.fn(),
  deleteItem: vi.fn(),
  deleteItems: vi.fn(),
  setModeration: vi.fn(),
  setAlbum: vi.fn(),
  bulkSetAlbum: vi.fn(),
  setGuestFeature: vi.fn(),
};

const renderPage = () => render(
  <MemoryRouter>
    <GalleryUploadFeaturePage />
  </MemoryRouter>,
);

describe('Photo & Video Sharing management appearance', () => {
  beforeEach(() => {
    mocks.events.mockReturnValue({ events: [event], loading: false });
    mocks.selectedEvent.mockReturnValue({ selectedEventId: event.id, selectedEvent: event });
    mocks.gallery.mockReturnValue(gallery);
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    mocks.qrToDataUrl.mockResolvedValue('data:image/png;base64,qr-code');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('preserves the approved upper appearance and scopes the smoked gallery below it', async () => {
    const { container } = renderPage();

    const pageHeading = await screen.findByRole('heading', { name: 'Photo & Video Sharing', level: 1 });
    const surface = container.querySelector('[data-appearance="photo-video-sharing"]');
    const workspaceContent = container.querySelector('main');
    expect(surface).toHaveClass(managementStyles.photoVideoSharingSurface);
    expect(workspaceContent).toHaveClass(managementStyles.workspaceContent);
    expect(pageHeading.closest('header')).toHaveClass(managementStyles.manropeTypography);
    expect(screen.getByText('Manage the photos and videos shared by your guests.')).toBeInTheDocument();

    const backButton = screen.getByRole('button', { name: 'Back to Photo & Video Sharing' });
    expect(backButton).toHaveClass(managementStyles.glassAction);


    expect(screen.queryByRole('switch', { name: 'Photo & Video Sharing enabled' })).not.toBeInTheDocument();

    const upperHeadings = [
      screen.getByRole('heading', { name: 'Photo & Video Sharing Access', level: 2 }),
      screen.getByRole('heading', { name: 'Gallery Usage', level: 2 }),
      screen.getByRole('heading', { name: 'Download as ZIP', level: 3 }),
    ];
    const upperCards = upperHeadings.map(heading => heading.closest('[data-appearance="espresso-glass"]'));
    expect(upperCards).toHaveLength(3);
    upperCards.forEach(card => expect(card).toHaveClass(managementStyles.glassCard));

    const upperGrid = upperCards[0]?.parentElement;
    expect(upperGrid?.className).toContain('lg:grid-cols-3');

    const usageCard = upperCards[1] as HTMLElement;
    const usageBars = within(usageCard).getAllByRole('progressbar');
    expect(usageBars).toHaveLength(3);
    usageBars.forEach(bar => {
      expect(bar).toHaveClass('h-4', 'bg-[#E8E1D6]/50', '[&>div]:bg-green-500');
    });

    const sharedHeading = screen.getByRole('heading', { name: 'Shared Photos & Videos (1)', level: 2 });
    const sharedCard = sharedHeading.closest('[class*="rounded-2xl"]');
    expect(sharedCard).toHaveClass(managementStyles.galleryPanel);
    expect(sharedCard).not.toHaveClass(managementStyles.glassCard);
    expect(sharedCard).toHaveAttribute('data-appearance', 'espresso-glass');
    expect(screen.getByTestId('gallery-toolbar')).toBeInTheDocument();

    const search = screen.getByPlaceholderText(/Search uploader, caption or message/);
    expect(search).toHaveClass(managementStyles.galleryControl);
    screen.getAllByRole('combobox').forEach(control => expect(control).toHaveClass(managementStyles.galleryControl));
    expect(screen.getByRole('button', { name: /All Statuses/ })).toHaveClass(
      managementStyles.galleryControl,
      managementStyles.galleryControlActive,
    );
    const albumFilter = screen.getByRole('combobox', { name: 'Filter by album' });
    expect(albumFilter).toHaveClass(managementStyles.galleryControl);
    expect(within(albumFilter).getByText('All Albums')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All Albums' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Select' }).find(b=>b.closest('[data-testid="gallery-toolbar"]'))).toHaveClass(managementStyles.galleryControl);

    const approvedBadge = screen.queryByText('Approved', { selector: 'span.uppercase' });
    expect(approvedBadge).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Approved \(/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Hidden \(/ })).not.toBeInTheDocument();
    const mediaTile = screen.getByText('Guest').closest(`.${managementStyles.galleryMediaTile}`);
    expect(mediaTile).toHaveClass('bg-white', 'border', 'border-black', managementStyles.galleryMediaTile);
    expect(mediaTile?.querySelector('.aspect-square')).toBeInTheDocument();
  });

  it('uses the management espresso glass treatment while the gallery is loading', async () => {
    mocks.gallery.mockReturnValue({ ...gallery, meta: null, items: [], loading: true });
    const { container } = renderPage();

    const panel = await waitFor(() => {
      const element = container.querySelector('[data-workspace-state="loading"]');
      expect(element).toBeInTheDocument();
      return element as HTMLElement;
    });
    expect(panel).toHaveClass(managementStyles.loadingGlassPanel, 'p-8', 'sm:p-10', 'rounded-xl');
    expect(panel).not.toHaveClass('bg-white', 'ww-box');
    expect(within(panel).getByText('Loading gallery…')).toHaveClass(managementStyles.loadingGlassText);
    expect(panel.querySelector('svg')).toHaveClass(managementStyles.loadingGlassSpinner, 'animate-spin');

    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css'),
      'utf8',
    );
    expect(css).toMatch(/\.loadingGlassPanel[\s\S]*border:\s*1px solid rgba\(201, 151, 93, 0\.38\)[\s\S]*linear-gradient\(180deg, rgba\(101, 57, 40, 0\.72\)/);
    expect(css).toMatch(/\.loadingGlassPanel[\s\S]*inset 0 1px 0 rgba\(255, 239, 218, 0\.14\)/);
    expect(css).toMatch(/\.loadingGlassSpinner[\s\S]*color:\s*#d9b77f/);
    expect(css).toMatch(/\.loadingGlassText[\s\S]*color:\s*#f3e9df/);
  });

  it('defines fine-pointer, touch and reduced-motion interaction states without targeting media artwork', () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css'),
      'utf8',
    );

    expect(css).toMatch(/\.galleryPanel[\s\S]*rgba\(8, 4, 3, 0\.94\)[\s\S]*rgba\(190, 137, 79, 0\.3\)/);
    expect(css).toMatch(/\.glassCard[\s\S]*\.text-\\\[\\#1D1D1F\\\][\s\S]*color:\s*#fff\s*!important/);
    expect(css).toMatch(/\.glassCard[\s\S]*\.text-muted-foreground[\s\S]*color:\s*#e8ddd2\s*!important/);
    expect(css).toMatch(/\.galleryPanel[\s\S]*color:\s*#fff/);
    expect(css).toMatch(/:global\(\.ww-brown-outline\)[\s\S]*\.galleryControl[\s\S]*color:\s*#fff\s*!important/);
    expect(css).toMatch(/\.galleryControlActive[\s\S]*:global\(\.opacity-75\)[\s\S]*opacity:\s*1/);
    expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\)[\s\S]*\.galleryControl:hover:not\(:active\)[\s\S]*\.galleryMediaTile:hover:not\(:active\)/);
    expect(css).toMatch(/@media \(hover: none\), \(pointer: coarse\)[\s\S]*\.galleryControl:active[\s\S]*\.galleryMediaTile:active/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.galleryControl[\s\S]*\.galleryMediaTile[\s\S]*transition:\s*none\s*!important/);
    expect(css).not.toMatch(/\.galleryMediaTile\s+(?:img|video|canvas)/);
  });

  it('uses the scoped smoked-glass treatment on exactly the nine upper control surfaces', async () => {
    renderPage();

    await screen.findByRole('heading', { name: 'Photo & Video Sharing Access', level: 2 });

    const sharingLink = screen.getByDisplayValue(/weddingwaitress\.com\.au\/gallery\//);
    expect(sharingLink).toHaveClass(managementStyles.galleryControl, managementStyles.upperGlassField, 'h-11');
    expect(sharingLink).toHaveAttribute('readonly');

    const accessButtons = [
      screen.getByRole('button', { name: 'Copy' }),
      screen.getByRole('button', { name: 'Open sharing page' }),
      screen.getByRole('button', { name: 'Download QR code' }),
    ];
    const zipButtons = [
      screen.getByRole('button', { name: /^Download All\d/ }),
            screen.getByRole('button', { name: /Download Photos Only/ }),
      screen.getByRole('button', { name: /Download Videos Only/ }),
    ];

    [...accessButtons, ...zipButtons].forEach(button => {
      expect(button).toHaveClass(managementStyles.galleryControl, managementStyles.upperGlassControl);
      expect(button.querySelector('svg')).toBeInTheDocument();
    });
    expect(accessButtons[0]).toHaveClass('min-h-11', 'w-full');
    zipButtons.forEach(button => expect(button).toHaveClass('h-11'));
    expect(screen.queryByRole('button', { name: 'Download Guestbook Recordings' })).toBeNull();

    const guestsPill = screen.getByLabelText('1 guests uploaded');
    expect(guestsPill.tagName).toBe('DIV');
    expect(guestsPill).toHaveClass(managementStyles.upperGlassPill);
    expect(within(guestsPill).getByText('Guests who uploaded')).toBeInTheDocument();

    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css'),
      'utf8',
    );
    expect(css).toMatch(/\.upperGlassField[\s\S]*-webkit-text-fill-color:\s*#f7f1eb\s*!important/);
    expect(css).toMatch(/\.upperGlassControl[\s\S]*:global\(\.text-muted-foreground\)[\s\S]*color:\s*#d9b77f\s*!important/);
    expect(css).toMatch(/\.galleryControl\.upperGlassControl[\s\S]*:disabled[\s\S]*color:\s*#bfae9f\s*!important[\s\S]*opacity:\s*1\s*!important/);
    expect(css).toMatch(/\.upperGlassPill[\s\S]*border-color:\s*rgba\(211, 161, 101, 0\.42\)\s*!important/);
    expect(css).toMatch(/\.upperGlassPill[\s\S]*background:[\s\S]*rgba\(62, 35, 26, 0\.62\)/);
    expect(css).toMatch(/\.upperGlassPill[\s\S]*:global\(svg\)[\s\S]*color:\s*#d9b77f\s*!important/);
    expect(css).toMatch(/\.upperGlassPill[\s\S]*:global\(\.tabular-nums\)[\s\S]*color:\s*#edc994\s*!important/);
    expect(css).not.toMatch(/\.legibleLight(?:Field|Control)/);
  });

  it('keeps the default variants of the shared upper components unchanged', async () => {
    const access = render(<GalleryUploadAccessCard meta={meta} onToggleOpen={vi.fn()} />);
    const defaultField = await screen.findByDisplayValue(/weddingwaitress\.com\.au\/gallery\//);
    expect(defaultField).not.toHaveClass(managementStyles.galleryControl, managementStyles.upperGlassField);
    expect(screen.getByRole('button', { name: 'Copy' })).not.toHaveClass(managementStyles.upperGlassControl);
    access.unmount();

    const usage = render(<GalleryUsageCard meta={meta} items={[item]} />);
    const defaultGuestsPill = screen.getByLabelText('1 guests uploaded');
    expect(defaultGuestsPill).toHaveClass('bg-white');
    expect(defaultGuestsPill).not.toHaveClass(managementStyles.upperGlassPill);
    usage.unmount();

    render(<GalleryDownloadsCard items={[item]} eventName={event.name} />);
    screen.getAllByRole('button', { name: /Download/ }).forEach(button => {
      expect(button).not.toHaveClass(managementStyles.galleryControl, managementStyles.upperGlassControl);
    });
  });

  it('reuses the single approved application background token', () => {
    const root = process.cwd();
    const managementCss = fs.readFileSync(
      path.join(root, 'src/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css'),
      'utf8',
    );
    const applicationCss = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');
    const landingSurface = managementCss.match(/\.photoVideoSharingSurface\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    const shellSurface = managementCss.match(/\.photoVideoWorkspaceMain\.photoVideoWorkspaceMain\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(landingSurface).toContain('background-color: var(--ww-application-background-color)');
    expect(landingSurface).toContain('background-image: var(--ww-application-background-image)');
    expect(shellSurface).toContain('background-color: var(--ww-application-background-color)');
    expect(shellSurface).toContain('background-image: var(--ww-application-background-image)');
    expect(applicationCss).toContain('--ww-application-background-color: #120806');
    expect(applicationCss).toMatch(/--ww-application-background-image:\s*linear-gradient\(\s*180deg,/);
    expect(applicationCss).not.toContain('rgba(255, 111, 24, 0.62)');
    expect(applicationCss).not.toContain('linear-gradient(116deg');
  });
});

describe('Photo & Video Sharing QR protection', () => {
  beforeEach(() => {
    mocks.qrToDataUrl.mockResolvedValue('data:image/png;base64,qr-code');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('preserves the exact black-and-white encoder, clean image box, and existing QR actions', async () => {
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<GalleryUploadAccessCard meta={meta} onToggleOpen={vi.fn()} appearance="espresso-glass" />);

    const qr = await screen.findByRole('img', { name: 'Photo & Video Sharing QR code' });
    expect(mocks.qrToDataUrl).toHaveBeenCalledTimes(1);
    expect(mocks.qrToDataUrl).toHaveBeenCalledWith(
      expect.any(String),
      { width: 512, margin: 2, color: { dark: '#1D1D1F', light: '#FFFFFF' } },
    );
    expect(qr).toHaveAttribute('src', 'data:image/png;base64,qr-code');
    expect(qr).toHaveClass('w-40', 'h-40', 'sm:w-44', 'sm:h-44', 'rounded-lg', 'border', 'border-border');
    expect(qr).not.toHaveAttribute('style');
    expect(qr.className).not.toMatch(/opacity|gradient|blur|shadow|animate|filter|mix-blend/);
    expect(qr.parentElement).toHaveClass(managementStyles.sharingAccessQr);
    expect(qr.parentElement?.children).toHaveLength(1);

    const publicLink = screen.getByDisplayValue(/weddingwaitress\.com\.au\/gallery\//) as HTMLInputElement;
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(publicLink.value));

    fireEvent.click(screen.getByRole('button', { name: 'Open sharing page' }));
    expect(open).toHaveBeenCalledWith(publicLink.value, '_blank', 'noopener,noreferrer');

    fireEvent.click(screen.getByRole('button', { name: 'Download QR code' }));
    await waitFor(() => expect(anchorClick).toHaveBeenCalledTimes(1));

    if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
    else delete (navigator as Navigator & { clipboard?: Clipboard }).clipboard;
  });
  it('groups signed audio/video recordings below library downloads without mixing counts or retaining a duplicate toolbar action',async()=>{
    const recordings=[{...item,id:'voice',kind:'audio',source_category:'guestbook_recording',is_guestbook:true},{...item,id:'guest-video',kind:'video',source_category:'guestbook_recording',is_guestbook:true},{...item,id:'processing-voice',kind:'audio',source_category:'guestbook_recording',is_guestbook:true,signed_url:null}];
    mocks.gallery.mockReturnValue({...mocks.gallery(),items:[item,{...item,id:'library-video',kind:'video'},{...item,id:'booth-strip',source_category:'photo_booth',is_photo_booth:true,is_photo_booth_strip:true},...recordings]});
    renderPage();await screen.findByRole('heading',{name:'Download as ZIP'});
    const panel=screen.getByRole('heading',{name:'Download as ZIP'}).closest('[data-appearance="espresso-glass"]') as HTMLElement;
    expect(within(panel).getAllByRole('button').map(b=>b.textContent?.replace(/\s+/g,' ').trim())).toEqual(['Download All3','Download Photos Only2','Download Videos Only1']);
    const messages=screen.getByRole('heading',{name:/Guestbook Messages/}).closest('[data-appearance="espresso-glass"]') as HTMLElement;
    expect(within(messages).getByRole('button',{name:'Download All Guestbook Messages'})).toBeInTheDocument();
    expect(within(messages).queryByRole('button',{name:'Export CSV'})).toBeNull();
  });
});

it('removes the legacy private Video Wishes panel without removing Guestbook Messages',async()=>{render(<MemoryRouter><GalleryUploadFeaturePage/></MemoryRouter>);expect(await screen.findByRole('heading',{name:/^Guestbook Messages/})).toBeVisible();expect(screen.queryByRole('heading',{name:'Video Wishes',exact:true})).toBeNull();});
