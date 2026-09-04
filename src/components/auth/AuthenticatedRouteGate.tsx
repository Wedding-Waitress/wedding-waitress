import React from 'react';
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

export const AuthenticatedRouteGate: React.FC = () => {
  const location = useLocation();
  const { session, loading, error, retry } = useAuthenticatedSession();

  if (loading) {
    return (
      <DashboardLoadingScreen
        appearance={getDashboardLoadingAppearance(location.pathname, location.search)}
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

  return <FirstEventSetupGate userId={session.user.id} />;
};
