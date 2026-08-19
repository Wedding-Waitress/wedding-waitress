import React from 'react';
import type { UserProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

interface ProfileAvatarProps {
  profile: UserProfile | null;
  className?: string;
  imageClassName?: string;
  decorative?: boolean;
}

const getProfileInitials = (profile: UserProfile | null) => {
  const first = profile?.first_name?.[0] || '';
  const last = profile?.last_name?.[0] || '';
  return (first + last || profile?.email?.[0] || 'W').toUpperCase();
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  profile,
  className,
  imageClassName,
  decorative = true,
}) => {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'User';

  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full', className)}>
      {profile?.profile_image_url ? (
        <img
          src={profile.profile_image_url}
          alt={decorative ? '' : `${name} profile photo or business logo`}
          className={cn('h-full w-full', imageClassName)}
          style={{
            objectFit: profile.profile_image_fit || 'cover',
            objectPosition: `${profile.profile_image_position_x ?? 50}% ${profile.profile_image_position_y ?? 50}%`,
          }}
        />
      ) : getProfileInitials(profile)}
    </span>
  );
};
