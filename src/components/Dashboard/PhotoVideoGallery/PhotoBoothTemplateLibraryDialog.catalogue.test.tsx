import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { templates, managedTemplates } = vi.hoisted(() => ({ managedTemplates: [], templates: Array.from({ length: 96 }, (_, index) => {
  const number = String(index + 1).padStart(3, '0');
  const colour = index < 48 ? 'Blue' : 'Pink';
  return {
    id: `photo-strip-${colour.toLowerCase()}-${number}`,
    name: `${colour} ${number}`,
    category: index % 2 ? 'General' : 'Classic',
    colour,
    url: `/photobooth-templates/originals/${colour.toLowerCase()}-${number}.jpg`,
    thumbUrl: `/photobooth-templates/thumbnails/${colour.toLowerCase()}-${number}-thumb.jpg`,
    sourceFilename: `${colour} ${number}.jpg`,
  };
}) }));

vi.mock('@/lib/photoBoothBackgroundTemplates', () => ({
  PHOTO_BOOTH_BACKGROUND_TEMPLATES: templates,
  PHOTO_BOOTH_TEMPLATE_CATEGORIES: ['Classic', 'General'],
  PHOTO_BOOTH_TEMPLATE_COLOURS: ['Blue', 'Pink'],
  filterPhotoBoothTemplates: (items: typeof templates, query: string, category: string, colour: string) => items.filter((template) =>
    (!query.trim() || template.name.toLowerCase().includes(query.trim().toLowerCase()))
    && (category === 'all' || template.category === category)
    && (colour === 'all' || template.colour === colour)),
}));

vi.mock('@/hooks/useIsAdmin', () => ({ useIsAdmin: () => ({ isAdmin: false, loading: false }) }));
vi.mock('@/hooks/usePhotoBoothTemplateLibrary', () => ({
  usePhotoBoothTemplateLibrary: () => ({
    templates: managedTemplates, loading: false, error: null,
    refetch: vi.fn(), remove: vi.fn(), update: vi.fn(),
  }),
}));

import { PhotoBoothTemplateLibraryDialog } from './PhotoBoothTemplateLibraryDialog';
import managementStyles from './photoVideoSharingManagement.module.css';
import fs from 'node:fs';
import path from 'node:path';

describe('PhotoBoothTemplateLibraryDialog large catalogue', () => {
  beforeEach(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });
  afterEach(cleanup);

  it('renders lightweight lazy thumbnails in a responsive scroll area and selects the full original', () => {
    const onSelect = vi.fn();
    render(
      <PhotoBoothTemplateLibraryDialog
        open
        onOpenChange={vi.fn()}
        selectedUrl={null}
        onSelect={onSelect}
        appearance="espresso-glass"
      />,
    );

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(96);
    images.forEach((image) => {
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image).toHaveAttribute('decoding', 'async');
      expect(image).toHaveClass('aspect-[2/3]', 'object-contain');
      expect(image.getAttribute('src')).toContain('/thumbnails/');
    });
    const grid = images[0].closest('.grid');
    expect(grid).toHaveClass(managementStyles.templateLibraryGrid, 'gap-3');
    expect(grid?.parentElement).toHaveClass(managementStyles.templateLibraryScrollArea, 'overflow-y-auto');

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass(managementStyles.templateLibraryDialog, 'w-[calc(100vw-2rem)]', 'overflow-hidden');

    const css = fs.readFileSync(path.join(process.cwd(), 'src/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css'), 'utf8');
    expect(css).toContain('width: min(calc(100vw - 2rem), 110rem) !important');
    expect(css).toContain('@media (min-width: 28rem)');
    expect(css).toContain('repeat(2, minmax(0, 1fr))');
    expect(css).toContain('@media (min-width: 42rem)');
    expect(css).toContain('repeat(3, minmax(0, 1fr))');
    expect(css).toContain('@media (min-width: 56rem)');
    expect(css).toContain('repeat(4, minmax(0, 1fr))');
    expect(css).toContain('@media (min-width: 75rem)');
    expect(css).toContain('repeat(6, minmax(0, 1fr))');
    expect(css).toContain('@media (min-width: 112.5rem)');
    expect(css).toContain('repeat(8, minmax(0, 1fr))');

    fireEvent.change(screen.getByRole('textbox', { name: 'Search templates by name' }), { target: { value: 'Blue 010' } });
    expect(screen.getAllByRole('img')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Blue 010/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Template' }));
    expect(onSelect).toHaveBeenCalledWith('/photobooth-templates/originals/blue-010.jpg');
  });

  it('keeps category and colour filters available for a large imported catalogue', async () => {
    render(
      <PhotoBoothTemplateLibraryDialog open onOpenChange={vi.fn()} selectedUrl={null} onSelect={vi.fn()} appearance="espresso-glass" />,
    );
    expect(screen.getByRole('combobox', { name: 'Filter templates by category' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Filter templates by colour' })).toBeVisible();
    expect(screen.getByRole('dialog')).toHaveClass(managementStyles.templateLibraryDialog, 'w-[calc(100vw-2rem)]', 'overflow-hidden');
  });
});
