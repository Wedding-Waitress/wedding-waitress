import { publicEventTypes } from '@/content/publicEventTypes';
import { productsByGroup } from '@/content/publicProducts';

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

const productNavigationPaths = new Set(
  ['/products', ...productsByGroup.flatMap((group) => group.products.map((product) => product.path))].map(
    normalizePublicPath,
  ),
);

const eventNavigationPaths = new Set(
  ['/events', ...publicEventTypes.map((eventType) => eventType.path)].map(normalizePublicPath),
);

export const isCurrentPublicPath = (pathname: string, targetPath: string): boolean =>
  normalizePublicPath(pathname) === normalizePublicPath(targetPath);

export const getActivePublicNavigation = (pathname: string): PublicPrimaryNavigationId | null => {
  const normalizedPath = normalizePublicPath(pathname);

  if (productNavigationPaths.has(normalizedPath)) return 'products';
  if (eventNavigationPaths.has(normalizedPath)) return 'events';
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
