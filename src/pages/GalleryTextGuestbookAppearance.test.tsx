import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { GalleryItem, GalleryMeta } from '@/hooks/useEventMediaGallery';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';
import { GalleryTextGuestbookFeaturePage } from './GalleryTextGuestbookFeaturePage';

const mocks = vi.hoisted(() => ({
  events: vi.fn(),
  selectedEvent: vi.fn(),
  gallery: vi.fn(),
  getSession: vi.fn(),
  qrToDataUrl: vi.fn(),
  rows: [{
    id: 'text-1', uploader_name: 'Nader', message: 'Congratulations to you both.',
    moderation_status: 'approved', created_at: '2026-08-04T11:54:00Z', guestbook_seq: 1,
  }],
}));

vi.mock('@/hooks/useEvents', () => ({ useEvents: mocks.events }));
vi.mock('@/hooks/useSelectedEvent', () => ({ useSelectedEvent: mocks.selectedEvent }));
vi.mock('@/hooks/useEventMediaGallery', () => ({ useEventMediaGallery: mocks.gallery }));
vi.mock('@/components/SEO/SeoHead', () => ({ SeoHead: () => null }));
vi.mock('qrcode', () => ({ default: { toDataURL: mocks.qrToDataUrl } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: mocks.rows, error: null }) }),
      }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}));

const event = { id: 'event-1', name: "Jason & Linda's Wedding", date: '2026-12-20' };
const meta = {
  gallery_id: 'gallery-1', primary_token: 'public-token', guestbook_text_enabled: true,
  voice_guestbook_enabled: true, gallery_view_enabled: true,
} as GalleryMeta;
const recording: GalleryItem = {
  id: 'recording-1', kind: 'audio', mime_type: 'audio/webm', byte_size: 1234,
  duration_sec: 14, storage_path: 'event/recording.webm', uploader_name: 'Linda',
  caption: null, guestbook_message: 'A note with recording', uploaded_at: '2026-08-04T10:00:00Z',
  moderation_status: 'approved', album: null, is_guestbook: true, is_photo_booth: false,
  is_photo_booth_strip: false, source_category: 'guestbook_recording', signed_url: 'https://example.test/audio.webm',
};
const gallery = {
  meta, items: [recording], loading: false, error: null,
  setModeration: vi.fn(async () => undefined), setGuestbookEnabled: vi.fn(async () => undefined),
  setGuestbookShare: vi.fn(async () => undefined),
};

describe('Digital Guestbook premium appearance', () => {
  beforeEach(() => {
    mocks.events.mockReturnValue({ events: [event], loading: false });
    mocks.selectedEvent.mockReturnValue({ selectedEventId: event.id, selectedEvent: event });
    mocks.gallery.mockReturnValue(gallery);
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    mocks.qrToDataUrl.mockResolvedValue('data:image/png;base64,qr');
    HTMLElement.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => undefined) } });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('styles the real route controls, cards, toolbar and messages without changing their behavior', async () => {
    render(<MemoryRouter><GalleryTextGuestbookFeaturePage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Digital Guestbook', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Photo & Video Sharing' })).toHaveClass(managementStyles.glassAction);
    expect(screen.getByRole('button', { name: 'Preview as Guest' })).toHaveClass(managementStyles.glassAction);
    expect(screen.getByText('Selected event')).toHaveClass(managementStyles.selectedEventLabel);
    expect(screen.getByText(event.name)).toHaveClass(managementStyles.selectedEventName);
    expect(screen.getByRole('switch', { name: 'Digital Guestbook enabled' })).toBeChecked();

    for (const name of ['How the Digital Guestbook Works', 'Digital Guestbook Access']) {
      expect(screen.getByRole('heading', { name }).closest('[data-appearance="espresso-glass"]')).toHaveClass(managementStyles.glassCard);
    }
    for (const step of ['1. Open the Digital Guestbook', '2. Choose a message type', '3. Create and submit', '4. Private delivery']) {
      expect(screen.getByText(step)).toHaveClass(managementStyles.galleryViewHeading);
    }

    await screen.findByText('Congratulations to you both.');
    const messagesHeading = screen.getByRole('heading', { name: /Guestbook Messages/ });
    expect(messagesHeading).toHaveTextContent('Guestbook Messages (3)');
    const messagesPanel = messagesHeading.closest('[data-appearance="espresso-glass"]');
    expect(messagesPanel).toHaveClass(managementStyles.galleryPanel, managementStyles.guestbookMessagesPanel);
    expect(screen.getByPlaceholderText(/Search by guest name or message/)).toHaveClass(managementStyles.galleryControl);
    expect(screen.getByRole('button', { name: 'Refresh' })).toHaveClass(managementStyles.galleryControl);
    expect(screen.getByRole('button', { name: 'Select' })).toHaveClass(managementStyles.galleryControl);
    expect(screen.getByRole('button', { name: /Download All Guestbook Messages/ })).toHaveClass(managementStyles.galleryControl);
    expect(screen.getByRole('button', { name: 'Export CSV' })).toHaveClass(managementStyles.galleryViewPrimaryAction);

    const writtenTab = screen.getByRole('button', { name: 'Written Messages (2)' });
    const audioTab = screen.getByRole('button', { name: 'Audio Messages (1)' });
    expect(writtenTab).toHaveClass(managementStyles.galleryControlActive);
    expect(audioTab).toHaveClass(managementStyles.galleryControl);
    fireEvent.click(audioTab);
    expect(audioTab).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Linda').closest('li')).toHaveClass(managementStyles.guestbookMessageCard);
    expect(screen.getByRole('button', { name: 'Add to Gallery' })).toHaveClass(managementStyles.galleryControl);
    expect(screen.getByRole('button', { name: 'Download recording' })).toHaveClass(managementStyles.galleryControl);
  });

  it('keeps the QR code black-and-white with its original dimensions and direct actions', async () => {
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<MemoryRouter><GalleryTextGuestbookFeaturePage /></MemoryRouter>);

    const qr = await screen.findByRole('img', { name: 'Digital Guestbook QR code' });
    expect(mocks.qrToDataUrl).toHaveBeenCalledWith(
      expect.stringContaining('public-token'),
      { width: 512, margin: 2, color: { dark: '#1D1D1F', light: '#FFFFFF' } },
    );
    expect(qr).toHaveClass('w-40', 'h-40', 'sm:w-44', 'sm:h-44');
    expect(qr).not.toHaveAttribute('style');
    expect(qr.parentElement).toHaveClass(managementStyles.galleryViewQrFrame);

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('public-token')));
    fireEvent.click(screen.getByRole('button', { name: 'Open Digital Guestbook' }));
    expect(open).toHaveBeenCalledWith(expect.stringContaining('public-token'), '_blank', 'noopener,noreferrer');
    fireEvent.click(screen.getByRole('button', { name: 'Download QR code' }));
    expect(anchorClick).toHaveBeenCalled();
  });

  it('wires portal menus and includes focus, touch and reduced-motion states', async () => {
    render(<MemoryRouter><GalleryTextGuestbookFeaturePage /></MemoryRouter>);
    await screen.findByText('Congratulations to you both.');

    const newest = screen.getAllByRole('combobox')[0];
    fireEvent.keyDown(newest, { key: 'ArrowDown' });
    const menu = await screen.findByRole('listbox');
    expect(menu).toHaveClass(managementStyles.gallerySelectContent);
    expect(within(menu).getByRole('option', { name: 'Newest first' })).toHaveClass(managementStyles.gallerySelectItem);

    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css'),
      'utf8',
    );
    expect(css).toContain('.guestbookMessageCard');
    expect(css).toContain('.guestbookStatePanel');
    expect(css).toContain('@media (hover: none), (pointer: coarse)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
