import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  trial_extended: boolean;
}

export const useUserPlan = () => {
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.rpc('get_user_plan', { _user_id: user.id });
        
        if (error) {
          console.error('Error fetching user plan:', error);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          const row = data[0];
          // Fetch trial_extended from user_subscriptions
          const { data: subData } = await supabase
            .from('user_subscriptions')
            .select('plan_id, trial_extended')
            .eq('user_id', user.id)
            .limit(1)
            .single();

          setPlan({
            plan_name: row.plan_name,
            guest_limit: row.guest_limit,
            table_limit: null,
            team_members: row.team_members,
            can_send_email: row.can_send_email,
            can_send_sms: row.can_send_sms,
            can_send_whatsapp: row.can_send_whatsapp,
            status: row.status,
            is_read_only: row.is_read_only,
            expires_at: row.expires_at,
            trial_extended: (subData as any)?.trial_extended ?? false,
          });

          if (subData?.plan_id) {
            const { data: planData } = await supabase
              .from('subscription_plans')
              .select('table_limit')
              .eq('id', (subData as any).plan_id)
              .single();

            if (planData) {
              setPlan(prev => prev ? { ...prev, table_limit: (planData as any).table_limit } : prev);
            }
          }
        }
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

  return { plan, loading, isTrialExpired, isStarterPlan, canSendRsvp };
};
