import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import {
  DashboardLoadingScreen,
  getDashboardLoadingAppearance,
} from '@/components/Dashboard/DashboardLoadingScreen';
import { useAuthenticatedSession } from '@/contexts/AuthenticatedSessionContext';
import { createSignInRedirectState } from '@/lib/authNavigation';
import { FirstEventSetupGate } from '@/components/Onboarding/FirstEventSetupGate';
import { PaidAccessGate } from '@/components/auth/PaidAccessGate';
import { SuspensionNotice } from './SuspensionNotice';
import { CustomerEntitlementGate } from './CustomerEntitlementGate';

export const AuthenticatedRouteGate: React.FC<{entitlementEnabled?:boolean}> = ({entitlementEnabled=false}) => {
  const location = useLocation();
  const { session, loading, error, retry, accountAccess } = useAuthenticatedSession();
  const queryClient = useQueryClient();
  const blocked = accountAccess && accountAccess.status !== 'active';
  useEffect(() => {
    if (!blocked) return;
    void queryClient.cancelQueries();
    queryClient.clear();
  }, [blocked, queryClient]);

  if (loading) {
    const isAccountCentre = location.pathname === '/account' || location.pathname.startsWith('/account/');
    return (
      <DashboardLoadingScreen
        appearance={isAccountCentre ? 'core' : getDashboardLoadingAppearance(location.pathname, location.search)}
        title={isAccountCentre ? 'Opening Account Centre…' : undefined}
        description={isAccountCentre ? 'Please wait while we prepare your account.' : undefined}
      />
    );
  }

  if (error) {
    return (
      <div className="ww-application-background flex min-h-[100dvh] w-full items-center justify-center px-4">
        <Card
          className="ww-box w-full max-w-md p-8 text-center"
          role="alert"
          data-authenticated-route-error
        >
          <CardTitle className="mb-2">Dashboard couldn’t load</CardTitle>
          <CardDescription className="mb-6">{error}</CardDescription>
          <Button variant="default" size="xs" className="w-full rounded-full" onClick={retry}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  if (!session) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to="/"
        replace
        state={createSignInRedirectState(returnTo)}
      />
    );
  }

  if (blocked) return <SuspensionNotice access={accountAccess} />;
  return <CustomerEntitlementGate userId={session.user.id} enabled={entitlementEnabled}><PaidAccessGate><FirstEventSetupGate userId={session.user.id} /></PaidAccessGate></CustomerEntitlementGate>;
};
