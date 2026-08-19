import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, Image as ImageIcon, Loader2, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from './ProfileAvatar';
import { useProfile, type UserProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  PROFILE_IMAGE_BUCKET,
  profileImagePathForUser,
  validateProfileImageFile,
  type ValidatedProfileImage,
} from '@/lib/profileImage';
import styles from './ProfileImageEditor.module.css';
import controlStyles from './AccountControls.module.css';

type ImageFit = 'cover' | 'contain';

const profileImageErrorToastClass =
  'text-white [&_*]:!text-white [&_[toast-close]]:!text-white [&_[toast-close]]:opacity-100';

const previewProfile = (
  profile: UserProfile | null,
  url: string | null,
  fit: ImageFit,
  positionX: number,
  positionY: number,
): UserProfile | null => profile ? {
  ...profile,
  profile_image_url: url,
  profile_image_fit: fit,
  profile_image_position_x: positionX,
  profile_image_position_y: positionY,
} : null;

export const ProfileImageEditor: React.FC = () => {
  const { profile, updateCachedProfile } = useProfile();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ValidatedProfileImage | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fit, setFit] = useState<ImageFit>(profile?.profile_image_fit || 'cover');
  const [positionX, setPositionX] = useState(profile?.profile_image_position_x ?? 50);
  const [positionY, setPositionY] = useState(profile?.profile_image_position_y ?? 50);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pending) return;
    setFit(profile?.profile_image_fit || 'cover');
    setPositionX(profile?.profile_image_position_x ?? 50);
    setPositionY(profile?.profile_image_position_y ?? 50);
  }, [pending, profile]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const clearPending = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPending(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const chooseFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const validated = await validateProfileImageFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPending(validated);
      setPreviewUrl(URL.createObjectURL(file));
      setFit(profile?.profile_image_fit || 'cover');
      setPositionX(profile?.profile_image_position_x ?? 50);
      setPositionY(profile?.profile_image_position_y ?? 50);
    } catch (error) {
      event.target.value = '';
      toast({
        title: 'Image not accepted',
        description: error instanceof Error ? error.message : 'Choose a valid image.',
        variant: 'destructive',
        className: profileImageErrorToastClass,
      });
    }
  };

  const saveImage = async () => {
    if (!pending || !profile) return;
    setBusy(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user || user.id !== profile.id) throw new Error('Your authenticated profile could not be verified.');
      const path = profileImagePathForUser(user.id);
      const { error: uploadError } = await supabase.storage.from(PROFILE_IMAGE_BUCKET).upload(path, pending.file, {
        contentType: pending.mime,
        cacheControl: '0',
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { error: profileError } = await supabase.from('profiles').update({
        profile_image_path: path,
        profile_image_fit: fit,
        profile_image_position_x: positionX,
        profile_image_position_y: positionY,
      }).eq('id', user.id);
      if (profileError) {
        if (!profile.profile_image_path) await supabase.storage.from(PROFILE_IMAGE_BUCKET).remove([path]);
        throw profileError;
      }

      const { data: signed, error: signedError } = await supabase.storage.from(PROFILE_IMAGE_BUCKET).createSignedUrl(path, 24 * 60 * 60);
      if (signedError) throw signedError;
      updateCachedProfile({
        profile_image_path: path,
        profile_image_url: `${signed.signedUrl}&v=${Date.now()}`,
        profile_image_fit: fit,
        profile_image_position_x: positionX,
        profile_image_position_y: positionY,
      });
      clearPending();
      toast({ title: 'Profile image saved', description: 'Your photo or business logo is now up to date.' });
    } catch (error) {
      toast({ title: 'Unable to save image', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive', className: profileImageErrorToastClass });
    } finally {
      setBusy(false);
    }
  };

  const removeImage = async () => {
    if (!profile?.profile_image_path) return;
    setBusy(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user || user.id !== profile.id) throw new Error('Your authenticated profile could not be verified.');
      const path = profileImagePathForUser(user.id);
      const { error: profileError } = await supabase.from('profiles').update({ profile_image_path: null }).eq('id', user.id);
      if (profileError) throw profileError;
      const { error: removeError } = await supabase.storage.from(PROFILE_IMAGE_BUCKET).remove([path]);
      if (removeError) {
        await supabase.from('profiles').update({ profile_image_path: path }).eq('id', user.id);
        throw removeError;
      }
      updateCachedProfile({ profile_image_path: null, profile_image_url: null });
      clearPending();
      toast({ title: 'Profile image removed', description: 'Your initials are displayed again.' });
    } catch (error) {
      toast({ title: 'Unable to remove image', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive', className: profileImageErrorToastClass });
    } finally {
      setBusy(false);
    }
  };

  const displayProfile = previewProfile(
    profile,
    previewUrl || profile?.profile_image_url || null,
    fit,
    positionX,
    positionY,
  );

  return (
    <section className={styles.editor} aria-labelledby="profile-image-heading">
      <div className={styles.avatarWrap}>
        <ProfileAvatar profile={displayProfile} decorative={false} className={styles.avatar} imageClassName={fit === 'contain' ? styles.containedImage : undefined} />
        <span className={styles.cameraBadge} aria-hidden="true"><Camera /></span>
      </div>
      <div className={styles.editorBody}>
        <h3 id="profile-image-heading">Profile Photo or Business Logo</h3>
        <p>JPG, PNG or WebP. Maximum 5 MB. Your image is private and shown only inside your signed-in account.</p>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={chooseFile} className={styles.fileInput} />

        {pending && (
          <div className={styles.positionControls} aria-label="Image preview controls">
            <div className={styles.fitControls}>
              <span>Display</span>
              <button type="button" aria-pressed={fit === 'cover'} onClick={() => setFit('cover')}><ImageIcon /> Fill frame</button>
              <button type="button" aria-pressed={fit === 'contain'} onClick={() => setFit('contain')}><ImageIcon /> Fit logo</button>
            </div>
            {fit === 'cover' && (
              <div className={styles.sliders}>
                <label>Horizontal position<input type="range" min="0" max="100" value={positionX} onChange={(event) => setPositionX(Number(event.target.value))} /></label>
                <label>Vertical position<input type="range" min="0" max="100" value={positionY} onChange={(event) => setPositionY(Number(event.target.value))} /></label>
              </div>
            )}
          </div>
        )}

        <div className={styles.actions}>
          <Button type="button" variant="outline" className={controlStyles.primaryButton} onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload /> {profile?.profile_image_path || pending ? 'Replace Image' : 'Choose Image'}
          </Button>
          {pending && <Button type="button" className={controlStyles.primaryButton} onClick={saveImage} disabled={busy}>{busy ? <Loader2 className={styles.spinner} /> : <Check />} Save Image</Button>}
          {pending && <Button type="button" variant="ghost" className={controlStyles.secondaryButton} onClick={clearPending} disabled={busy}><X /> Cancel Preview</Button>}
          {!pending && profile?.profile_image_path && <Button type="button" variant="destructive" onClick={removeImage} disabled={busy}>{busy ? <Loader2 className={styles.spinner} /> : <Trash2 />} Remove</Button>}
        </div>
      </div>
    </section>
  );
};
