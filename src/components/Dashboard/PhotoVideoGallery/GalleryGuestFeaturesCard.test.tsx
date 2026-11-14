import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';
import { GalleryGuestFeaturesCard } from './GalleryGuestFeaturesCard';

afterEach(cleanup);
it.each([[true, true], [false, false]])('shows a working guestbook switch for persisted settings (%s, %s)', async (text, recordings) => {
  const toggle = vi.fn();
  render(<MemoryRouter><GalleryGuestFeaturesCard
    meta={{ guestbook_text_enabled: text, voice_guestbook_enabled: recordings } as GalleryMeta}
    onToggleUpload={toggle} onToggleGalleryView={toggle} onToggleGuestbook={toggle}
    onTogglePhotoBooth={toggle} onToggleSlideshow={toggle}
  /></MemoryRouter>);
  expect(screen.queryByText('Partially on')).not.toBeInTheDocument();
  expect(screen.getByRole('switch',{name:'Digital Guestbook'})).toHaveAttribute('aria-checked',String(text || recordings));
  expect(screen.getAllByRole('switch')).toHaveLength(5);
  expect(toggle).not.toHaveBeenCalled();
  for (const [index, control] of screen.getAllByRole('switch').entries()) {
    fireEvent.click(control);
    await waitFor(() => expect(toggle).toHaveBeenCalledTimes(index + 1));
  }
});
