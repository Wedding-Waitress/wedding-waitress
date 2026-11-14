import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';
import { GalleryGuestFeaturesCard } from './GalleryGuestFeaturesCard';

afterEach(cleanup);
it.each([[true, false], [false, true], [false, false]])('keeps guestbook available without a switch regardless of legacy settings (%s, %s)', async (text, recordings) => {
  const toggle = vi.fn();
  render(<MemoryRouter><GalleryGuestFeaturesCard
    meta={{ guestbook_text_enabled: text, voice_guestbook_enabled: recordings } as GalleryMeta}
    onToggleUpload={toggle} onToggleGalleryView={toggle}
    onTogglePhotoBooth={toggle} onToggleSlideshow={toggle}
  /></MemoryRouter>);
  expect(screen.queryByText('Partially on')).not.toBeInTheDocument();
  expect(screen.getByText(/Always available: guests/)).toBeVisible();
  expect(screen.getAllByRole('switch')).toHaveLength(4);
  expect(toggle).not.toHaveBeenCalled();
  for (const [index, control] of screen.getAllByRole('switch').entries()) {
    fireEvent.click(control);
    await waitFor(() => expect(toggle).toHaveBeenCalledTimes(index + 1));
  }
});
