import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignageGalleryModal } from './SignageGalleryModal';
import styles from './SignageGalleryModal.module.css';

const adminState = { isAdmin: false };
const images = Array.from({ length: 355 }, (_, index) => ({
  id: `sign-${index + 1}`,
  name: `Seating sign ${index + 1}`,
  category: index % 2 ? 'Classic' : 'Floral',
  image_url: `https://example.test/master-${index + 1}.jpg`,
  preview_url: `https://example.test/preview-${index + 1}.jpg`,
  thumbnail_url: `https://example.test/thumb-${index + 1}.jpg`,
  sort_order: index,
  created_at: '2026-08-15T00:00:00Z',
  categories: [index % 2 ? 'Classic' : 'Floral'],
}));
let galleryImages = images.slice(0, 4);
const galleryState = { loading: false };

vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: () => ({ isAdmin: adminState.isAdmin }),
}));

vi.mock('@/hooks/useSignageGallery', () => ({
  useSignageGallery: () => ({
    images: galleryImages,
    categoriesWithCounts: [
      { name: 'Classic', count: 177 },
      { name: 'Floral', count: 178 },
    ],
    loading: galleryState.loading,
    error: null,
    removeImageFromGallery: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('./SignageBulkUploader', () => ({
  SignageBulkUploader: React.forwardRef(() => (
    <section aria-label="Admin upload">
      <label htmlFor="mock-signage-category">Category for this upload</label>
      <input id="mock-signage-category" />
      <button type="button">Choose images</button>
      <button type="button">Upload</button>
    </section>
  )),
}));

describe('Seating Chart Signs Template Library', () => {
  beforeEach(() => {
    adminState.isAdmin = false;
    galleryImages = images.slice(0, 4);
    galleryState.loading = false;
  });

  it('keeps the signage route renderable while the closed library catalogue is loading', () => {
    galleryState.loading = true;

    render(<SignageGalleryModal open={false} onOpenChange={vi.fn()} onSelectImage={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('preserves the supplied catalogue and applies a selected template through the sticky action bar', () => {
    const onSelectImage = vi.fn();
    render(<SignageGalleryModal open onOpenChange={vi.fn()} onSelectImage={onSelectImage} />);

    expect(images).toHaveLength(355);
    expect(screen.getByRole('heading', { name: /Seating Chart Signs Template Library/i })).toHaveTextContent('4 Total Designs');
    expect(screen.getByPlaceholderText('Search templates by name')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /Admin Upload/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Categorize/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Select' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Select Template' }));
    expect(onSelectImage).toHaveBeenCalledWith(galleryImages[0].preview_url, galleryImages[0].image_url);
  });

  it('keeps owner/admin controls visible and the upload area expandable', () => {
    adminState.isAdmin = true;
    render(<SignageGalleryModal open onOpenChange={vi.fn()} onSelectImage={vi.fn()} />);

    const upload = screen.getByRole('button', { name: 'Admin Upload' });
    fireEvent.click(upload);
    expect(screen.getByRole('button', { name: 'Admin Upload' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Admin upload' })).toBeInTheDocument();
    expect(screen.getByLabelText('Category for this upload')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose images' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bulk Upload' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Single Upload' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Categorize' })).toHaveLength(4);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(4);
  });

  it('uses the isolated light responsive library grid and persistent footer controls', () => {
    render(<SignageGalleryModal open onOpenChange={vi.fn()} onSelectImage={vi.fn()} />);

    expect(screen.getByTestId('signage-template-grid')).toHaveClass(styles.templateGrid);
    const close = screen.getByRole('button', { name: 'Close' });
    const select = screen.getByRole('button', { name: 'Select Template' });
    expect(close.compareDocumentPosition(select) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(select).toBeDisabled();
  });

  it('defines the requested responsive column counts without changing card geometry', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/Dashboard/Signage/SignageGalleryModal.module.css'),
      'utf8',
    );
    expect(source).toMatch(/min-width:\s*420px[\s\S]*repeat\(2,/);
    expect(source).toMatch(/min-width:\s*700px[\s\S]*repeat\(3,/);
    expect(source).toMatch(/min-width:\s*900px[\s\S]*repeat\(4,/);
    expect(source).toMatch(/min-width:\s*1180px[\s\S]*repeat\(6,/);
    expect(source).toMatch(/min-width:\s*1800px[\s\S]*repeat\(8,/);
  });
});
