import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isAdmin: true,
  remove: vi.fn(),
  update: vi.fn(),
  refetch: vi.fn(),
  template: {
    id: 'managed-1',
    name: 'Wedding 10',
    category: 'General',
    colour: 'Gold',
    url: 'https://cdn.example.com/originals/wedding-10.jpg',
    thumbUrl: 'https://cdn.example.com/thumbnails/wedding-10.jpg',
    sourceFilename: 'originals/wedding-10.jpg',
  },
  managedTemplates: [] as Array<{
    id: string; name: string; category: string; colour: string;
    url: string; thumbUrl: string; sourceFilename: string;
  }>,
}));

vi.mock('@/hooks/useIsAdmin', () => ({ useIsAdmin: () => ({ isAdmin: mocks.isAdmin, loading: false }) }));
vi.mock('@/hooks/usePhotoBoothTemplateLibrary', () => ({
  usePhotoBoothTemplateLibrary: () => ({
    templates: mocks.managedTemplates, loading: false, error: null,
    refetch: mocks.refetch, remove: mocks.remove, update: mocks.update,
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/photoBoothBackgroundTemplates', () => ({
  PHOTO_BOOTH_BACKGROUND_TEMPLATES: [],
  filterPhotoBoothTemplates: (items: typeof mocks.template[], query: string, category: string, colour: string) => items.filter((template) =>
    (!query.trim() || template.name.toLowerCase().includes(query.trim().toLowerCase()))
    && (category === 'all' || template.category === category)
    && (colour === 'all' || template.colour === colour)),
}));
vi.mock('./PhotoBoothTemplateAdminUploader', () => ({
  PhotoBoothTemplateAdminUploader: () => <section aria-label="Photo Booth template admin upload">Uploader</section>,
}));

import { PhotoBoothTemplateLibraryDialog } from './PhotoBoothTemplateLibraryDialog';

describe('PhotoBoothTemplateLibraryDialog owner/admin management', () => {
  beforeEach(() => {
    mocks.isAdmin = true;
    mocks.remove.mockReset();
    mocks.update.mockReset();
    mocks.refetch.mockReset();
    mocks.managedTemplates.splice(0, mocks.managedTemplates.length, mocks.template);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });
  afterEach(cleanup);

  it('keeps a clear gap between Admin Upload and the far-right close control', () => {
    render(<PhotoBoothTemplateLibraryDialog open onOpenChange={vi.fn()} selectedUrl={null} onSelect={vi.fn()} appearance="espresso-glass" />);

    const adminUpload = screen.getByRole('button', { name: 'Admin Upload' });
    const close = screen.getByRole('button', { name: 'Exit' });

    expect(adminUpload).toHaveClass('absolute', 'right-[4.5rem]', 'top-3.5');
    expect(adminUpload).not.toHaveClass('right-12');
    expect(close).toHaveClass('absolute', 'right-4', 'top-4', 'h-10', 'w-10');
  });

  it('shows the Invitation-style admin entry point and management actions only to admins', () => {
    const { unmount } = render(<PhotoBoothTemplateLibraryDialog open onOpenChange={vi.fn()} selectedUrl={null} onSelect={vi.fn()} appearance="espresso-glass" />);
    fireEvent.click(screen.getByRole('button', { name: 'Admin Upload' }));
    expect(screen.getByRole('region', { name: 'Photo Booth template admin upload' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Categorize' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'View' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Select' })).toBeVisible();
    unmount();

    mocks.isAdmin = false;
    render(<PhotoBoothTemplateLibraryDialog open onOpenChange={vi.fn()} selectedUrl={null} onSelect={vi.fn()} appearance="espresso-glass" />);
    expect(screen.queryByRole('button', { name: 'Admin Upload' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Categorize' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Select' })).toBeVisible();
  });

  it('selects the original immediately and safely clears a deleted active template', async () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<PhotoBoothTemplateLibraryDialog open onOpenChange={onOpenChange} selectedUrl={mocks.template.url} onSelect={onSelect} appearance="espresso-glass" />);

    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(onSelect).toHaveBeenCalledWith(mocks.template.url);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(mocks.template));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('updates category and colour through the persistent catalogue and exposes live filter counts', async () => {
    render(<PhotoBoothTemplateLibraryDialog open onOpenChange={vi.fn()} selectedUrl={null} onSelect={vi.fn()} appearance="espresso-glass" />);
    fireEvent.click(screen.getByRole('button', { name: 'Categorize' }));
    const category = screen.getByLabelText('Category');
    const colour = screen.getByLabelText('Colour');
    fireEvent.change(category, { target: { value: 'Classic' } });
    fireEvent.change(colour, { target: { value: 'Champagne' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mocks.update).toHaveBeenCalledWith('managed-1', 'Classic', 'Champagne');

    const categoryFilter = screen.getByRole('combobox', { name: 'Filter templates by category' });
    fireEvent.keyDown(categoryFilter, { key: 'ArrowDown' });
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByRole('option', { name: 'All categories (1)' })).toBeVisible();
    expect(within(listbox).getByRole('option', { name: 'General (1)' })).toBeVisible();
  });
});
