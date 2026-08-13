// Feature workspace: Photo & Video Sharing (stage 1 — layout foundation).
import React, { useEffect, useMemo, useState } from 'react';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEvents } from '@/hooks/useEvents';
import { useSelectedEvent } from '@/hooks/useSelectedEvent';
import { useEventMediaGallery } from '@/hooks/useEventMediaGallery';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';
import { GalleryUploadAccessCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryUploadAccessCard';
import { publicGalleryItems } from '@/lib/mediaPrivacy';
import { GalleryUsageCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryUsageCard';
import { GalleryGrid } from '@/components/Dashboard/PhotoVideoGallery/GalleryGrid';
import { GalleryDownloadsCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryDownloadsCard';
import { Card } from '@/components/ui/card';
import { LoaderCircle, TriangleAlert } from 'lucide-react';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';

export const GalleryUploadFeaturePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);
  const { events } = useEvents();
  const { selectedEventId, selectedEvent } = useSelectedEvent(events);
  const { meta, items, loading, error, setOpen, deleteItem, deleteItems, setModeration, setAlbum, bulkSetAlbum, setGuestFeature } = useEventMediaGallery(selectedEventId);
  const [saving, setSaving] = useState(false);

  // Public gallery media only — private Guestbook recordings never appear here.
  const publicItems = useMemo(() => publicGalleryItems(items), [items]);

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

  const handleToggle = async (v: boolean) => {
    setSaving(true);
    try {
      await setGuestFeature('guest_upload_enabled', v);
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${managementStyles.photoVideoSharingSurface}`}>
        <LoaderCircle className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <>
      <SeoHead title="Photo & Video Sharing | Wedding Waitress" description="Manage the photos and videos shared by your guests." noIndex />
      <FeatureWorkspaceLayout
        brownOutline
        appearance="photo-video-sharing"
        title="Photo & Video Sharing"
        description="Manage the photos and videos shared by your guests."
        eventName={(selectedEvent as any)?.name}
        enabled={!!meta?.guest_upload_enabled}
        toggleDisabled={saving || loading || !meta}
        onToggle={handleToggle}
        onBack={goBack}
      >
        {loading && !meta ? (
          <Card className="p-12 flex flex-col items-center justify-center gap-3">
            <LoaderCircle className="animate-spin h-6 w-6 text-[#967A59]" />
            <p className="text-sm text-muted-foreground">Loading gallery…</p>
          </Card>
        ) : !meta ? (
          <Card className="p-10 flex flex-col items-center text-center gap-3">
            <TriangleAlert className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground break-words">
              {error || 'Select an event on the Photo & Video Sharing page to manage photo & video sharing.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-6 items-stretch">
            <GalleryUploadAccessCard meta={meta} onToggleOpen={setOpen} appearance="espresso-glass" />
            <GalleryUsageCard meta={meta} items={publicItems} appearance="espresso-glass" />
            <GalleryDownloadsCard
              items={publicItems}
              eventName={(selectedEvent as any)?.name}
              galleryTitle={meta.gallery_title}
              layout="vertical"
              appearance="espresso-glass"
            />
          </div>

          <GalleryGrid
            items={publicItems}
            onDelete={deleteItem}
              onDeleteMany={deleteItems}
            onSetModeration={setModeration}
            onSetAlbum={setAlbum}
            onBulkSetAlbum={bulkSetAlbum}
            eventName={(selectedEvent as any)?.name}
            title="Shared Photos & Videos"
            description="Review, organise, approve, hide and download guest photos and videos."
            hideCardActions
            dark
            appearance="espresso-glass"
          />
        </div>
        )}
      </FeatureWorkspaceLayout>
    </>
  );
};

export default GalleryUploadFeaturePage;
