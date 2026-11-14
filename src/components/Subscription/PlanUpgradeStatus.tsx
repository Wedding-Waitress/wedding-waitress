import React, { lazy, Suspense, useState, useEffect } from 'react';
import { useUserPlan } from '@/hooks/useUserPlan';
import { isActiveFreeTrial } from '@/lib/activeTrial';
import { getPlanByName, getWeddingPlanUpgrades } from '@/lib/planRegistry';
import './TrialUpgradeButton.css';

const UpgradePlanModal = lazy(() => import('./UpgradePlanModal').then(m => ({default: m.UpgradePlanModal})));

/** Status follows confirmed entitlement, including promotion fulfilment. */
export function PlanUpgradeStatus() {
  const {plan, loading, hasPlatformOwnerAccess} = useUserPlan();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  if (loading) return null;
  if (hasPlatformOwnerAccess) return <div className="ww-plan-upgrade-status" aria-label="Your plan">
    <span className="ww-current-plan-badge" role="status">Platform Owner Access</span>
    <span className="ww-plan-allowance">All features included · no guest limit</span>
    <span className="ww-plan-upgrade-help">Browse customer packages. Your owner access stays unchanged.</span>
    <button type="button" className="ww-trial-upgrade-button" onClick={() => setOpen(true)}>Upgrade Now</button>
    {open && <Suspense fallback={<p role="status">Loading packages…</p>}><UpgradePlanModal open onOpenChange={setOpen}/></Suspense>}
  </div>;
  if (!plan) return null;
  const trial = isActiveFreeTrial(plan, false, now);
  const registered = getPlanByName(plan.plan_name);
  const paid = registered && plan.status === 'active' && !plan.is_read_only && !!plan.expires_at && Date.parse(plan.expires_at) > now;
  if (!trial && !paid) return null;
  const higherPlans = getWeddingPlanUpgrades(plan.plan_name);
  const canUpgrade = higherPlans.length > 0;
  const allowance = plan.guest_limit ?? registered?.limits.guests ?? null;
  return <div className="ww-plan-upgrade-status" aria-label="Your plan">
    {!trial && registered && <>
      <span className="ww-current-plan-badge" role="status">You are on the {registered.name.replace(/ Plan$/, '')} plan</span>
      <span className="ww-plan-allowance">{allowance == null ? 'Unlimited guests' : 'Up to ' + allowance + ' guests'}</span>
      {canUpgrade && <span className="ww-plan-upgrade-help">Planning for more than {allowance} guests? Upgrade to {higherPlans.map(p => p.name.replace(/ Plan$/, '')).join(' or ')} and only pay the difference.</span>}
    </>}
    {canUpgrade && <button type="button" className="ww-trial-upgrade-button" onClick={() => setOpen(true)}>Upgrade Now</button>}
    {open && canUpgrade && <Suspense fallback={<p role="status">Loading packages…</p>}><UpgradePlanModal open onOpenChange={setOpen}/></Suspense>}
  </div>;
}
