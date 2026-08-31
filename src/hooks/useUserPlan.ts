import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCacheGeneration, registerCache } from '@/lib/cacheRegistry';

export interface UserPlan {
  plan_name: string;
  guest_limit: number | null;
  table_limit: number | null;
  team_members: number;
  can_send_email: boolean;
  can_send_sms: boolean;
  can_send_whatsapp: boolean;
  status: string;
  is_read_only: boolean;
  expires_at: string | null;
  download_only_ends_at: string | null;
  trial_extended: boolean;
}

// Module-level cache for instant loading
let planCache: UserPlan | null = null;
let planRequest: Promise<UserPlan | null> | null = null;
registerCache(() => { planCache = null; planRequest = null; });

const requestUserPlan = () => {
  if (planRequest) return planRequest;
  const generation = getCacheGeneration();
  planRequest = (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    await supabase.rpc('refresh_my_subscription_lifecycle');
    const { data, error } = await supabase.rpc('get_user_plan', { _user_id: user.id });
    if (error) throw error;
    if (!data?.length) return null;
    const row = data[0];
    const { data: subData } = await supabase
      .from('user_subscriptions').select('plan_id, trial_extended, download_only_ends_at').eq('user_id', user.id).limit(1).single();
    let tableLimit: number | null = null;
    if (subData?.plan_id) {
      const { data: planData } = await supabase
        .from('subscription_plans').select('table_limit').eq('id', subData.plan_id).single();
      tableLimit = planData?.table_limit ?? null;
    }
    const nextPlan: UserPlan = {
      plan_name: row.plan_name,
      guest_limit: row.guest_limit,
      table_limit: tableLimit,
      team_members: row.team_members,
      can_send_email: row.can_send_email,
      can_send_sms: row.can_send_sms,
      can_send_whatsapp: row.can_send_whatsapp,
      status: row.status,
      is_read_only: row.is_read_only,
      expires_at: row.expires_at,
      download_only_ends_at: subData?.download_only_ends_at ?? null,
      trial_extended: subData?.trial_extended ?? false,
    };
    if (generation !== getCacheGeneration()) throw new Error('Plan request superseded by an account change.');
    planCache = nextPlan;
    return planCache;
  })().finally(() => { planRequest = null; });
  return planRequest;
};

export const useUserPlan = () => {
  const [plan, setPlan] = useState<UserPlan | null>(planCache);
  const [loading, setLoading] = useState(!planCache);

  // Keep cache in sync
  useEffect(() => {
    if (plan) planCache = plan;
  }, [plan]);

  useEffect(() => {
    const fetchPlan = async () => {
      if (planCache) { setPlan(planCache); setLoading(false); return; }
      setLoading(true);
      try {
        setPlan(await requestUserPlan());
      } catch (err) {
        console.error('Error in useUserPlan:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, []);

  const isTrialExpired = plan?.status === 'expired' || 
    (plan?.expires_at && new Date(plan.expires_at) < new Date());

  const isStarterPlan = plan?.plan_name === 'Starter';

  const canSendRsvp = plan ? (plan.can_send_email || plan.can_send_sms) : false;

  const isDownloadOnly = plan?.status === 'grace_period' && plan.is_read_only;
  const downloadWindowExpired = !!plan?.download_only_ends_at && new Date(plan.download_only_ends_at) < new Date();

  return { plan, loading, isTrialExpired, isStarterPlan, canSendRsvp, isDownloadOnly, downloadWindowExpired };
};
