import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  mobile: string | null;
  display_countdown_event_id: string | null;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setError('User not authenticated');
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          setError(profileError.message);
          return;
        }

        setProfile(profileData);
      } catch (err) {
        setError('Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const updateDisplayCountdownEvent = async (eventId: string | null) => {
    if (!profile) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_countdown_event_id: eventId })
        .eq('id', profile.id);
      
      if (!error) {
        setProfile({ ...profile, display_countdown_event_id: eventId });
      }
    } catch (err) {
      console.error('Failed to update display countdown event:', err);
    }
  };

  return { profile, loading, error, updateDisplayCountdownEvent };
};