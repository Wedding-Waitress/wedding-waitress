export const PHOTO_BOOTH_JPEG_ACCEPT = 'image/jpeg,.jpg,.jpeg';
export const PHOTO_BOOTH_JPEG_ERROR = 'Please upload a JPEG file (.jpg or .jpeg).';

/** Digital Photo Booth customisation artwork is deliberately JPEG-only. */
export const isPhotoBoothJpeg = (file: Pick<File, 'name' | 'type'>): boolean =>
  file.type === 'image/jpeg' && /\.jpe?g$/i.test(file.name);
