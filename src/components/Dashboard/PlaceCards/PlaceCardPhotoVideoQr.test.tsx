import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PlaceCardPhotoVideoQrPanel } from './PlaceCardPhotoVideoQrPanel';
import { PlaceCardPreview } from './PlaceCardPreview';
import type { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { MemoryRouter } from 'react-router-dom';

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
});

const settings = {
  event_id: 'event-1', user_id: 'user-1', font_family: 'Inter', font_color: '#000000',
  background_color: '#ffffff', background_image_type: 'none', mass_message: '', individual_messages: {},
  guest_font_family: 'Great Vibes', info_font_family: 'Inter', guest_name_bold: false,
  guest_name_italic: false, guest_name_underline: false, guest_name_font_size: 30, info_font_size: 16,
  name_spacing: 4, info_bold: false, info_italic: false, info_underline: false, info_font_color: '#000000',
  photo_video_qr_enabled: true, photo_video_qr_x: 50, photo_video_qr_y: 50, photo_video_qr_size: 22,
} as PlaceCardSettings;

const qr = {
  galleryId: 'gallery-1', token: 'permanent-token',
  url: 'https://weddingwaitress.com.au/gallery/permanent-token',
  dataUrl: 'data:image/png;base64,qr', acceptingUploads: true,
};

describe('Name Place Cards Photo & Video Sharing QR', () => {
  it('shows the authoritative sharing identity and removes the QR without changing the token', () => {
    const save = vi.fn().mockResolvedValue(true);
    render(<MemoryRouter><PlaceCardPhotoVideoQrPanel eventName="Jason & Linda's Wedding" qr={qr} loading={false} error={null} settings={settings} onSettingsChange={save} /></MemoryRouter>);

    expect((screen.getByDisplayValue(qr.url) as HTMLInputElement).readOnly).toBe(true);
    expect(screen.getByText("Jason & Linda's Wedding")).toBeInTheDocument();
    expect(screen.getByText(/exact same permanent QR code/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(save).toHaveBeenCalledWith({ photo_video_qr_enabled: false });
  });

  it('renders the same QR on the back of every populated preview and print card', () => {
    render(
      <PlaceCardPreview
        settings={settings}
        guests={[{ id: 'guest-1', first_name: 'A', last_name: 'Guest', assigned: true, table_no: 1, seat_no: 1 } as any]}
        event={{ id: 'event-1', name: 'Wedding' }}
        selectedTable={{ name: 'One', table_no: 1 }}
        photoVideoQrDataUrl={qr.dataUrl}
      />,
    );
    expect(screen.getAllByRole('img', { name: 'Photo & Video Sharing QR code' })).toHaveLength(2);
  });
});
