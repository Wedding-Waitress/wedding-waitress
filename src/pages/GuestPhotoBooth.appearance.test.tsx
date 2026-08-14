import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import publicUploadStyles from './guestMediaUpload.module.css';
import { GuestPhotoBooth } from './GuestPhotoBooth';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  upload: vi.fn(),
  getUserMedia: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: mocks.rpc },
}));

vi.mock('@/hooks/usePhotoBoothUpload', () => ({
  usePhotoBoothUpload: () => ({ upload: mocks.upload, uploading: false }),
}));

const gallery = {
  gallery_id: 'g1',
  event_id: 'e1',
  event_name: 'Test Wedding',
  event_date: '2026-12-20',
  is_open: true,
  partner1_name: 'Jason',
  partner2_name: 'Linda',
  password_required: false,
  theme_color: '#967A59',
  background_style: 'cream',
  cover_image_url: null,
  logo_image_url: null,
  show_branding: true,
  photo_booth_enabled: true,
  photo_booth_mode: 'strip',
  gallery_title: null,
  photo_booth_single_bottom_text: null,
  photo_booth_single_logo_url: null,
  photo_booth_single_template_url: null,
  photo_booth_strip_bottom_text: null,
  photo_booth_strip_logo_url: null,
  photo_booth_strip_template_url: null,
  photo_booth_strip_style: null,
};

const renderBooth = () => render(
  <MemoryRouter>
    <GuestPhotoBooth tokenProp="public-token" embedded />
  </MemoryRouter>,
);

describe('public Photo Booth espresso-glass form', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.rpc.mockReset().mockResolvedValue({ data: [gallery], error: null });
    mocks.upload.mockReset().mockResolvedValue(true);
    mocks.getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: mocks.getUserMedia },
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('styles the live form, camera, four slots, and actions without black control borders', async () => {
    const { container } = renderBooth();

    const name = await screen.findByLabelText(/Your Full Name/i);
    await waitFor(() => expect(mocks.getUserMedia).toHaveBeenCalledTimes(1));
    const panel = container.querySelector('[data-public-photo-booth-surface="form"]');
    expect(panel).toHaveClass(publicUploadStyles.uploadPanel, publicUploadStyles.photoBoothPanel);
    expect(name).toHaveClass(publicUploadStyles.field);

    const video = container.querySelector('video');
    expect(video?.parentElement).toHaveClass(publicUploadStyles.photoBoothCameraFrame);

    const slots = [...container.querySelectorAll('[data-photo-booth-slot]')];
    expect(slots).toHaveLength(4);
    slots.forEach(slot => {
      expect(slot).toHaveClass(publicUploadStyles.photoBoothSlot, 'w-12', 'h-16');
      expect(slot).not.toHaveClass('border-[#472c1d]');
    });

    const start = screen.getByRole('button', { name: 'Start Photo Strip' });
    const flip = screen.getByRole('button', { name: 'Flip' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(start).toHaveClass(publicUploadStyles.primaryAction);
    expect(flip).toHaveClass(publicUploadStyles.secondaryAction, publicUploadStyles.photoBoothNoBlackBorder);
    expect(cancel).toHaveClass(publicUploadStyles.guestbookDangerAction, publicUploadStyles.photoBoothNoBlackBorder);
    expect(flip).not.toHaveClass('border-[#472c1d]');
    expect(cancel).not.toHaveClass('border-[#472c1d]');

    fireEvent.change(name, { target: { value: 'Mobile Guest' } });
    fireEvent.click(start);
    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(slots[0]).toHaveClass(publicUploadStyles.photoBoothSlotActive);
  });

  it('keeps camera-permission errors readable on the scoped dark warning surface', async () => {
    mocks.getUserMedia.mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    renderBooth();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Camera access is blocked');
    expect(alert).toHaveClass(publicUploadStyles.photoBoothWarning);
  });
});
