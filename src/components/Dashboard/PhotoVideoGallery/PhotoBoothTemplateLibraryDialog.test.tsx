import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoBoothTemplateLibraryDialog } from './PhotoBoothTemplateLibraryDialog';
import managementStyles from './photoVideoSharingManagement.module.css';

describe('PhotoBoothTemplateLibraryDialog espresso appearance', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(cleanup);

  it('styles the filters, template states and actions without changing template artwork or selection behaviour', async () => {
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
    const allCategories = within(menu).getByRole('option', { name: 'All categories' });
    expect(allCategories).toHaveClass(managementStyles.gallerySelectItem);
    fireEvent.click(allCategories);

    const firstTemplate = screen.getByRole('button', { name: /Midnight Navy/i });
    const artwork = within(firstTemplate).getByRole('img', { name: 'Midnight Navy' });
    expect(firstTemplate).toHaveClass(managementStyles.templateLibraryCard);
    expect(artwork).toHaveAttribute('width', '288');
    expect(artwork).toHaveAttribute('height', '400');
    expect(artwork).toHaveClass('object-cover');

    const select = screen.getByRole('button', { name: 'Select Template' });
    expect(select).toBeDisabled();
    expect(select).toHaveClass(managementStyles.galleryViewPrimaryAction);
    fireEvent.click(firstTemplate);
    expect(firstTemplate).toHaveClass(managementStyles.templateLibraryCardSelected);
    expect(select).toBeEnabled();
    fireEvent.click(select);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass(managementStyles.templateLibrarySecondaryAction);
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

    fireEvent.change(screen.getByPlaceholderText('Search templates by name'), { target: { value: 'no matching template' } });
    expect(screen.getByText('No templates match your search.')).toHaveClass(managementStyles.templateLibraryState);

    const css = fs.readFileSync(path.join(process.cwd(), 'src/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css'), 'utf8');
    expect(css).toContain('.templateLibraryFooter');
    expect(css).toContain("button[title='Exit']");
    expect(css).toContain('.templateLibraryScrollArea::-webkit-scrollbar-track');
    expect(css).toContain('@media (hover: none), (pointer: coarse)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('@media (max-width: 767px)');
  });
});
