import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { DashboardLoadingScreen, getDashboardLoadingAppearance } from '@/components/Dashboard/DashboardLoadingScreen';
import { useUserPlan } from '@/hooks/useUserPlan';
import { usePaidAccessState } from '@/hooks/usePaidAccessState';
const RECOVERY_ACCOUNT_PATHS = new Set([
  '/account/plan-billing',
  '/account/help-support',
  '/account/security-account',
]);

export const PaidAccessGate: React.FC<React.PropsWithChildren> = ({ children }) => {
  const location = useLocation();
  const { loading, hasPlatformOwnerAccess } = useUserPlan();
  const { state: paidAccess, loading: accessLoading } = usePaidAccessState();

  if (loading || accessLoading) {
    return <DashboardLoadingScreen appearance={getDashboardLoadingAppearance(location.pathname, location.search)} />;
  }

  const paidAccessExpired = !hasPlatformOwnerAccess && paidAccess?.paid_plan === true && paidAccess.expired === true;

  if (!paidAccessExpired) return <>{children}</>;
  if (RECOVERY_ACCOUNT_PATHS.has(location.pathname) || location.pathname === '/payment-success') return <>{children}</>;

  return <Navigate to="/account/plan-billing?access=expired" replace state={{ from: location.pathname }} />;
};
