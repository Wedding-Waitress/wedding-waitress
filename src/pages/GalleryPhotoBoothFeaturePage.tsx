// Feature workspace: Digital Photo Booth
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEvents } from '@/hooks/useEvents';
import { useSelectedEvent } from '@/hooks/useSelectedEvent';
import { useEventMediaGallery } from '@/hooks/useEventMediaGallery';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';
import { GalleryPhotoBoothAccessCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryPhotoBoothAccessCard';
import { GalleryPhotoBoothStepsCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryPhotoBoothStepsCard';
import { GalleryPhotoBoothTemplatesCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryPhotoBoothTemplatesCard';
import { categoryOf } from '@/lib/mediaPrivacy';
import { GalleryGrid } from '@/components/Dashboard/PhotoVideoGallery/GalleryGrid';
import { PhotoBoothDownloadAllButton } from '@/components/Dashboard/PhotoVideoGallery/PhotoBoothDownloadAllButton';
import { Button } from '@/components/ui/enhanced-button';
import { Card } from '@/components/ui/card';
import { LoaderCircle, TriangleAlert, Camera } from 'lucide-react';
import { buildGalleryGuestAppUrl } from '@/lib/urlUtils';

export const GalleryPhotoBoothFeaturePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);
  const { events } = useEvents();
  const { selectedEventId, selectedEvent } = useSelectedEvent(events);
  const {
    meta, items, loading, error,
    deleteItem, deleteItems, setModeration, setAlbum, bulkSetAlbum,
    setPhotoBoothEnabled, setPhotoBoothMode, updatePhotoBoothTemplate,
  } = useEventMediaGallery(selectedEventId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/');
      else setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate('/');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const goBack = () => navigate('/dashboard?tab=photo-video-gallery');

  const boothUrl = buildGalleryGuestAppUrl(meta?.primary_token);

  // Filtered view of the existing uploads — Digital Photo Booth captures only.
  const boothItems = useMemo(() => items.filter(i => categoryOf(i) === 'photo_booth'), [items]);

  const handleToggle = async (v: boolean) => {
    setSaving(true);
    try {
      await setPhotoBoothEnabled(v);
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#472c1d' }}>
        <LoaderCircle className="h-6 w-6 animate-spin text-white" strokeWidth={1.8} />
      </div>
    );
  }

  return (
    <>
      <SeoHead
        title="Digital Photo Booth | Wedding Waitress"
        description="Let guests take photos on their phone or tablet and send them directly to your event gallery."
        noIndex
      />
      <FeatureWorkspaceLayout
        title="Digital Photo Booth"
        description="Let guests take photos on their phone or tablet and send them directly to your event gallery."
        eventName={(selectedEvent as any)?.name}
        enabled={!!meta?.photo_booth_enabled}
        toggleDisabled={saving || loading || !meta}
        onToggle={handleToggle}
        onBack={goBack}
        brownOutline
        disabledNotice="This feature is currently turned off for your guests. You can still manage and preview the Digital Photo Booth."
        headerAction={
          <Button
            variant="outline"
            className="lv-premium-shade bg-white/10 text-white border-white/40 hover:bg-white hover:text-[#967A59]"
            disabled={!boothUrl}
            onClick={() => boothUrl && window.open(boothUrl, '_blank', 'noopener,noreferrer')}
          >
            <Camera className="h-4 w-4 mr-1" /> Launch Digital Photo Booth
          </Button>
        }
      >
        {loading && !meta ? (
          <Card className="p-12 flex flex-col items-center justify-center gap-3">
            <LoaderCircle className="animate-spin h-6 w-6 text-[#967A59]" strokeWidth={1.8} />
            <p className="text-sm text-muted-foreground">Loading Digital Photo Booth…</p>
          </Card>
        ) : !meta ? (
          <Card className="p-10 flex flex-col items-center text-center gap-3">
            <TriangleAlert className="h-8 w-8 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-sm text-muted-foreground break-words">
              {error || 'Select an event on the Photo & Video Sharing page to manage the Digital Photo Booth.'}
            </p>
          </Card>
        ) : (
          <div className="pb-page space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <GalleryPhotoBoothStepsCard />
              <GalleryPhotoBoothAccessCard meta={meta} />
            </div>

            {selectedEventId && (
              <GalleryPhotoBoothTemplatesCard
                eventId={selectedEventId}
                meta={meta}
                eventName={(selectedEvent as any)?.name}
                eventDate={(selectedEvent as any)?.date}
                onSave={updatePhotoBoothTemplate}
              />
            )}

            <GalleryGrid
              items={boothItems}
              onDelete={deleteItem}
              onDeleteMany={deleteItems}
              onSetModeration={setModeration}
              onSetAlbum={setAlbum}
              onBulkSetAlbum={bulkSetAlbum}
              boothSetOrder
              eventName={(selectedEvent as any)?.name}
              title="Digital Photo Booth Captures"
              description="Review, organise, approve, hide and download photos taken in your Digital Photo Booth."
              emptyText="No Digital Photo Booth captures yet — share the QR code with your guests."
              toolbarRight={
                <PhotoBoothDownloadAllButton
                  items={boothItems}
                  eventName={(selectedEvent as any)?.name}
                  galleryTitle={meta.gallery_title}
                  className="!h-9"
                />
              }
            />

          </div>
        )}
      </FeatureWorkspaceLayout>
    </>
  );
};

export default GalleryPhotoBoothFeaturePage;
