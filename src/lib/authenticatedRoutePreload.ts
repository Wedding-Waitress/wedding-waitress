type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export const loadDashboardRoute = () => import('@/pages/Dashboard');
export const loadAccountRoute = () => import('@/pages/Account');
export const loadAdminRoute = () => import('@/pages/Admin');
export const loadUpgradeCheckoutRoute = () => import('@/pages/UpgradeCheckout');

export const scheduleIdleWork = (work: () => void, timeout = 1_500) => {
  if (typeof window === 'undefined') return () => undefined;

  const idleWindow = window as IdleWindow;
  let idleHandle: number | undefined;
  // Give the initial authenticated paint and first interaction priority before
  // using idle bandwidth for route chunks.
  const timerHandle = window.setTimeout(() => {
    if (idleWindow.requestIdleCallback) {
      idleHandle = idleWindow.requestIdleCallback(work, { timeout });
    } else {
      work();
    }
  }, Math.min(timeout, 750));

  return () => {
    window.clearTimeout(timerHandle);
    if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
  };
};
