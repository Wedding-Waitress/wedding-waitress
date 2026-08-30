import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCacheGeneration, registerCache } from '@/lib/cacheRegistry';

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  mobile: string | null;
  display_countdown_event_id: string | null;
  account_id: string | null;
  country_code: string | null;
  profile_image_path: string | null;
  profile_image_fit: 'cover' | 'contain';
  profile_image_position_x: number;
  profile_image_position_y: number;
  profile_image_url: string | null;
}

// Module-level cache for instant loading
let profileCache: UserProfile | null = null;
let profileRequest: Promise<UserProfile> | null = null;
const profileSubscribers = new Set<(profile: UserProfile | null) => void>();
const broadcastProfile = (profile: UserProfile | null) => {
  profileCache = profile;
  profileSubscribers.forEach((subscriber) => subscriber(profile));
};
registerCache(() => { profileRequest = null; broadcastProfile(null); });

const withSignedProfileImage = async (profile: Omit<UserProfile, 'profile_image_url'>): Promise<UserProfile> => {
  const normalized = {
    ...profile,
    profile_image_path: profile.profile_image_path || null,
    profile_image_fit: profile.profile_image_fit === 'contain' ? 'contain' as const : 'cover' as const,
    profile_image_position_x: profile.profile_image_position_x ?? 50,
    profile_image_position_y: profile.profile_image_position_y ?? 50,
  };
  if (!normalized.profile_image_path) return { ...normalized, profile_image_url: null };
  const { data, error } = await supabase.storage
    .from('profile-images')
    .createSignedUrl(normalized.profile_image_path, 24 * 60 * 60);
  return { ...normalized, profile_image_url: error ? null : data.signedUrl };
};

const requestProfile = () => {
  if (profileRequest) return profileRequest;
  const generation = getCacheGeneration();
  profileRequest = (async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles').select('*').eq('id', user.id).single();
    if (profileError) throw profileError;
    const hydrated = await withSignedProfileImage(profileData as Omit<UserProfile, 'profile_image_url'>);
    if (generation !== getCacheGeneration()) throw new Error('Profile request superseded by an account change.');
    broadcastProfile(hydrated);
    return hydrated;
  })().finally(() => { profileRequest = null; });
  return profileRequest;
};

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(profileCache);
  const [loading, setLoading] = useState(!profileCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    profileSubscribers.add(setProfile);
    return () => { profileSubscribers.delete(setProfile); };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (profileCache) { setLoading(false); return; }
      setLoading(true);
      try {
        await requestProfile();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const updateDisplayCountdownEvent = async (eventId: string | null) => {
    if (!profile) return;
    
    try {
      const updated = { ...profile, display_countdown_event_id: eventId };
      broadcastProfile(updated);

      const { error } = await supabase
        .from('profiles')
        .update({ display_countdown_event_id: eventId })
        .eq('id', profile.id);
      
      if (error) {
        // Revert on failure
        broadcastProfile(profile);
      }
    } catch (err) {
      console.error('Failed to update display countdown event:', err);
    }
  };

  const updateCachedProfile = (updates: Partial<UserProfile>) => {
    if (!profileCache) return;
    broadcastProfile({ ...profileCache, ...updates });
  };

  return { profile, loading, error, updateDisplayCountdownEvent, updateCachedProfile };
};
