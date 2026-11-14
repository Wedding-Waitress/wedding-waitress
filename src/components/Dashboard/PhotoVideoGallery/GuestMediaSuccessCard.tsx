import React from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { GalleryTheme } from '@/lib/galleryTheme';
import styles from '@/pages/guestMediaUpload.module.css';

/** Shared visual shell for successful uploads and Guestbook submissions. */
export function GuestMediaSuccessCard({ theme, greeting, headingRef, children }: React.PropsWithChildren<{
  theme: GalleryTheme; greeting: string; headingRef?: React.Ref<HTMLHeadingElement>;
}>) {
  const accent = theme.themeColor;
  return <Card className={`p-7 sm:p-8 max-w-md w-full text-center ${styles.successPanel}`} data-public-upload-surface="success">
    {theme.logoImageUrl && <img src={theme.logoImageUrl} alt="" className="mx-auto max-h-12 mb-4 object-contain" />}
    <div className="relative inline-flex items-center justify-center mb-5">
      <div className="absolute inset-0 -m-3 rounded-full blur-xl" aria-hidden="true" style={{ backgroundColor: `${accent}1A` }} />
      <div className={`relative w-20 h-20 rounded-full flex items-center justify-center border ${styles.successIconCircle}`}>
        <Heart className="h-10 w-10" style={{ color: accent }} fill={accent} />
        <Sparkles className="absolute -top-1 -right-1 h-5 w-5" style={{ color: accent }} />
      </div>
    </div>
    <h1 ref={headingRef} tabIndex={headingRef ? -1 : undefined} className={`text-3xl font-semibold tracking-tight ${styles.successHeading}`}>{greeting}</h1>
    {children}
  </Card>;
}
