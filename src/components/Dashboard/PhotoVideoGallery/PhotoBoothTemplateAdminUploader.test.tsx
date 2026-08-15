import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ validate: vi.fn(), upload: vi.fn() }));
vi.mock('@/lib/photoBoothTemplateAdmin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/photoBoothTemplateAdmin')>()),
  validatePhotoBoothTemplateFile: mocks.validate,
  uploadPhotoBoothTemplate: mocks.upload,
}));

import { PhotoBoothTemplateAdminUploader } from './PhotoBoothTemplateAdminUploader';

describe('PhotoBoothTemplateAdminUploader', () => {
  beforeEach(() => {
    mocks.validate.mockReset();
    mocks.upload.mockReset().mockResolvedValue({ id: 'uploaded' });
  });

  it('continues a multi-image upload when one image is invalid and reports the final counts', async () => {
    const onComplete = vi.fn();
    mocks.validate
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('900 x 1200; expected exactly 1200 x 1800 px.'))
      .mockResolvedValueOnce({});
    const { container } = render(<PhotoBoothTemplateAdminUploader onComplete={onComplete} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      new File(['one'], 'Wedding 1 - Gold.jpg', { type: 'image/jpeg' }),
      new File(['two'], 'Wrong Size.png', { type: 'image/png' }),
      new File(['three'], 'Wedding 2 - Navy.jpeg', { type: 'image/jpeg' }),
    ];
    fireEvent.change(input, { target: { files } });
    expect(screen.getByText('Total 3')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Category for this upload'), { target: { value: 'Luxe' } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload 3' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(mocks.upload).toHaveBeenNthCalledWith(1, files[0], 'Luxe');
    expect(mocks.upload).toHaveBeenNthCalledWith(2, files[2], 'Luxe');
    expect(screen.getByText('Complete: 2 uploaded, 1 rejected or failed.')).toBeVisible();
    expect(screen.getByText('900 x 1200; expected exactly 1200 x 1800 px.')).toBeVisible();
  });

  it('caps a batch at 96 images', () => {
    const { container } = render(<PhotoBoothTemplateAdminUploader onComplete={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const files = Array.from({ length: 100 }, (_, index) => new File(['x'], `Wedding ${index + 1}.jpg`, { type: 'image/jpeg' }));
    fireEvent.change(input, { target: { files } });
    expect(screen.getByText('Total 96')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Upload 96' })).toBeVisible();
  });
});
