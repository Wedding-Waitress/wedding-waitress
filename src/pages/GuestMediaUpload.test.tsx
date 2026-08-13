import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { UploadProgress } from '@/hooks/useGuestMediaUpload';
import type { ValidationResult } from '@/lib/mediaValidation';
import publicUploadStyles from './guestMediaUpload.module.css';
import { GuestMediaUpload } from './GuestMediaUpload';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  uploadFiles: vi.fn(),
  reset: vi.fn(),
  validateFile: vi.fn(),
  uploadState: {
    progress: [] as UploadProgress[],
    uploading: false,
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: mocks.rpc },
}));

vi.mock('@/hooks/useGuestMediaUpload', () => ({
  useGuestMediaUpload: () => ({
    uploadFiles: mocks.uploadFiles,
    progress: mocks.uploadState.progress,
    uploading: mocks.uploadState.uploading,
    reset: mocks.reset,
  }),
}));

vi.mock('@/lib/mediaValidation', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/mediaValidation')>();
  return { ...actual, validateFile: mocks.validateFile };
});

vi.mock('@/components/SEO/SeoHead', () => ({ SeoHead: () => null }));
vi.mock('@/components/Dashboard/PhotoVideoGallery/GuestBrowseGallery', () => ({
  GuestBrowseGallery: () => <div data-testid="guest-gallery" />,
}));
vi.mock('@/components/Dashboard/PhotoVideoGallery/GuestGuestbookTab', () => ({
  GuestGuestbookTab: () => <div data-testid="guestbook" />,
}));
vi.mock('@/components/Dashboard/PhotoVideoGallery/GalleryFooterLogo', () => ({
  GalleryFooterLogo: ({ className = '', tone = 'white' }: { className?: string; tone?: string }) => (
    <img alt="Wedding Waitress" className={className} data-logo-tone={tone} />
  ),
}));

const gallery = {
  gallery_id: 'gallery-1',
  event_id: 'event-1',
  event_name: "Jason & Linda's Wedding",
  event_date: '2026-12-20',
  is_open: true,
  partner1_name: 'Jason',
  partner2_name: 'Linda',
  max_photos: 500,
  max_videos: 50,
  max_video_bytes: 600 * 1024 * 1024,
  max_video_duration_sec: 180,
  max_photo_bytes: 25 * 1024 * 1024,
  allowed_photo_mimes: ['image/jpeg', 'image/png', 'image/webp'],
  allowed_video_mimes: ['video/mp4', 'video/quicktime'],
  gallery_title: null,
  welcome_message: null,
  show_event_date: true,
  password_required: false,
  theme_color: '#967A59',
  background_style: 'cream',
  cover_image_url: null,
  logo_image_url: null,
  show_branding: true,
  video_guestbook_enabled: true,
  guest_upload_enabled: true,
  gallery_view_enabled: true,
  guestbook_text_enabled: true,
  photo_booth_enabled: true,
};

const usage = {
  photos_used: 2,
  videos_used: 1,
  bytes_used: 1024,
  max_photos: 500,
  max_videos: 50,
  max_total_bytes: 10 * 1024 * 1024 * 1024,
};

const validated = (file: File): ValidationResult => ({
  file,
  fileName: file.name,
  kind: 'photo',
  mime: file.type,
  mimeInferred: false,
  size: file.size,
  duration: null,
  durationUnknown: false,
  ok: true,
});

const renderPage = () => render(
  <MemoryRouter initialEntries={['/gallery/public-token']}>
    <Routes>
      <Route path="/gallery/:token" element={<GuestMediaUpload />} />
    </Routes>
  </MemoryRouter>,
);

async function chooseMedia(container: HTMLElement, files: File[]) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  expect(input).toBeInTheDocument();
  const validationCallsBeforeSelection = mocks.validateFile.mock.calls.length;
  fireEvent.change(input, { target: { files } });
  await waitFor(() => expect(mocks.validateFile).toHaveBeenCalledTimes(validationCallsBeforeSelection + files.length));
  await screen.findByText(files[files.length - 1].name);
}

describe('guest-facing Photo & Video Sharing Upload experience', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.rpc.mockReset();
    mocks.uploadFiles.mockReset().mockResolvedValue(undefined);
    mocks.reset.mockReset();
    mocks.validateFile.mockReset().mockImplementation(async (file: File, _limits: unknown, onStage?: (stage: string) => void) => {
      onStage?.('ready');
      return validated(file);
    });
    mocks.uploadState.progress = [];
    mocks.uploadState.uploading = false;
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'get_event_media_gallery_public') return { data: [gallery], error: null };
      if (name === 'get_event_media_gallery_usage_public') return { data: [usage], error: null };
      return { data: null, error: null };
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps the approved hero and compact four-tab geometry while scoping the new glass form', async () => {
    const { container } = renderPage();

    expect(await screen.findByRole('heading', { name: gallery.event_name, level: 1 })).toHaveClass('text-4xl', 'sm:text-6xl');
    expect(screen.getByRole('img', { name: 'Create and Share the Memories' })).toHaveClass(
      'w-full',
      'h-full',
      'object-contain',
    );
    expect(screen.getByText('Help us capture every memory from today')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Photos & Videos' })).toHaveClass('mt-5', 'h-14', 'rounded-full');
    expect(screen.getByRole('button', { name: 'Scroll to explore' })).toBeInTheDocument();
    expect(container.querySelector('#gallery-explore')).toHaveStyle({ backgroundColor: '#000000' });

    const navigation = container.querySelector('[data-public-upload-navigation]');
    expect(navigation).toHaveClass(publicUploadStyles.navigationShell, 'flex-nowrap', 'w-full', 'overflow-hidden');
    const tabNames = ['Upload', 'Gallery', 'Guestbook', 'Photo Booth'];
    tabNames.forEach(name => expect(within(navigation as HTMLElement).getByRole('button', { name })).toBeVisible());
    const activeTab = within(navigation as HTMLElement).getByRole('button', { name: 'Upload' });
    expect(activeTab).toHaveAttribute('aria-current', 'page');
    expect(activeTab).toHaveClass('min-w-0', 'min-h-[56px]', publicUploadStyles.navigationTabActive);

    const panel = container.querySelector('[data-public-upload-surface="form"]');
    expect(panel).toHaveClass(publicUploadStyles.uploadPanel);
    expect(panel?.tagName).toBe('SECTION');
    expect(panel).not.toHaveClass('ww-box', 'bg-white', 'text-foreground');
    expect(screen.getByRole('button', { name: 'Choose Photos or Videos' })).toHaveClass(publicUploadStyles.secondaryAction);
    expect(screen.getByRole('button', { name: 'Share Photos or Videos' })).toBeDisabled();
    expect(screen.queryByText('Choose files')).not.toBeInTheDocument();

    const album = screen.getByLabelText(/Album/) as HTMLSelectElement;
    expect(album).toHaveValue('Other');
    expect(within(album).getAllByRole('option').map(option => option.textContent)).toEqual(['Ceremony', 'Reception', 'Other']);
  });

  it('uses singular and plural photo-or-video wording and preserves album submission and removal', async () => {
    const { container } = renderPage();
    await screen.findByRole('heading', { name: gallery.event_name });
    fireEvent.change(screen.getByLabelText(/Your full name/), { target: { value: 'Ken Wilson' } });
    fireEvent.change(screen.getByLabelText(/Album/), { target: { value: 'Reception' } });

    const longName = 'a-very-long-mobile-wedding-memory-filename-that-must-not-overflow.jpg';
    await chooseMedia(container, [new File(['one'], longName, { type: 'image/jpeg' })]);
    expect(screen.getByRole('button', { name: 'Share 1 Photo or Video' })).toBeEnabled();
    expect(screen.getByText(longName)).toHaveClass('truncate', publicUploadStyles.fileName);
    expect(screen.getByRole('button', { name: `Remove ${longName}` })).toHaveClass(publicUploadStyles.removeControl);

    fireEvent.click(screen.getByRole('button', { name: 'Share 1 Photo or Video' }));
    await waitFor(() => expect(mocks.uploadFiles).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ fileName: longName, ok: true })]),
      expect.objectContaining({ token: 'public-token', uploaderName: 'Ken Wilson', album: 'Reception' }),
    ));

    const more = [2, 3, 4].map(n => new File([String(n)], `memory-${n}.jpg`, { type: 'image/jpeg' }));
    await chooseMedia(container, more);
    expect(screen.getByRole('button', { name: 'Share 4 Photos or Videos' })).toBeEnabled();
    expect(screen.queryByText(/Share 4 files/i)).not.toBeInTheDocument();
  });

  it('uses the shared green for each calculated progress fill and retains the existing track', async () => {
    mocks.uploadState.uploading = true;
    mocks.uploadState.progress = [{ fileName: 'uploading.jpg', status: 'uploading', percent: 64 }];
    const { container } = renderPage();
    await screen.findByRole('heading', { name: gallery.event_name });
    await chooseMedia(container, [new File(['photo'], 'uploading.jpg', { type: 'image/jpeg' })]);

    expect(screen.getByRole('button', { name: 'Uploading…' })).toBeDisabled();
    const progressbar = screen.getByRole('progressbar', { name: 'Uploading uploading.jpg' });
    expect(progressbar).toHaveClass(publicUploadStyles.progressFill);
    expect(progressbar).toHaveStyle({ width: '64%' });
    expect(progressbar).toHaveAttribute('aria-valuenow', '64');
    expect(progressbar.parentElement).toHaveClass('h-1.5', 'bg-muted', 'overflow-hidden');
  });

  it('renders the successful Upload confirmation as dark glass with preserved dynamic content and actions', async () => {
    sessionStorage.setItem('gallery-uploader-name:public-token', 'Ken Wilson');
    mocks.uploadState.progress = [1, 2, 3, 4].map(n => ({
      fileName: `memory-${n}.jpg`,
      status: 'done' as const,
      percent: 100,
    }));

    const { container } = renderPage();
    expect(await screen.findByRole('heading', { name: 'Thank you, Ken!' })).toHaveClass(publicUploadStyles.successHeading);
    const panel = container.querySelector('[data-public-upload-surface="success"]');
    expect(panel).toHaveClass(publicUploadStyles.successPanel);
    expect(screen.getByText((_, element) => (
      element?.tagName === 'SPAN' && element.textContent === '4 photos or videos uploaded successfully'
    ))).toBeInTheDocument();
    expect(screen.getByText(/with Jason & Linda/i)).toBeInTheDocument();
    expect(screen.getByText(/With love from Jason & Linda/i)).toHaveClass(publicUploadStyles.successLove);

    const shareMore = screen.getByRole('button', { name: 'Share More Photos or Videos' });
    expect(shareMore).toHaveClass(publicUploadStyles.successPrimaryAction);
    expect(screen.getByRole('button', { name: 'Back to start' })).toHaveClass(publicUploadStyles.successSecondaryAction);
    expect(screen.getByRole('img', { name: 'Wedding Waitress' })).toHaveAttribute('data-logo-tone', 'brown');

    fireEvent.click(shareMore);
    await waitFor(() => expect(container.querySelector('[data-public-upload-surface="form"]')).toBeInTheDocument());
    expect(mocks.reset).toHaveBeenCalledTimes(1);
  });

  it('defines espresso surfaces, accessible interaction modes and reduced-motion-safe progress without changing global styles', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src/pages/guestMediaUpload.module.css'), 'utf8');
    const page = fs.readFileSync(path.join(process.cwd(), 'src/pages/GuestMediaUpload.tsx'), 'utf8');

    expect(css).toMatch(/\.uploadPanel\.uploadPanel,[\s\S]*\.successPanel\.successPanel/);
    expect(css).toContain('border: 1px solid rgba(201, 151, 93, 0.38) !important');
    expect(css).toContain('linear-gradient(180deg, rgba(101, 57, 40, 0.72) 0%, rgba(42, 23, 17, 0.76) 100%)');
    expect(css).toMatch(/\.progressFill[\s\S]*background-color:\s*#22c55e\s*!important/);
    expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\)[\s\S]*\.secondaryAction:hover[\s\S]*\.primaryAction:hover/);
    expect(css).toMatch(/@media \(hover: none\), \(pointer: coarse\)[\s\S]*\.navigationTab:active/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.progressFill[\s\S]*transition:\s*none\s*!important/);
    expect(page).toContain("const DEFAULT_HERO_BG = '/default-hero-bg.png'");
    expect(page).toContain('w-[80vw] h-[80vw] sm:w-[320px] sm:h-[320px] md:w-[400px] md:h-[400px] lg:w-[460px] lg:h-[460px]');
    expect(page).toContain('className="mt-5 text-4xl sm:text-6xl font-semibold leading-[1.1] tracking-tight text-white"');
    expect(page).toContain('className="lv-premium-shade mt-5 h-14 px-8 rounded-full text-white text-base font-semibold shadow-xl"');
    expect(page).toContain('<div id="gallery-explore" className="px-4 py-10 scroll-mt-4 min-h-screen" style={{ backgroundColor: \'#000000\' }}>');
    expect(page).toContain("reasonText: 'Photo or video could not be loaded from device/iCloud'");
    expect(page).not.toContain("reasonText: 'File could not be loaded from device/iCloud'");
  });
});
