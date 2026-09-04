import { publicEventTypes } from '@/content/publicEventTypes';
import { productsByGroup } from '@/content/publicProducts';
import { publicHeroByRoute } from '@/config/publicHeroManifest';
import { matchPath } from 'react-router-dom';

export type PublicPrimaryNavigationId =
  | 'how-it-works'
  | 'products'
  | 'events'
  | 'pricing'
  | 'blog'
  | 'faq'
  | 'contact';

export const normalizePublicPath = (pathname: string): string => {
  const pathOnly = pathname.split(/[?#]/)[0] || '/';
  const withLeadingSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  const collapsedPath = withLeadingSlash.replace(/\/{2,}/g, '/');

  return collapsedPath.length > 1 ? collapsedPath.replace(/\/+$/, '') : collapsedPath;
};

const heroNavigationPaths = (navigationParent: 'products' | 'events') =>
  Object.entries(publicHeroByRoute)
    .filter(([, hero]) => hero.navigationParent === navigationParent)
    .map(([path]) => path);

const productNavigationPaths = [
  '/products',
  ...productsByGroup.flatMap((group) => group.products.map((product) => product.path)),
  ...heroNavigationPaths('products'),
].map(normalizePublicPath);

const eventNavigationPaths = [
  '/events',
  ...publicEventTypes.map((eventType) => eventType.path),
  ...heroNavigationPaths('events'),
].map(normalizePublicPath);

export const matchesPublicRoutePattern = (pathname: string, routePattern: string): boolean =>
  matchPath(
    { path: normalizePublicPath(routePattern), caseSensitive: true, end: true },
    normalizePublicPath(pathname),
  ) !== null;

const matchesNavigationFamily = (pathname: string, routePatterns: string[]) =>
  routePatterns.some((routePattern) => matchesPublicRoutePattern(pathname, routePattern));

export const isCurrentPublicPath = (pathname: string, targetPath: string): boolean =>
  normalizePublicPath(pathname) === normalizePublicPath(targetPath);

export const getActivePublicNavigation = (pathname: string): PublicPrimaryNavigationId | null => {
  const normalizedPath = normalizePublicPath(pathname);

  if (matchesNavigationFamily(normalizedPath, productNavigationPaths)) return 'products';
  if (matchesNavigationFamily(normalizedPath, eventNavigationPaths)) return 'events';
  if (normalizedPath === '/blog' || normalizedPath.startsWith('/blog/')) return 'blog';

  switch (normalizedPath) {
    case '/how-it-works':
      return 'how-it-works';
    case '/pricing':
      return 'pricing';
    case '/faq':
      return 'faq';
    case '/contact':
      return 'contact';
    default:
      return null;
  }
};
