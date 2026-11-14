import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '@/styles/DashboardInterface.css';

/** Route-owned visual scope also reaches Radix portals outside the app root. */
export const DashboardInterfaceStyleScope = () => {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const enabled = /^\/(dashboard|account|admin)(\/|$)/.test(pathname)
      || /^\/(dj-mc|djmc|shared-running-sheet|running-sheet)\/[^/]+(?:\/[^/]+)?\/?$/.test(pathname);
    if (enabled) document.body.setAttribute('data-ww-dashboard-ui', 'true');
    else document.body.removeAttribute('data-ww-dashboard-ui');
    return () => document.body.removeAttribute('data-ww-dashboard-ui');
  }, [pathname]);
  return null;
};
