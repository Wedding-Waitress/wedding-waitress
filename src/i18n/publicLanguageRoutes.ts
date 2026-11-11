// Marketing and the public QR guest flow remember the selected public language.
const publicPaths = new Set([
  '/', '/pricing', '/how-it-works', '/products', '/events', '/faq', '/blog',
  '/contact', '/privacy', '/terms', '/cookies', '/features',
  '/my-events', '/event-budget-planner', '/tables', '/guest-list',
  '/qr-code-seating-chart', '/seating-chart-signs', '/invitations-cards',
  '/name-place-cards', '/full-seating-chart', '/floor-plan',
  '/individual-table-charts', '/dietary-requirements', '/running-sheet', '/photo-group-list',
  '/live-slideshow', '/kiosk-live-view', '/dj-mc-questionnaire', '/photo-video-sharing',
  '/running-sheet-product',
]);

export function isPublicLanguageRoute(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return /^\/s\/[^/]+(?:\/video-wishes)?$/.test(path) || publicPaths.has(path) || ['/products/', '/features/', '/events/', '/blog/'].some(prefix => path.startsWith(prefix));
}

