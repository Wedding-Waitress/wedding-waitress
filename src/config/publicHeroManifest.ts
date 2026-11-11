export interface PublicHeroAsset {
  id: string;
  publicRoute?: string;
  avif: string;
  webp: string;
  fallback: string;
  mobileAvif?: string;
  mobileWebp?: string;
  mobileFallback?: string;
  position?: string;
  mobilePosition?: string;
  navigationParent?: 'products' | 'events';
  decorative: true;
}

const asset = (
  id: string,
  options: Pick<PublicHeroAsset, 'position' | 'mobilePosition' | 'navigationParent'> = {},
): PublicHeroAsset => ({
  id,
  avif: `/images/public-heroes/${id}.avif`,
  webp: `/images/public-heroes/${id}.webp`,
  fallback: `/images/public-heroes/${id}.jpg`,
  decorative: true,
  ...options,
});

export const homepageHeroAsset: PublicHeroAsset = {
  ...asset('home-poster-desktop', { position: 'center center', mobilePosition: '64% center' }),
  mobileAvif: '/images/public-heroes/home-poster-mobile.avif',
  mobileWebp: '/images/public-heroes/home-poster-mobile.webp',
  mobileFallback: '/images/public-heroes/home-poster-mobile.jpg',
};

export const PUBLIC_HOMEPAGE_VIDEO_FILENAMES = {
  mp4: '/videos/wedding-waitress-home-hero.mp4',
} as const;

export const HOMEPAGE_HERO_VIDEO_READY = true;

export const publicHeroByRoute: Record<string, PublicHeroAsset> = {
  '/how-it-works': asset('how-it-works'),
  '/products': asset('products', { navigationParent: 'products' }),
  '/events': asset('events', { navigationParent: 'events' }),
  '/pricing': asset('pricing'),
  '/faq': asset('faq'),
  '/blog': asset('blog'),
  '/blog/:slug': asset('blog'),
  '/contact': asset('contact'),
  '/privacy': asset('legal'),
  '/terms': asset('legal'),
  '/cookies': asset('legal'),
  '/venues': asset('venues'),
  '/venues/:id': asset('venues'),
  '/my-events': asset('my-events', { navigationParent: 'products' }),
  '/event-budget-planner': asset('event-budget-planner', { navigationParent: 'products' }),
  '/tables': asset('tables', { navigationParent: 'products' }),
  '/guest-list': asset('guest-list', { navigationParent: 'products' }),
  '/qr-code-seating-chart': asset('qr-code-seating-chart-v2', { navigationParent: 'products' }),
  '/seating-chart-signs': asset('seating-chart-signs-v2', { navigationParent: 'products' }),
  '/invitations-cards': asset('invitations-cards-v2', { navigationParent: 'products' }),
  '/name-place-cards': asset('name-place-cards-v2', { navigationParent: 'products' }),
  '/full-seating-chart': asset('full-seating-chart-v2', { navigationParent: 'products' }),
  '/floor-plan': asset('floor-plan', { navigationParent: 'products' }),
  '/individual-table-charts': asset('individual-table-charts', { navigationParent: 'products' }),
  '/dietary-requirements': asset('dietary-requirements', { navigationParent: 'products' }),
  '/photo-group-list': asset('photo-video-sharing', { navigationParent: 'products' }),
  '/running-sheet': asset('running-sheet-v2', { navigationParent: 'products' }),
  '/live-slideshow': asset('live-slideshow-v2', { navigationParent: 'products' }),
  '/dj-mc-questionnaire': asset('dj-mc-questionnaire', { navigationParent: 'products' }),
  '/photo-video-sharing': asset('photo-video-sharing', { navigationParent: 'products' }),
  '/events/weddings': asset('event-weddings', { navigationParent: 'events' }),
  '/events/engagements': asset('event-engagements', { navigationParent: 'events' }),
  '/events/birthdays-parties': asset('event-birthdays-parties', { navigationParent: 'events' }),
  '/events/corporate-events': asset('event-corporate-events', { navigationParent: 'events' }),
  '/events/christmas-seasonal-events': asset('event-christmas-seasonal-events', { navigationParent: 'events' }),
  '/events/memorials-celebrations-of-life': asset('event-memorials-celebrations-of-life', { navigationParent: 'events' }),
};

export const publicHeroForRoute = (route: string): PublicHeroAsset => ({
  ...(publicHeroByRoute[route] ?? publicHeroByRoute['/events']),
  publicRoute: route,
});
