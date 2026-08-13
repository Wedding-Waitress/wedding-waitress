// Photo & Video Sharing dashboard page (parent module)
import React, { useState } from 'react';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
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

const MANROPE_FONT = "'Manrope', ui-sans-serif, system-ui, sans-serif";

const EVENT_FIELD_GLASS_STYLE: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255, 239, 218, 0.08) 0%, rgba(17, 9, 7, 0.68) 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255, 244, 229, 0.14), 0 1px 3px rgba(0, 0, 0, 0.22)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  fontFamily: MANROPE_FONT,
};

const EVENT_MENU_GLASS_STYLE: React.CSSProperties = {
  ...EVENT_FIELD_GLASS_STYLE,
  background: 'linear-gradient(180deg, rgba(255, 239, 218, 0.08) 0%, rgba(17, 9, 7, 0.68) 100%), rgba(22, 11, 8, 0.95)',
};

const GLASS_PANEL_CLASS_NAME = '!bg-none !bg-[#21130f]/62 !border-[#c9975d]/40 !shadow-[inset_0_1px_0_rgba(255,239,218,0.21),0_18px_42px_rgba(3,1,1,0.42)]';
const GLASS_PANEL_STYLE: React.CSSProperties = { backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' };

export const PhotoVideoGalleryPage: React.FC<Props> = ({ selectedEventId, onEventSelect }) => {
  const { events, loading: eventsLoading } = useEvents();
  const { meta, loading, error, refresh, setGuestbookEnabled, setPhotoBoothEnabled, setPhotoBoothMode, updatePhotoBoothTemplate, setSlideshowEnabled, setGuestFeature } = useEventMediaGallery(selectedEventId);

  return (
    <div
      className="space-y-6 -m-4 p-4 pb-8 sm:-m-6 sm:p-6 sm:pb-12 rounded-none overflow-x-hidden min-h-screen"
      style={{
        backgroundColor: '#1a0c07',
        backgroundImage: [
          'radial-gradient(ellipse 18% 50% at 96% 102%, rgba(255, 111, 24, 0.62), rgba(216, 74, 14, 0.3) 30%, rgba(132, 42, 10, 0.11) 58%, transparent 82%)',
          'linear-gradient(116deg, transparent 61%, rgba(255, 178, 105, 0.025) 67%, rgba(242, 132, 53, 0.13) 74%, rgba(199, 76, 20, 0.065) 81%, transparent 89%)',
          'radial-gradient(ellipse 68% 62% at 52% 34%, rgba(104, 47, 21, 0.3), rgba(65, 27, 14, 0.16) 52%, transparent 78%)',
          'radial-gradient(ellipse 50% 38% at 68% 4%, rgba(138, 60, 22, 0.18), transparent 72%)',
          'radial-gradient(ellipse at center, transparent 48%, rgba(4, 2, 1, 0.48) 100%)',
          'linear-gradient(145deg, #180b07 0%, #351609 30%, #291108 58%, #160907 78%, #080403 100%)',
        ].join(', '),
        fontFamily: MANROPE_FONT,
      }}
    >
      <div className="flex items-start gap-2">
        <Camera size={25} strokeWidth={1.8} className="text-[#967A59] shrink-0 mt-1" aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-[-0.012em] leading-tight text-white break-words">Photo &amp; Video Sharing</h1>
          <p className="text-sm font-normal text-white/80 break-words">Let guests upload photos and short videos via QR code.</p>
        </div>
      </div>


      <Card
        className={`p-4 ${GLASS_PANEL_CLASS_NAME}`}
        style={GLASS_PANEL_STYLE}
      >
        <label className="text-sm font-medium text-white flex items-center gap-2 mb-2">
          <CalendarDays size={18} strokeWidth={1.8} className="text-[#d9b77f] shrink-0" aria-hidden="true" />
          Select event
        </label>
        <Select value={selectedEventId || 'no-event'} onValueChange={onEventSelect}>
          <SelectTrigger
            className="h-11 text-sm font-medium text-white border-[#b9824d]/40 [&>svg]:text-[#ead8bd] [&>svg]:opacity-100"
            style={EVENT_FIELD_GLASS_STYLE}
          >
            <span className="flex min-w-0 items-center gap-2">
              <CalendarDays size={17} strokeWidth={1.8} className="text-[#d9b77f] shrink-0" aria-hidden="true" />
              <SelectValue placeholder="Select an event…" />
            </span>
          </SelectTrigger>
          <SelectContent
            className="!border-[#b9824d]/40 text-white"
            style={EVENT_MENU_GLASS_STYLE}
          >
            {eventsLoading ? (
              <SelectItem
                value="loading"
                disabled
                className="text-sm font-medium text-white focus:!bg-[#8b4d28]/60 focus:!text-white data-[state=checked]:!bg-[#73401f]/55 data-[state=checked]:!text-white [&_svg]:text-[#e4ad6d] [&_svg]:opacity-100"
              >Loading…</SelectItem>
            ) : events.length === 0 ? (
              <SelectItem
                value="none"
                disabled
                className="text-sm font-medium text-white focus:!bg-[#8b4d28]/60 focus:!text-white data-[state=checked]:!bg-[#73401f]/55 data-[state=checked]:!text-white [&_svg]:text-[#e4ad6d] [&_svg]:opacity-100"
              >No events yet</SelectItem>
            ) : events.map(e => (
              <SelectItem
                key={e.id}
                value={e.id}
                className="text-sm font-medium text-white focus:!bg-[#8b4d28]/60 focus:!text-white data-[state=checked]:!bg-[#73401f]/55 data-[state=checked]:!text-white [&_svg]:text-[#e4ad6d] [&_svg]:opacity-100"
              >{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>


      {!selectedEventId ? (
        <Card className={`p-12 text-center ${GLASS_PANEL_CLASS_NAME}`} style={GLASS_PANEL_STYLE}>
          <Camera strokeWidth={1.8} className="h-12 w-12 mx-auto mb-3 text-[#d9b77f]" />
          <p className="font-normal text-white">Choose an event to set up its photo &amp; video gallery.</p>
        </Card>
      ) : loading && !meta ? (
        <Card className={`p-12 flex flex-col items-center justify-center gap-3 ${GLASS_PANEL_CLASS_NAME}`} style={GLASS_PANEL_STYLE}>
          <LoaderCircle strokeWidth={1.8} className="animate-spin h-6 w-6 text-[#d9b77f]" />
          <p className="text-sm font-normal text-white">Loading gallery…</p>
        </Card>
      ) : error && !meta ? (
        <Card className="p-8 flex flex-col items-center text-center gap-3">
          <TriangleAlert strokeWidth={1.8} className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium text-foreground">Could not load gallery</p>
            <p className="text-sm text-muted-foreground mt-1 break-words">{error}</p>
          </div>
          <Button variant="outline" className="lv-premium-shade" onClick={() => refresh()} disabled={loading}>
            <RotateCcw strokeWidth={1.8} className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Retry
          </Button>
        </Card>
      ) : meta ? (
        <PinchZoomContainer naturalWidth={1000}>
          <div className="space-y-8">

            {error && (
              <Card className="p-3 flex items-center gap-2 border-destructive/40">
                <TriangleAlert strokeWidth={1.8} className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive flex-1 break-words">{error}</p>
                <Button variant="outline" size="sm" className="lv-premium-shade" onClick={() => refresh()}>
                  <RotateCcw strokeWidth={1.8} className="h-3.5 w-3.5 mr-1" /> Retry
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
          <TriangleAlert strokeWidth={1.8} className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Gallery is unavailable for this event.</p>
          <Button variant="outline" className="lv-premium-shade" onClick={() => refresh()}>
            <RotateCcw strokeWidth={1.8} className="h-4 w-4 mr-1" /> Retry
          </Button>
        </Card>
      )}
    </div>
  );
};


export default PhotoVideoGalleryPage;
