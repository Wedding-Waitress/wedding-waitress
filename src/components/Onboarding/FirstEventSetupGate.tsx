import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLoadingScreen, getDashboardLoadingAppearance } from '@/components/Dashboard/DashboardLoadingScreen';
import { GUIDED_SETUP_ROUTE } from '@/lib/guidedEventSetup';

type GateState = 'checking' | 'continue' | 'onboarding';

/** Resumes only an explicitly-created first-event draft; legacy customers are never inferred as new. */
export const FirstEventSetupGate = ({ userId }: { userId: string }) => {
  const location = useLocation();
  const isSetupRoute = location.pathname === GUIDED_SETUP_ROUTE;
  const [state, setState] = React.useState<GateState>(isSetupRoute ? 'continue' : 'checking');

  React.useEffect(() => {
    if (isSetupRoute) { setState('continue'); return; }
    let active = true;
    setState('checking');
    void Promise.all([
      supabase.from('onboarding_drafts').select('id').eq('user_id', userId).eq('mode', 'first_event').is('completed_at', null).limit(1).maybeSingle(),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]).then(([draftResult, eventsResult]) => {
      if (!active) return;
      // Fail open during staged rollout or a transient read failure; normal dashboard access remains available.
      if (draftResult.error || eventsResult.error) { setState('continue'); return; }
      setState(draftResult.data && (eventsResult.count ?? 0) === 0 ? 'onboarding' : 'continue');
    }).catch(() => { if (active) setState('continue'); });
    return () => { active = false; };
  }, [isSetupRoute, userId]);

  if (state === 'checking') return <DashboardLoadingScreen appearance={getDashboardLoadingAppearance(location.pathname, location.search)} />;
  if (state === 'onboarding') return <Navigate to={`${GUIDED_SETUP_ROUTE}?mode=first`} replace />;
  return <Outlet />;
};
