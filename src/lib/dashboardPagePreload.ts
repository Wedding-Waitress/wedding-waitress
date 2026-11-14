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
  'photo-callout-cards': () => import('@/components/Dashboard/PhotoCallout/PhotoCalloutPage'),
  'running-sheet': () => import('@/components/Dashboard/RunningSheet'),
  'photo-video-gallery': () => import('@/components/Dashboard/PhotoVideoGallery'),
  'photo-video-gallery/photo-video-sharing': () => import('@/pages/GalleryUploadFeaturePage'),
  'photo-video-gallery/gallery-view': () => import('@/pages/GalleryViewFeaturePage'),
  'photo-video-gallery/digital-photo-booth': () => import('@/pages/GalleryPhotoBoothFeaturePage'),
  'photo-video-gallery/digital-guestbook': () => import('@/pages/GalleryTextGuestbookFeaturePage'),
  'photo-video-gallery/live-slideshow': () => import('@/pages/GallerySlideshowFeaturePage'),
} as const;

export type PreloadableDashboardPage = keyof typeof dashboardPageLoaders;

/** Intent requests start immediately; speculative downloads use two workers so
 * opening one page does not compete with every other dashboard feature. */
export function createPagePreloader(loaders: Record<string, () => Promise<unknown>>) {
  const requests = new Map<string, Promise<unknown>>();
  let background: Promise<PromiseSettledResult<unknown>[]> | undefined;
  const preload = (page: string) => {
    const loader = loaders[page];
    if (!loader) return undefined;
    const existing = requests.get(page);
    if (existing) return existing;
    const request = Promise.resolve().then(loader).catch(error => {
      if (requests.get(page) === request) requests.delete(page);
      throw error;
    });
    requests.set(page, request);
    return request;
  };
  const warmAll = () => {
    background ??= (async () => {
      const pages = Object.keys(loaders);
      const results: PromiseSettledResult<unknown>[] = new Array(pages.length);
      let next = 0;
      const worker = async () => {
        while (next < pages.length) {
          const index = next++;
          try { results[index] = { status: 'fulfilled', value: await preload(pages[index]) }; }
          catch (reason) { results[index] = { status: 'rejected', reason }; }
          // Let rendering and user input run between cached module evaluations.
          await new Promise<void>(resolve => setTimeout(resolve, 0));
        }
      };
      await Promise.all([worker(), worker()]);
      return results;
    })();
    return background;
  };
  return { preload, warmAll };
}

const preloader = createPagePreloader(dashboardPageLoaders);
export const preloadDashboardPage = preloader.preload;
export const preloadAllDashboardPages = preloader.warmAll;
