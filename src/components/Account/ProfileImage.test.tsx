import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileImageEditor } from './ProfileImageEditor';
import type { UserProfile } from '@/hooks/useProfile';

const mocks = vi.hoisted(() => ({
  profile: null as UserProfile | null,
  updateCachedProfile: vi.fn(),
  toast: vi.fn(),
  getUser: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  validate: vi.fn(),
}));

vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: mocks.profile, updateCachedProfile: mocks.updateCachedProfile }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/profileImage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/profileImage')>();
  return { ...actual, validateProfileImageFile: mocks.validate };
});
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove, createSignedUrl: mocks.createSignedUrl }) },
    from: () => ({ update: mocks.update }),
  },
}));

const baseProfile: UserProfile = {
  id: 'user-1', first_name: 'Emma', last_name: 'Stone', email: 'emma@example.com', mobile: null,
  display_countdown_event_id: null, account_id: 'account-1', country_code: null,
  profile_image_path: null, profile_image_url: null, profile_image_fit: 'cover',
  profile_image_position_x: 50, profile_image_position_y: 50,
};

describe('profile image UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profile = { ...baseProfile };
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.example/avatar' }, error: null });
    mocks.eq.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  it('renders initials when no stored image exists', () => {
    render(<ProfileAvatar profile={baseProfile} decorative={false} />);
    expect(screen.getByText('ES')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders a proportionally fitted stored image with saved positioning', () => {
    render(<ProfileAvatar profile={{ ...baseProfile, profile_image_url: 'https://signed.example/avatar', profile_image_fit: 'contain', profile_image_position_x: 30, profile_image_position_y: 70 }} decorative={false} />);
    const image = screen.getByRole('img', { name: /Emma Stone/ });
    expect(image).toHaveStyle({ objectFit: 'contain', objectPosition: '30% 70%' });
  });

  it('shows a preview and only uploads after Save Image is selected', async () => {
    const chosen = new File(['image'], 'emma.png', { type: 'image/png' });
    mocks.validate.mockResolvedValue({ file: chosen, mime: 'image/png' });
    const { container } = render(<ProfileImageEditor />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [chosen] } });

    expect(await screen.findByRole('button', { name: /Save Image/ })).toBeInTheDocument();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:preview');

    fireEvent.click(screen.getByRole('button', { name: /Save Image/ }));
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith('user-1/profile-image', chosen, expect.objectContaining({ upsert: true, contentType: 'image/png' })));
    expect(mocks.updateCachedProfile).toHaveBeenCalledWith(expect.objectContaining({ profile_image_path: 'user-1/profile-image' }));
  });

  it('removes only the authenticated user stable path and restores initials state', async () => {
    mocks.profile = { ...baseProfile, profile_image_path: 'user-1/profile-image', profile_image_url: 'https://signed.example/avatar' };
    render(<ProfileImageEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(['user-1/profile-image']));
    expect(mocks.updateCachedProfile).toHaveBeenCalledWith({ profile_image_path: null, profile_image_url: null });
  });

  it('keeps an unsaved preview, resets loading and styles a genuine upload failure as an accessible error', async () => {
    const chosen = new File(['image'], 'emma.png', { type: 'image/png' });
    mocks.validate.mockResolvedValue({ file: chosen, mime: 'image/png' });
    mocks.upload.mockResolvedValue({ error: new Error('Upload temporarily unavailable') });
    const { container } = render(<ProfileImageEditor />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [chosen] } });

    const saveButton = await screen.findByRole('button', { name: /Save Image/ });
    fireEvent.click(saveButton);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Unable to save image',
      description: 'Upload temporarily unavailable',
      variant: 'destructive',
      className: expect.stringContaining('[&_*]:!text-white'),
    })));
    expect(saveButton).toBeEnabled();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:preview');
    expect(mocks.updateCachedProfile).not.toHaveBeenCalled();
  });
});
