// Photo & Video Sharing dashboard page (parent module)
import React from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/enhanced-button';
import type { Event } from '@/hooks/useEvents';
import { useEventMediaGallery } from '@/hooks/useEventMediaGallery';
import { PinchZoomContainer } from '@/components/ui/PinchZoomContainer';
import { GalleryGuestFeaturesCard } from './GalleryGuestFeaturesCard';
import managementStyles from './photoVideoSharingManagement.module.css';
import styles from './PhotoVideoGalleryLanding.module.css';
import { Camera, LoaderCircle, TriangleAlert, RotateCcw, CalendarDays } from 'lucide-react';

interface Props {
  selectedEventId: string | null;
  onEventSelect: (id: string) => void;
  events: Event[];
  eventsLoading?: boolean;
}

const MANROPE_FONT = "'Manrope', ui-sans-serif, system-ui, sans-serif";

export const PhotoVideoGalleryPage: React.FC<Props> = ({
  selectedEventId,
  onEventSelect,
  events,
  eventsLoading = false,
}) => {
  const {
    meta, loading, error, refresh, setGuestbookEnabled, setPhotoBoothEnabled,
    setSlideshowEnabled, setGuestFeature,
  } = useEventMediaGallery(selectedEventId);

  return (
    <div
      data-photo-video-landing
      className={`${managementStyles.photoVideoLandingContent} ${styles.page}`}
      style={{ fontFamily: MANROPE_FONT }}
    >
      <div className={styles.pageHeading}>
        <Camera size={25} strokeWidth={1.8} className={styles.headingIcon} aria-hidden="true" />
        <div className={styles.headingCopy}>
          <h1>Photo &amp; Video Sharing</h1>
          <p>Let guests upload photos and short videos via QR code.</p>
        </div>
      </div>

      <Card className={styles.eventCard}>
        <label className={styles.eventLabel}>
          <CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" />
          Select event
        </label>
        <Select value={selectedEventId || 'no-event'} onValueChange={onEventSelect}>
          <SelectTrigger className={styles.eventTrigger} aria-label="Select event">
            <span className={styles.eventValue}>
              <CalendarDays size={17} strokeWidth={1.8} aria-hidden="true" />
              <SelectValue placeholder="Select an event…" />
            </span>
          </SelectTrigger>
          <SelectContent className={styles.eventMenu}>
            {eventsLoading ? (
              <SelectItem value="loading" disabled className={styles.eventOption}>Loading…</SelectItem>
            ) : events.length === 0 ? (
              <SelectItem value="none" disabled className={styles.eventOption}>No events yet</SelectItem>
            ) : events.map((event) => (
              <SelectItem key={event.id} value={event.id} className={styles.eventOption}>{event.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {!selectedEventId ? (
        <Card className={styles.stateCard}>
          <Camera strokeWidth={1.8} className={styles.stateIcon} />
          <p>Choose an event to set up its photo &amp; video gallery.</p>
        </Card>
      ) : loading && !meta ? (
        <Card className={styles.stateCard} aria-live="polite">
          <LoaderCircle strokeWidth={1.8} className={`${styles.stateIconSmall} animate-spin`} />
          <p>Loading gallery…</p>
        </Card>
      ) : error && !meta ? (
        <Card className={`${styles.stateCard} ${styles.errorState}`} role="alert">
          <span className={styles.errorIcon}><TriangleAlert strokeWidth={1.8} /></span>
          <div>
            <p className={styles.stateTitle}>Could not load gallery</p>
            <p className={styles.stateDetail}>{error}</p>
          </div>
          <Button variant="outline" className={styles.retryButton} onClick={() => refresh()} disabled={loading}>
            <RotateCcw strokeWidth={1.8} className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Retry
          </Button>
        </Card>
      ) : meta ? (
        <PinchZoomContainer>
          <div>
            {error && (
              <Card className={styles.errorBanner} role="alert">
                <span className={styles.errorIconSmall}><TriangleAlert strokeWidth={1.8} /></span>
                <p>{error}</p>
                <Button variant="outline" size="sm" className={styles.retryButton} onClick={() => refresh()}>
                  <RotateCcw strokeWidth={1.8} className="h-3.5 w-3.5 mr-1" /> Retry
                </Button>
              </Card>
            )}
            <GalleryGuestFeaturesCard
              meta={meta}
              onToggleUpload={(value) => setGuestFeature('guest_upload_enabled', value)}
              onToggleGalleryView={(value) => setGuestFeature('gallery_view_enabled', value)}
              onToggleGuestbook={setGuestbookEnabled}
              onTogglePhotoBooth={setPhotoBoothEnabled}
              onToggleSlideshow={setSlideshowEnabled}
            />
          </div>
        </PinchZoomContainer>
      ) : (
        <Card className={styles.stateCard}>
          <TriangleAlert strokeWidth={1.8} className={styles.warningIcon} />
          <p>Gallery is unavailable for this event.</p>
          <Button variant="outline" className={styles.retryButton} onClick={() => refresh()}>
            <RotateCcw strokeWidth={1.8} className="h-4 w-4 mr-1" /> Retry
          </Button>
        </Card>
      )}
    </div>
  );
};

export default PhotoVideoGalleryPage;
