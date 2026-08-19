import { describe, expect, it } from 'vitest';
import { detectProfileImageMime, profileImagePathForUser, validateProfileImageFile } from './profileImage';

const file = (bytes: number[], name: string, type: string) => new File([new Uint8Array(bytes)], name, { type });

describe('profile image validation', () => {
  it('detects supported formats from binary signatures', () => {
    expect(detectProfileImageMime(new Uint8Array([0xff, 0xd8, 0xff]))).toBe('image/jpeg');
    expect(detectProfileImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectProfileImageMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('image/webp');
  });

  it('rejects spoofed and unsupported file contents', async () => {
    await expect(validateProfileImageFile(file([0x4d, 0x5a, 0x90], 'fake.jpg', 'image/jpeg'))).rejects.toThrow(/genuine/i);
    await expect(validateProfileImageFile(file([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'wrong.jpg', 'image/jpeg'))).rejects.toThrow(/do not match/i);
  });

  it('uses one stable owner-specific storage path', () => {
    expect(profileImagePathForUser('user-123')).toBe('user-123/profile-image');
  });
});
