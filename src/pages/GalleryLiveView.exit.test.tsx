import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GalleryLiveView, {
  exitLiveSlideshow,
  LIVE_SLIDESHOW_MANAGEMENT_PATH,
} from './GalleryLiveView';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  invoke: vi.fn(),
  close: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mocks.rpc,
    functions: { invoke: mocks.invoke },
    channel: () => ({
      on() { return this; },
      subscribe() { return this; },
    }),
    removeChannel: vi.fn(),
  },
}));

describe('Live Slideshow exit behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.rpc.mockResolvedValue({
      data: [{
        gallery_id: 'gallery-1',
        event_id: 'event-1',
        event_name: "Jason & Linda's Wedding",
        event_date: '2026-12-20',
        show_event_date: true,
        slideshow_enabled: true,
        show_branding: true,
      }],
      error: null,
    });
    mocks.invoke.mockResolvedValue({ data: { items: [] }, error: null });
    mocks.close.mockReset();
    vi.spyOn(window, 'close').mockImplementation(mocks.close);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function renderSlideshow() {
    return render(
      <MemoryRouter initialEntries={['/gallery/token/slideshow']}>
        <Routes>
          <Route path="/gallery/:token/slideshow" element={<GalleryLiveView />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('provides one discreet accessible close target that attempts to close the launched tab', () => {
    renderSlideshow();

    const close = screen.getByRole('button', { name: 'Exit live slideshow' });
    expect(close).toHaveClass('fixed', 'bottom-1.5', 'right-1.5', 'h-11', 'w-11', 'bg-transparent');
    expect(close).toHaveTextContent('×');

    fireEvent.click(close);
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it('makes Escape trigger the same close attempt', () => {
    renderSlideshow();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it('exits fullscreen before closing and does not navigate when the tab closes', async () => {
    const order: string[] = [];
    const exitFullscreen = vi.fn(async () => { order.push('fullscreen'); });
    const replace = vi.fn();
    const targetWindow = {
      close: vi.fn(() => { order.push('close'); targetWindow.closed = true; }),
      closed: false,
      setTimeout: window.setTimeout.bind(window),
      location: { replace },
    };

    await exitLiveSlideshow(targetWindow as any, {
      fullscreenElement: {} as Element,
      exitFullscreen,
    });
    await vi.runAllTimersAsync();

    expect(order).toEqual(['fullscreen', 'close']);
    expect(replace).not.toHaveBeenCalled();
  });

  it('returns to the organiser management route when window closing is blocked', async () => {
    const replace = vi.fn();
    const targetWindow = {
      close: vi.fn(),
      closed: false,
      setTimeout: window.setTimeout.bind(window),
      location: { replace },
    };

    await exitLiveSlideshow(targetWindow as any, {
      fullscreenElement: null,
      exitFullscreen: vi.fn(),
    });
    await vi.runAllTimersAsync();

    expect(targetWindow.close).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith(LIVE_SLIDESHOW_MANAGEMENT_PATH);
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining('/gallery/'));
  });
});
