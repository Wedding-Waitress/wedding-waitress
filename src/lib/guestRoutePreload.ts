// Share the route loader with React.lazy so intent warming reuses the same chunk.
export const loadVideoWishesRoute = () => import('@/pages/GuestVideoWishes');
export const preloadVideoWishesRoute = () => { void loadVideoWishesRoute().catch(() => {}); };
