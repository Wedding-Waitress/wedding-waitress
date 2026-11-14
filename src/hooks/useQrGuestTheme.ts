import { useEffect } from 'react';
import '@/styles/qrGuestCreamTheme.css';

/** Opt in only while a QR guest route is mounted, including its body portals. */
export function useQrGuestTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-qr-guest-theme');
    root.setAttribute('data-qr-guest-theme', 'cream');
    return () => {
      if (previous === null) root.removeAttribute('data-qr-guest-theme');
      else root.setAttribute('data-qr-guest-theme', previous);
    };
  }, []);
}
