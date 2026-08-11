import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * First-load initialisation sequence for the public guest Photo Booth.
 *
 * Regression: the camera used to be initialised before the gallery/token/Photo Booth
 * configuration had loaded, which produced a first-open failure that only cleared
 * after a full page refresh.
 */

let rpcResolves: Array<(v: any) => void>;
const rpc = vi.fn(() => new Promise(res => { rpcResolves.push(res); }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: any[]) => rpc(...(args as [])) },
}));

const getUserMedia = vi.fn();

const GALLERY_ROW = {
  gallery_id: 'g1',
  event_id: 'e1',
  event_name: 'Test Wedding',
  event_date: '2026-01-01',
  is_open: true,
  partner1_name: 'A',
  partner2_name: 'B',
  password_required: false,
  theme_color: null,
  background_style: 'light',
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

describe('GuestPhotoBooth first-load initialisation', () => {
  beforeEach(() => {
    rpcResolves = [];
    rpc.mockClear();
    getUserMedia.mockReset();
    getUserMedia.mockResolvedValue({ getTracks: () => [] });
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    (window.HTMLMediaElement.prototype as any).play = vi.fn().mockResolvedValue(undefined);
  });

  it('waits for the gallery config before touching the camera, then initialises exactly once', async () => {
    const { GuestPhotoBooth } = await import('@/pages/GuestPhotoBooth');

    render(
      <MemoryRouter>
        <GuestPhotoBooth tokenProp="tok-123" embedded />
      </MemoryRouter>,
    );

    // While loading: friendly preparing state, no error, and no camera access yet.
    expect(screen.getByText('Opening Photo Booth…')).toBeTruthy();
    expect(getUserMedia).not.toHaveBeenCalled();

    rpcResolves[0]({ data: [GALLERY_ROW], error: null });

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Opening Photo Booth…')).toBeNull();
  });

  it('shows a retry action after two failed startup attempts', async () => {
    const { GuestPhotoBooth } = await import('@/pages/GuestPhotoBooth');

    render(
      <MemoryRouter>
        <GuestPhotoBooth tokenProp="tok-123" embedded />
      </MemoryRouter>,
    );

    rpcResolves[0]({ data: null, error: { message: 'network failure' } });
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2));
    rpcResolves[1]({ data: null, error: { message: 'network failure' } });

    await waitFor(() => expect(screen.getByText('We couldn’t open the Photo Booth')).toBeTruthy());
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('automatically retries once and succeeds after a temporary failure', async () => {
    const { GuestPhotoBooth } = await import('@/pages/GuestPhotoBooth');

    render(
      <MemoryRouter>
        <GuestPhotoBooth tokenProp="tok-123" embedded />
      </MemoryRouter>,
    );

    rpcResolves[0]({ data: null, error: { message: 'network failure' } });
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2));
    rpcResolves[1]({ data: [GALLERY_ROW], error: null });

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Opening Photo Booth…')).toBeNull();
    expect(screen.queryByText('We couldn’t open the Photo Booth')).toBeNull();
  });
});
