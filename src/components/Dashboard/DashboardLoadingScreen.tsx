import React from 'react';
import { LoaderCircle } from 'lucide-react';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import managementStyles from './PhotoVideoGallery/photoVideoSharingManagement.module.css';

export type DashboardLoadingAppearance = 'neutral' | 'photo-video-sharing';

interface DashboardLoadingScreenProps {
  contained?: boolean;
  appearance?: DashboardLoadingAppearance;
}

export const getDashboardLoadingAppearance = (
  pathname: string,
  search = '',
): DashboardLoadingAppearance => {
  const isPhotoVideoWorkspace =
    pathname === '/dashboard/photo-video-gallery'
    || pathname.startsWith('/dashboard/photo-video-gallery/');
  const isPhotoVideoDashboardTab =
    pathname === '/dashboard'
    && new URLSearchParams(search).get('tab') === 'photo-video-gallery';

  return isPhotoVideoWorkspace || isPhotoVideoDashboardTab
    ? 'photo-video-sharing'
    : 'neutral';
};

const NeutralDashboardLoadingScreen: React.FC<{ contained: boolean }> = ({ contained }) => {
  if (contained) {
    return (
      <div
        className="flex min-h-[60vh] w-full flex-col items-center justify-center animate-in fade-in duration-300"
        role="status"
        aria-live="polite"
        data-dashboard-loading-screen
        data-loading-appearance="neutral"
      >
        <div
          className="h-11 w-11 animate-spin rounded-full border-4 motion-reduce:animate-none"
          style={{
            borderColor: 'rgba(150, 122, 89, 0.2)',
            borderTopColor: '#967A59',
          }}
          aria-hidden="true"
        />
        <p className="mt-4 text-sm font-medium tracking-[0.01em] text-[#6E6E73]">
          Loading Page...
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-gradient-subtle px-4"
      role="status"
      aria-live="polite"
      data-dashboard-loading-screen
      data-loading-appearance="neutral"
    >
      <Card className="ww-box w-full max-w-md p-8 text-center" data-dashboard-loading-card>
        <div
          className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary motion-reduce:animate-none"
          aria-hidden="true"
        />
        <CardTitle>Loading Dashboard...</CardTitle>
        <CardDescription>Please wait while we set up your workspace</CardDescription>
      </Card>
    </div>
  );
};

export const DashboardLoadingScreen: React.FC<DashboardLoadingScreenProps> = ({
  contained = false,
  appearance = 'neutral',
}) => {
  if (appearance === 'neutral') {
    return <NeutralDashboardLoadingScreen contained={contained} />;
  }

  return (
    <div
      className={cn(
        'flex w-full items-center justify-center overflow-x-hidden px-4',
        contained ? 'fixed inset-0 z-40 min-h-[100dvh]' : 'min-h-[100dvh]',
        managementStyles.photoVideoSharingSurface,
        managementStyles.manropeTypography,
      )}
      role="status"
      aria-live="polite"
      data-dashboard-loading-screen
      data-loading-appearance="photo-video-sharing"
    >
      <Card
        className={cn(
          'w-full max-w-xs rounded-2xl p-6 text-center sm:p-7',
          managementStyles.glassCard,
          managementStyles.loadingGlassPanel,
        )}
        data-dashboard-loading-card
      >
        <LoaderCircle
          aria-hidden="true"
          className={cn(
            'mx-auto mb-3 h-6 w-6 motion-safe:animate-spin motion-reduce:animate-none',
            managementStyles.loadingGlassSpinner,
          )}
          strokeWidth={1.8}
        />
        <CardTitle
          className={cn('text-lg font-medium text-white', managementStyles.loadingGlassTitle)}
        >
          Loading Dashboard
        </CardTitle>
        <CardDescription className="mt-1 text-sm">
          Please wait while we set up your workspace
        </CardDescription>
      </Card>
    </div>
  );
};
