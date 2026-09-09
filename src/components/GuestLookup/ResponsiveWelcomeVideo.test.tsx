import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ResponsiveWelcomeVideo } from './ResponsiveWelcomeVideo';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it.each([[360, 640], [640, 360]])('uses the video proportions %s by %s', async (width, height) => {
  vi.stubGlobal('Image', class {
    naturalWidth = width; naturalHeight = height; onload: null | (() => void) = null;
    set src(value: string) { queueMicrotask(() => this.onload?.()); }
  });
  render(<ResponsiveWelcomeVideo src="https://iframe.cloudflarestream.com/test-video" />);
  await waitFor(() => expect(parseFloat(screen.getByTitle('Welcome Video').parentElement?.style.aspectRatio ?? '0')).toBeCloseTo(width / height));
});
it('keeps the player usable when the thumbnail cannot be loaded', () => {
  vi.stubGlobal('Image', class { set src(value: string) {} });
  render(<ResponsiveWelcomeVideo src="https://iframe.cloudflarestream.com/test-video" />);
  expect(screen.getByTitle('Welcome Video')).toBeInTheDocument();
});
