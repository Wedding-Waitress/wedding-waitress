import { scheduleIdleWork } from './authenticatedRoutePreload';

export const dashboardPageLoaders = {
  'my-events': () => import('@/components/Dashboard/MyEventsPage'),
  'guest-list': () => import('@/components/Dashboard/GuestListTable'),
  'table-list': () => import('@/components/Dashboard/CreateTableModal'),
  'qr-code': () => import('@/components/Dashboard/QRCode/QRCodeSeatingChart'),
  signage: () => import('@/components/Dashboard/Signage/SignagePage'),
  invitations: () => import('@/components/Dashboard/Invitations/InvitationsPage'),
  'place-cards': () => import('@/components/Dashboard/PlaceCards/PlaceCardsPage'),
  'individual-table-chart': () => import('@/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage'),
  'floor-plan': () => import('@/components/Dashboard/FloorPlan'),
  'dietary-chart': () => import('@/components/Dashboard/QRCode/KitchenDietaryChart'),
  'full-seating-chart': () => import('@/components/Dashboard/FullSeatingChart/FullSeatingChartPage'),
  'live-slideshow': () => import('@/components/Dashboard/LiveSlideshow/LiveSlideshowSetup'),
  'dj-mc-questionnaire': () => import('@/components/Dashboard/DJMCQuestionnaire'),
  'running-sheet': () => import('@/components/Dashboard/RunningSheet'),
  'photo-video-gallery': () => import('@/components/Dashboard/PhotoVideoGallery'),
} as const;

export type PreloadableDashboardPage = keyof typeof dashboardPageLoaders;

export const preloadDashboardPage = (page: string) => {
  const loader = dashboardPageLoaders[page as PreloadableDashboardPage];
  return loader?.();
};

let allDashboardPagesPreload: Promise<PromiseSettledResult<unknown>[]> | undefined;

/** Warm one feature per idle turn instead of fetching and evaluating all fifteen
 * together. Explicit sidebar intent still loads immediately, outside this queue. */
export const preloadAllDashboardPages = () => {
  allDashboardPagesPreload ??= (async () => {
    const results: PromiseSettledResult<unknown>[] = [];
    for (const loader of Object.values(dashboardPageLoaders)) {
      await new Promise<void>((resolve) => scheduleIdleWork(resolve));
      try {
        results.push({ status: 'fulfilled', value: await loader() });
      } catch (reason) {
        // A failed speculative load must not stop warming other pages or become
        // an unhandled rejection. Route navigation can retry the import later.
        results.push({ status: 'rejected', reason });
      }
    }
    return results;
  })();

  return allDashboardPagesPreload;
};
