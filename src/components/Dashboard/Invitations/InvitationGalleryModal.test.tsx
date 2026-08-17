import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let admin = false;
const images = [
  { id: 'one', name: 'Blue Gold Floral Frame', category: 'Floral', categories: ['Floral'], image_url: '/one.jpg', thumbnail_url: null, sort_order: 1, created_at: '' },
  { id: 'two', name: 'Ivory Minimal Arch', category: 'Wedding', categories: ['Wedding'], image_url: '/two.jpg', thumbnail_url: null, sort_order: 2, created_at: '' },
];

vi.mock('@/hooks/useIsAdmin', () => ({ useIsAdmin: () => ({ isAdmin: admin, loading: false }) }));
vi.mock('@/hooks/useInvitationGallery', () => ({
  useInvitationGallery: () => ({
    images,
    categoriesWithCounts: [{ name: 'Floral', count: 1 }, { name: 'Wedding', count: 1 }],
    loading: false,
    error: null,
    removeImageFromGallery: vi.fn(),
    refetch: vi.fn(),
  }),
}));

import { InvitationGalleryModal } from './InvitationGalleryModal';
import { getInvitationDesignColour } from './invitationTemplateFilters';

afterEach(() => { admin = false; cleanup(); });

describe('Invitation Template Library', () => {
  it('renders the live catalogue controls, dynamic total and selection flow', () => {
    const onSelectImage = vi.fn();
    const onOpenChange = vi.fn();
    render(<InvitationGalleryModal open onOpenChange={onOpenChange} onSelectImage={onSelectImage} />);

    expect(screen.getByRole('heading', { name: 'Template Library' })).toBeVisible();
    expect(screen.getByText('2 Total Designs')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Filter templates by category' })).toHaveTextContent('All categories (2)');
    expect(screen.getByRole('combobox', { name: 'Filter templates by colour' })).toHaveTextContent('All colours (2)');
    expect(screen.queryByRole('button', { name: 'Admin Upload' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search templates by name' }), { target: { value: 'Ivory' } });
    expect(screen.getByText('Ivory Minimal Arch')).toBeVisible();
    expect(screen.queryByText('Blue Gold Floral Frame')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(onSelectImage).toHaveBeenCalledWith('/two.jpg');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows uploader, categorise and delete controls only to the authorised admin', () => {
    admin = true;
    render(<InvitationGalleryModal open onOpenChange={vi.fn()} onSelectImage={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Admin Upload' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Categorize' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
  });

  it('retains responsive eight-column and reduced-motion rules', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src/components/Dashboard/Invitations/InvitationGalleryModal.module.css'), 'utf8');
    expect(css).toContain('grid-template-columns: repeat(8');
    expect(css).toContain('@media (max-width: 699px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('derives useful colour groups without changing the invitation schema', () => {
    expect(getInvitationDesignColour(images[0])).toBe('Multicolour');
    expect(getInvitationDesignColour(images[1])).toBe('Cream');
    expect(getInvitationDesignColour({ name: 'Minimal Line Art' })).toBe('Neutral');
  });
});
