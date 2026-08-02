// Photo & Video Gallery dashboard page
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/enhanced-button';
import { useEvents } from '@/hooks/useEvents';
import { useEventMediaGallery } from '@/hooks/useEventMediaGallery';
import { PinchZoomContainer } from '@/components/ui/PinchZoomContainer';
import { GallerySetupCard } from './GallerySetupCard';
import { GalleryUsageCard } from './GalleryUsageCard';
import { GalleryPasswordCard } from './GalleryPasswordCard';

import { GalleryGrid } from './GalleryGrid';
import { GalleryDownloadsCard } from './GalleryDownloadsCard';
import { GalleryBrandingCard } from './GalleryBrandingCard';
import { GalleryGuestbookCard } from './GalleryGuestbookCard';
import { GalleryPhotoBoothCard } from './GalleryPhotoBoothCard';
import { GalleryPhotoBoothTemplatesCard } from './GalleryPhotoBoothTemplatesCard';
import { GallerySlideshowCard } from './GallerySlideshowCard';
import { GuestbookMessagesList } from './GuestbookMessagesList';
import { Camera, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  selectedEventId: string | null;
  onEventSelect: (id: string) => void;
}

export const PhotoVideoGalleryPage: React.FC<Props> = ({ selectedEventId, onEventSelect }) => {
  const { events, loading: eventsLoading } = useEvents();
  const { meta, items, loading, error, refresh, setOpen, deleteItem, setModeration, setPassword, updateBranding, setAlbum, bulkSetAlbum, setVoiceGuestbookEnabled, setPhotoBoothEnabled, setPhotoBoothMode, updatePhotoBoothTemplate, setSlideshowEnabled } = useEventMediaGallery(selectedEventId);

  return (
    <div
      className="space-y-6 -m-4 p-4 sm:-m-6 sm:p-6 rounded-none"
      style={{
        backgroundImage: "url('/gallery-page-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="flex items-center gap-3">
        <Camera className="h-6 w-6 text-[#967A59]" />
        <div>
          <h1 className="text-2xl font-bold text-white">Photo &amp; Video Gallery</h1>
          <p className="text-sm text-white/80">Let guests upload photos and short videos via QR code.</p>
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
          <Loader2 className="animate-spin h-6 w-6 text-[#967A59]" />
          <p className="text-sm text-muted-foreground">Loading gallery…</p>
        </Card>
      ) : error && !meta ? (
        <Card className="p-8 flex flex-col items-center text-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium text-foreground">Could not load gallery</p>
            <p className="text-sm text-muted-foreground mt-1 break-words">{error}</p>
          </div>
          <Button variant="outline" className="lv-premium-shade" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Retry
          </Button>
        </Card>
      ) : meta ? (
        <PinchZoomContainer naturalWidth={1000}>
          <div className="space-y-8">

            {error && (
              <Card className="p-3 flex items-center gap-2 border-destructive/40">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive flex-1 break-words">{error}</p>
                <Button variant="outline" size="sm" className="lv-premium-shade" onClick={() => refresh()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                </Button>
              </Card>
            )}
            <Section title="Guest access" subtitle="The QR code and link your guests use.">
              <GallerySetupCard meta={meta} onToggleOpen={setOpen} />
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section title="Branding & theme" subtitle="How the gallery looks to your guests.">
                <GalleryBrandingCard eventId={selectedEventId} meta={meta} onSave={updateBranding} />
              </Section>
            </div>

            <Section title="Password protection" subtitle="Control who can upload or view the gallery.">
              <GalleryPasswordCard passwordEnabled={meta.password_enabled} hasPassword={meta.has_password} onSave={setPassword} />
            </Section>

            <Section title="Overview" subtitle="Usage for this event's gallery.">
              <GalleryUsageCard meta={meta} items={items} />
            </Section>

            <Section title="Guest experiences" subtitle="Optional extras guests can use on the day.">

              <GalleryGuestbookCard meta={meta} onToggleVoice={setVoiceGuestbookEnabled} />
              <GalleryPhotoBoothCard meta={meta} onToggle={setPhotoBoothEnabled} onModeChange={setPhotoBoothMode} />
              {meta.photo_booth_enabled && (
                <GalleryPhotoBoothTemplatesCard
                  eventId={selectedEventId}
                  meta={meta}
                  eventName={events.find(e => e.id === selectedEventId)?.name}
                  eventDate={(events.find(e => e.id === selectedEventId) as any)?.date}
                  onSave={updatePhotoBoothTemplate}
                />
              )}
              <GallerySlideshowCard meta={meta} onToggle={setSlideshowEnabled} />
            </Section>

            <Section title="Media library" subtitle="Moderate, organise, download and read guest messages.">
              <GalleryGrid items={items} onDelete={deleteItem} onSetModeration={setModeration} onSetAlbum={setAlbum} onBulkSetAlbum={bulkSetAlbum} />
              <GalleryDownloadsCard
                items={items}
                eventName={events.find(e => e.id === selectedEventId)?.name}
                galleryTitle={meta.gallery_title}
              />
              <GuestbookMessagesList eventId={selectedEventId} items={items} />
            </Section>
          </div>
        </PinchZoomContainer>
      ) : (
        <Card className="p-8 flex flex-col items-center text-center gap-3">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Gallery is unavailable for this event.</p>
          <Button variant="outline" className="lv-premium-shade" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </Card>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <section className="space-y-3">
    <div className="px-0.5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#967A59]">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

export default PhotoVideoGalleryPage;
