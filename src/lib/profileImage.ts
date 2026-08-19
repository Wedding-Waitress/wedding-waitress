export const PROFILE_IMAGE_BUCKET = 'profile-images';
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type ProfileImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ValidatedProfileImage {
  file: File;
  mime: ProfileImageMime;
}

const matches = (bytes: Uint8Array, expected: number[], offset = 0) =>
  expected.every((value, index) => bytes[offset + index] === value);

export const detectProfileImageMime = (bytes: Uint8Array): ProfileImageMime | null => {
  if (bytes.length >= 3 && matches(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (bytes.length >= 8 && matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (
    bytes.length >= 12
    && matches(bytes, [0x52, 0x49, 0x46, 0x46])
    && matches(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) return 'image/webp';
  return null;
};

export const validateProfileImageFile = async (file: File): Promise<ValidatedProfileImage> => {
  if (file.size <= 0) throw new Error('Choose a non-empty image file.');
  if (file.size > PROFILE_IMAGE_MAX_BYTES) throw new Error('The image must be 5 MB or smaller.');

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const mime = detectProfileImageMime(header);
  if (!mime) throw new Error('Choose a genuine JPG, PNG or WebP image.');

  const declaredMime = file.type.toLowerCase();
  if (declaredMime && declaredMime !== mime) {
    throw new Error('The image contents do not match its reported file type.');
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const pixels = bitmap.width * bitmap.height;
      const tooLarge = bitmap.width > 12_000 || bitmap.height > 12_000 || pixels > 50_000_000;
      bitmap.close();
      if (tooLarge) throw new Error('The image dimensions are too large. Choose an image under 50 megapixels.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('dimensions are too large')) throw error;
      throw new Error('The selected file could not be decoded as a valid image.');
    }
  }

  return { file, mime };
};

export const profileImagePathForUser = (userId: string) => `${userId}/profile-image`;
