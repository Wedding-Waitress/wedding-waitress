import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignageBulkUploader } from './SignageBulkUploader';
import { createPreviewThumbnail, uploadSignageGalleryImage } from './signageUploadUtils';

const toast = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

vi.mock('./signageUploadUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./signageUploadUtils')>();
  return {
    ...actual,
    createPreviewThumbnail: vi.fn(async () => 'data:image/jpeg;base64,preview'),
    uploadSignageGalleryImage: vi.fn(),
  };
});

describe('Seating Chart Signs admin upload panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses one multiple-image picker and preserves the Seating Chart Signs requirements', () => {
    const { container } = render(<SignageBulkUploader />);

    expect(screen.getByRole('region', { name: 'Admin upload' })).toBeInTheDocument();
    expect(screen.getByLabelText('Category for this upload')).toHaveValue('Uncategorized');
    expect(screen.getByRole('button', { name: 'Choose images' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(screen.getByText(/PNG or JPG, up to 500 MB per image/i)).toBeInTheDocument();
    expect(screen.getByText(/A1 signs at 300 DPI/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bulk Upload' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Single Upload' })).not.toBeInTheDocument();
    expect(screen.queryByText(/drag and drop/i)).not.toBeInTheDocument();

    const picker = container.querySelector('input[type="file"]');
    expect(picker).toHaveAttribute('accept', 'image/png,image/jpeg');
    expect(picker).toHaveAttribute('multiple');
  });

  it('uploads valid selections independently and reports partial failures without stopping the batch', async () => {
    const onAllDone = vi.fn();
    vi.mocked(uploadSignageGalleryImage)
      .mockImplementationOnce(async (_file, _name, _category, onProgress) => {
        onProgress?.({ phase: 'uploading', percent: 60, message: 'Uploading image…' });
        return { masterBytes: 10, thumbBytes: 2 };
      })
      .mockRejectedValueOnce(new Error('Storage unavailable'));

    const { container } = render(<SignageBulkUploader onAllDone={onAllDone} />);
    const picker = container.querySelector('input[type="file"]') as HTMLInputElement;
    const validJpg = new File(['photo'], 'Garden_Wedding.jpg', { type: 'image/jpeg' });
    const validPng = new File(['photo'], 'Classic Sign.png', { type: 'image/png' });
    const invalid = new File(['bad'], 'notes.pdf', { type: 'application/pdf' });

    fireEvent.change(picker, { target: { files: [validJpg, validPng, invalid] } });

    await waitFor(() => expect(screen.getByText('Total 3')).toBeInTheDocument());
    expect(screen.getByText('Failed 1')).toBeInTheDocument();
    expect(screen.getByText('Waiting 2')).toBeInTheDocument();
    expect(screen.getByText('PNG or JPG images only.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Category for this upload'), { target: { value: 'Floral' } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Complete: 1 uploaded, 2 rejected or failed.');
    });
    expect(uploadSignageGalleryImage).toHaveBeenCalledTimes(2);
    expect(uploadSignageGalleryImage).toHaveBeenNthCalledWith(
      1,
      validJpg,
      'Garden Wedding',
      'Floral',
      expect.any(Function),
    );
    expect(uploadSignageGalleryImage).toHaveBeenNthCalledWith(
      2,
      validPng,
      'Classic Sign',
      'Floral',
      expect.any(Function),
    );
    expect(createPreviewThumbnail).toHaveBeenCalledTimes(2);
    expect(onAllDone).toHaveBeenCalledTimes(1);
  });
});
