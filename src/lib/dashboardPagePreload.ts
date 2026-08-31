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
  'kiosk-live-view': () => import('@/components/Dashboard/Kiosk/KioskSetup'),
  'dj-mc-questionnaire': () => import('@/components/Dashboard/DJMCQuestionnaire'),
  'running-sheet': () => import('@/components/Dashboard/RunningSheet'),
  'photo-video-gallery': () => import('@/components/Dashboard/PhotoVideoGallery'),
} as const;

export type PreloadableDashboardPage = keyof typeof dashboardPageLoaders;

export const preloadDashboardPage = (page: string) => {
  const loader = dashboardPageLoaders[page as PreloadableDashboardPage];
  return loader?.();
};

export const preloadFrequentDashboardPages = () => {
  void Promise.allSettled([
    dashboardPageLoaders['my-events'](),
    dashboardPageLoaders['guest-list'](),
    dashboardPageLoaders['qr-code'](),
    dashboardPageLoaders['photo-video-gallery'](),
  ]);
};
