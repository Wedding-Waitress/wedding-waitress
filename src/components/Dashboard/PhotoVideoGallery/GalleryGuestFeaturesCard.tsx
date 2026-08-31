// Guest Features card — enable/disable guest-facing features per event.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { SlidersHorizontal, CloudUpload, Images, BookHeart, Camera, Presentation, Settings2, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';
import styles from './PhotoVideoGalleryLanding.module.css';

interface Props {
  meta: GalleryMeta;
  onToggleUpload: (value: boolean) => Promise<void>;
  onToggleGalleryView: (value: boolean) => Promise<void>;
  /** Unified Digital Guestbook toggle — written, audio and video messages together. */
  onToggleGuestbook: (value: boolean) => Promise<void>;
  onTogglePhotoBooth: (value: boolean) => Promise<void>;
  onToggleSlideshow: (value: boolean) => Promise<void>;
}

export const GalleryGuestFeaturesCard: React.FC<Props> = ({
  meta, onToggleUpload, onToggleGalleryView, onToggleGuestbook,
  onTogglePhotoBooth, onToggleSlideshow,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: (value: boolean) => Promise<void>, value: boolean) => {
    setBusy(key);
    try {
      await fn(value);
    } catch (error: unknown) {
      toast({
        title: 'Could not update',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const features: {
    key: string; title: string; desc: string; Icon: LucideIcon; checked: boolean;
    fn: (value: boolean) => Promise<void>; href: string;
  }[] = [
    { key: 'upload', Icon: CloudUpload, title: 'Photo & Video Sharing', desc: 'Let guests share photos and videos from your event', checked: !!meta.guest_upload_enabled, fn: onToggleUpload, href: '/dashboard/photo-video-gallery/photo-video-sharing' },
    { key: 'view', Icon: Images, title: 'Photo & Video Gallery View', desc: 'Let guests browse the shared gallery', checked: !!meta.gallery_view_enabled, fn: onToggleGalleryView, href: '/dashboard/photo-video-gallery/gallery-view' },
    { key: 'guestbook', Icon: BookHeart, title: 'Digital Guestbook', desc: 'Let guests leave private written, audio or video messages and well wishes', checked: !!meta.guestbook_text_enabled || !!meta.voice_guestbook_enabled, fn: onToggleGuestbook, href: '/dashboard/photo-video-gallery/digital-guestbook' },
    { key: 'booth', Icon: Camera, title: 'Digital Photo Booth', desc: 'Let guests use the on-screen digital photo booth', checked: !!meta.photo_booth_enabled, fn: onTogglePhotoBooth, href: '/dashboard/photo-video-gallery/digital-photo-booth' },
    { key: 'slideshow', Icon: Presentation, title: 'Live Slideshow', desc: 'Display uploaded photos in a live slideshow', checked: !!meta.slideshow_enabled, fn: onToggleSlideshow, href: '/dashboard/photo-video-gallery/live-slideshow' },
  ];

  const preloadWorkspace = (key: string) => {
    if (key === 'upload') void import('@/pages/GalleryUploadFeaturePage');
    if (key === 'view') void import('@/pages/GalleryViewFeaturePage');
    if (key === 'guestbook') void import('@/pages/GalleryTextGuestbookFeaturePage');
    if (key === 'booth') void import('@/pages/GalleryPhotoBoothFeaturePage');
    if (key === 'slideshow') void import('@/pages/GallerySlideshowFeaturePage');
  };

  return (
    <Card className={styles.featuresPanel}>
      <div className={styles.featuresHeading}>
        <h2><SlidersHorizontal size={22} strokeWidth={1.8} aria-hidden="true" /> Guest Experience Features</h2>
        <p>Enable or disable the features your guests can see and use.</p>
      </div>

      <div className={styles.featureGrid}>
        {features.map((feature) => (
          <div
            key={feature.key}
            className={`${styles.featureCard} ${busy === feature.key ? styles.featureCardBusy : ''}`}
            aria-busy={busy === feature.key}
          >
            <div className={styles.featureCopy}>
              <feature.Icon size={24} strokeWidth={1.8} aria-hidden="true" />
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>

            <div className={styles.featureControls}>
              <button
                type="button"
                aria-label={`Manage ${feature.title}`}
                onClick={(event) => { event.preventDefault(); event.stopPropagation(); navigate(feature.href); }}
                onPointerEnter={() => preloadWorkspace(feature.key)}
                onPointerDown={() => preloadWorkspace(feature.key)}
                onFocus={() => preloadWorkspace(feature.key)}
                className={styles.manageButton}
              >
                <span className={styles.manageIcon} aria-hidden="true"><Settings2 size={13} strokeWidth={1.8} /></span>
                <span>Manage</span>
                <ChevronRight size={13} strokeWidth={1.8} aria-hidden="true" />
              </button>

              <div className={styles.switchControl}>
                <span>{feature.checked ? 'On' : 'Off'}</span>
                <Switch
                  checked={feature.checked}
                  disabled={busy === feature.key}
                  onCheckedChange={(value) => run(feature.key, feature.fn, value)}
                  aria-label={feature.title}
                  className={styles.featureSwitch}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default GalleryGuestFeaturesCard;
