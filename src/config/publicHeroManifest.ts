export interface PublicHeroAsset {
  id: string;
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
  desktopMp4: '/videos/wedding-waitress-home-hero-desktop.mp4',
  desktopWebm: '/videos/wedding-waitress-home-hero-desktop.webm',
  mobileMp4: '/videos/wedding-waitress-home-hero-mobile.mp4',
  mobileWebm: '/videos/wedding-waitress-home-hero-mobile.webm',
} as const;

// Video generation is intentionally external to this repository workflow. Keep
// this false until all four production files above exist, so the poster remains
// immediate and the browser never requests missing media.
export const HOMEPAGE_HERO_VIDEO_READY = false;

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
  '/qr-code-seating-chart': asset('qr-code-seating-chart', { navigationParent: 'products' }),
  '/seating-chart-signs': asset('seating-chart-signs', { navigationParent: 'products' }),
  '/invitations-cards': asset('invitations-cards', { navigationParent: 'products' }),
  '/name-place-cards': asset('name-place-cards', { navigationParent: 'products' }),
  '/full-seating-chart': asset('full-seating-chart', { navigationParent: 'products' }),
  '/floor-plan': asset('floor-plan', { navigationParent: 'products' }),
  '/individual-table-charts': asset('individual-table-charts', { navigationParent: 'products' }),
  '/dietary-requirements': asset('dietary-requirements', { navigationParent: 'products' }),
  '/running-sheet': asset('running-sheet', { navigationParent: 'products' }),
  '/live-slideshow': asset('live-slideshow', { navigationParent: 'products' }),
  '/dj-mc-questionnaire': asset('dj-mc-questionnaire', { navigationParent: 'products' }),
  '/photo-video-sharing': asset('photo-video-sharing', { navigationParent: 'products' }),
  '/events/weddings': asset('event-weddings', { navigationParent: 'events' }),
  '/events/engagements': asset('event-engagements', { navigationParent: 'events' }),
  '/events/birthdays-parties': asset('event-birthdays-parties', { navigationParent: 'events' }),
  '/events/corporate-events': asset('event-corporate-events', { navigationParent: 'events' }),
  '/events/christmas-seasonal-events': asset('event-christmas-seasonal-events', { navigationParent: 'events' }),
  '/events/memorials-celebrations-of-life': asset('event-memorials-celebrations-of-life', { navigationParent: 'events' }),
};

export const publicHeroForRoute = (route: string) => publicHeroByRoute[route] ?? publicHeroByRoute['/events'];
