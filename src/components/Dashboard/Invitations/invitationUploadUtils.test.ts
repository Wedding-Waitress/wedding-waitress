import { describe, expect, it } from 'vitest';

import {
  MAX_INVITATION_UPLOAD_BYTES,
  prettifyInvitationFilename,
  uploadInvitationGalleryImage,
} from './invitationUploadUtils';

describe('invitation upload utilities', () => {
  it('keeps the invitation upload limit at 500 MB', () => {
    expect(MAX_INVITATION_UPLOAD_BYTES).toBe(500 * 1024 * 1024);
  });

  it.each([
    ['garden-party_invitation.png', 'Garden Party Invitation'],
    ['  modern---wedding__card.JPEG', 'Modern Wedding Card'],
    ['simple.jpg', 'Simple'],
  ])('prettifies %s as %s', (filename, expected) => {
    expect(prettifyInvitationFilename(filename)).toBe(expected);
  });

  it('rejects an oversized image before attempting an upload', async () => {
    const oversizedFile = {
      name: 'oversized-invitation.png',
      size: MAX_INVITATION_UPLOAD_BYTES + 1,
      type: 'image/png',
    } as File;

    await expect(
      uploadInvitationGalleryImage(oversizedFile, 'Oversized Invitation', 'Wedding'),
    ).rejects.toThrow('File is larger than 500 MB');
  });
});
