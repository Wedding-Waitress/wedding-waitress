import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/photoBoothBackgroundTemplates', () => ({
  PHOTO_BOOTH_BACKGROUND_TEMPLATES: [],
  PHOTO_BOOTH_TEMPLATE_CATEGORIES: [],
  PHOTO_BOOTH_TEMPLATE_COLOURS: [],
  filterPhotoBoothTemplates: () => [],
}));

vi.mock('@/hooks/useIsAdmin', () => ({ useIsAdmin: () => ({ isAdmin: false, loading: false }) }));
vi.mock('@/hooks/usePhotoBoothTemplateLibrary', () => ({
  usePhotoBoothTemplateLibrary: () => ({
    templates: [], loading: false, error: null,
    refetch: vi.fn(), remove: vi.fn(), update: vi.fn(),
  }),
}));

import { PhotoBoothTemplateLibraryDialog } from './PhotoBoothTemplateLibraryDialog';
import managementStyles from './photoVideoSharingManagement.module.css';

describe('PhotoBoothTemplateLibraryDialog espresso appearance', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(cleanup);

  it('preserves the complete library interface while the built-in catalogue is empty', async () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <PhotoBoothTemplateLibraryDialog
        open
        onOpenChange={onOpenChange}
        selectedUrl={null}
        onSelect={onSelect}
        appearance="espresso-glass"
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass(managementStyles.templateLibraryDialog);

    const search = screen.getByRole('textbox', { name: 'Search templates by name' });
    expect(search).toHaveClass(managementStyles.templateLibraryControl);

    const category = screen.getByRole('combobox', { name: 'Filter templates by category' });
    const colour = screen.getByRole('combobox', { name: 'Filter templates by colour' });
    expect(category).toHaveClass(managementStyles.templateLibraryControl);
    expect(colour).toHaveClass(managementStyles.templateLibraryControl);

    fireEvent.keyDown(category, { key: 'ArrowDown' });
    const menu = await screen.findByRole('listbox');
    expect(menu).toHaveClass(managementStyles.gallerySelectContent, managementStyles.templateLibrarySelectContent);
    const allCategories = within(menu).getByRole('option', { name: 'All categories (0)' });
    expect(allCategories).toHaveClass(managementStyles.gallerySelectItem);
    fireEvent.click(allCategories);

    const select = screen.getByRole('button', { name: 'Select Template' });
    expect(select).toBeDisabled();
    expect(select).toHaveClass(managementStyles.galleryViewPrimaryAction);
    expect(screen.getByText('No background templates are currently available.')).toHaveClass(managementStyles.templateLibraryState);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(onSelect).not.toHaveBeenCalled();

    const close = screen.getByRole('button', { name: 'Close' });
    expect(close).toHaveClass(managementStyles.templateLibrarySecondaryAction);
    fireEvent.click(close);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('uses the readable espresso empty state and retains responsive, touch and reduced-motion rules', () => {
    render(
      <PhotoBoothTemplateLibraryDialog
        open
        onOpenChange={vi.fn()}
        selectedUrl={null}
        onSelect={vi.fn()}
        appearance="espresso-glass"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Search templates by name'), { target: { value: 'future template' } });
    expect(screen.getByText('No background templates are currently available.')).toHaveClass(managementStyles.templateLibraryState);

    const css = fs.readFileSync(path.join(process.cwd(), 'src/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css'), 'utf8');
    expect(css).toContain('.templateLibraryFooter');
    expect(css).toContain("button[title='Exit']");
    expect(css).toContain('.templateLibraryScrollArea::-webkit-scrollbar-track');
    expect(css).toContain('@media (hover: none), (pointer: coarse)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('@media (max-width: 767px)');
  });
});
