import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let admin = false;
const images = [
  { id: 'one', name: 'Blue Gold Landscape', category: 'Elegant', categories: ['Elegant'], image_url: '/one.jpg', thumbnail_url: null, sort_order: 1, created_at: '' },
  { id: 'two', name: 'Ivory Minimal Place Card', category: 'Modern', categories: ['Modern'], image_url: '/two.jpg', thumbnail_url: null, sort_order: 2, created_at: '' },
];
vi.mock('@/hooks/useIsAdmin', () => ({ useIsAdmin: () => ({ isAdmin: admin, loading: false }) }));
vi.mock('@/hooks/usePlaceCardGallery', () => ({ usePlaceCardGallery: () => ({ images, categoriesWithCounts: [{ name: 'Elegant', count: 1 }, { name: 'Modern', count: 1 }], loading: false, error: null, removeImageFromGallery: vi.fn(), refetch: vi.fn() }) }));

import { PlaceCardGalleryModal } from './PlaceCardGalleryModal';
import { getPlaceCardDesignColour } from './placeCardTemplateFilters';

afterEach(() => { admin = false; cleanup(); });

describe('Name Place Cards Template Library', () => {
  it('renders dynamic controls and applies a selected landscape template', () => {
    const onSelectImage = vi.fn(); const onOpenChange = vi.fn();
    render(<PlaceCardGalleryModal open onOpenChange={onOpenChange} onSelectImage={onSelectImage} />);
    expect(screen.getByRole('heading', { name: 'Template Library' })).toBeVisible();
    expect(screen.getByText('2 Total Designs')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Filter templates by category' })).toHaveTextContent('All Categories (2)');
    expect(screen.getByRole('combobox', { name: 'Filter templates by colour' })).toHaveTextContent('All Colours (2)');
    expect(screen.queryByRole('button', { name: 'Admin Upload' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search templates by name' }), { target: { value: 'Ivory' } });
    expect(screen.queryByText('Blue Gold Landscape')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(onSelectImage).toHaveBeenCalledWith('/two.jpg');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows uploader, categorise and delete controls only for admin', () => {
    admin = true;
    render(<PlaceCardGalleryModal open onOpenChange={vi.fn()} onSelectImage={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Admin Upload' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Categorize' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Admin Upload' }));
    expect(screen.getByRole('button', { name: 'Choose images' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Category for this upload' })).toBeVisible();
  });

  it('retains landscape, desktop, tablet, mobile and reduced-motion rules', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.module.css'), 'utf8');
    expect(css).toContain('aspect-ratio:7/5');
    expect(css).toContain('repeat(8');
    expect(css).toContain('@media(max-width:699px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
  });

  it('derives colour groups without changing stored Place Card data', () => {
    expect(getPlaceCardDesignColour(images[0])).toBe('Multicolour');
    expect(getPlaceCardDesignColour(images[1])).toBe('Cream');
    expect(getPlaceCardDesignColour({ name: 'Minimal Line Art' })).toBe('Neutral');
  });
});
