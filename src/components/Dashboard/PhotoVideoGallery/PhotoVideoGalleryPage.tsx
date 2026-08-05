// Photo & Video Sharing dashboard page (parent module)
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/enhanced-button';
import { useEvents } from '@/hooks/useEvents';
import { useEventMediaGallery } from '@/hooks/useEventMediaGallery';
import { PinchZoomContainer } from '@/components/ui/PinchZoomContainer';
import { GalleryGuestFeaturesCard } from './GalleryGuestFeaturesCard';

import { Camera, LoaderCircle, TriangleAlert, RotateCcw, CalendarDays } from 'lucide-react';

interface Props {
  selectedEventId: string | null;
  onEventSelect: (id: string) => void;
}

export const PhotoVideoGalleryPage: React.FC<Props> = ({ selectedEventId, onEventSelect }) => {
  const { events, loading: eventsLoading } = useEvents();
  const { meta, loading, error, refresh, setGuestbookEnabled, setPhotoBoothEnabled, setPhotoBoothMode, updatePhotoBoothTemplate, setSlideshowEnabled, setGuestFeature } = useEventMediaGallery(selectedEventId);

  return (
    <div
      className="space-y-6 -m-4 p-4 pb-8 sm:-m-6 sm:p-6 sm:pb-12 rounded-none overflow-x-hidden min-h-screen"
      style={{ backgroundColor: '#472c1d' }}
    >
      <div className="flex items-start gap-3">
        <Camera className="h-6 w-6 text-[#967A59] shrink-0 mt-1" />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white break-words">Photo &amp; Video Sharing</h1>
          <p className="text-sm text-white/80 break-words">Let guests upload photos and short videos via QR code.</p>
        </div>
      </div>


      <Card className="p-4">
        <label className="text-sm font-medium block mb-2">Select event</label>
        <Select value={selectedEventId || 'no-event'} onValueChange={onEventSelect}>
          <SelectTrigger className="h-11 text-base"><SelectValue placeholder="Select an event…" /></SelectTrigger>
          <SelectContent>
            {eventsLoading ? (
              <SelectItem value="loading" disabled>Loading…</SelectItem>
            ) : events.length === 0 ? (
              <SelectItem value="none" disabled>No events yet</SelectItem>
            ) : events.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {!selectedEventId ? (
        <Card className="p-12 text-center">
          <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Choose an event to set up its photo &amp; video gallery.</p>
        </Card>
      ) : loading && !meta ? (
        <Card className="p-12 flex flex-col items-center justify-center gap-3">
          <LoaderCircle className="animate-spin h-6 w-6 text-[#967A59]" />
          <p className="text-sm text-muted-foreground">Loading gallery…</p>
        </Card>
      ) : error && !meta ? (
        <Card className="p-8 flex flex-col items-center text-center gap-3">
          <TriangleAlert className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium text-foreground">Could not load gallery</p>
            <p className="text-sm text-muted-foreground mt-1 break-words">{error}</p>
          </div>
          <Button variant="outline" className="lv-premium-shade" onClick={() => refresh()} disabled={loading}>
            <RotateCcw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Retry
          </Button>
        </Card>
      ) : meta ? (
        <PinchZoomContainer naturalWidth={1000}>
          <div className="space-y-8">

            {error && (
              <Card className="p-3 flex items-center gap-2 border-destructive/40">
                <TriangleAlert className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive flex-1 break-words">{error}</p>
                <Button variant="outline" size="sm" className="lv-premium-shade" onClick={() => refresh()}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Retry
                </Button>
              </Card>
            )}
            <GalleryGuestFeaturesCard
              meta={meta}
              onToggleUpload={(v) => setGuestFeature('guest_upload_enabled', v)}
              onToggleGalleryView={(v) => setGuestFeature('gallery_view_enabled', v)}
              onToggleGuestbook={setGuestbookEnabled}
              onTogglePhotoBooth={setPhotoBoothEnabled}
              onToggleSlideshow={setSlideshowEnabled}
            />
          </div>
        </PinchZoomContainer>
      ) : (
        <Card className="p-8 flex flex-col items-center text-center gap-3">
          <TriangleAlert className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Gallery is unavailable for this event.</p>
          <Button variant="outline" className="lv-premium-shade" onClick={() => refresh()}>
            <RotateCcw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </Card>
      )}
    </div>
  );
};


export default PhotoVideoGalleryPage;
