// Feature workspace: Photo & Video Sharing (stage 1 — layout foundation).
import React, { useEffect, useMemo, useState } from 'react';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePhotoVideoFeatureWorkspace } from '@/hooks/usePhotoVideoFeatureWorkspace';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';
import { FeatureWorkspaceStatePanel } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceStatePanel';
import { GalleryUploadAccessCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryUploadAccessCard';
import { publicGalleryItems } from '@/lib/mediaPrivacy';
import { GalleryUsageCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryUsageCard';
import { GalleryGrid } from '@/components/Dashboard/PhotoVideoGallery/GalleryGrid';
import { GalleryDownloadsCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryDownloadsCard';
import { LoaderCircle } from 'lucide-react';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';

export const GalleryUploadFeaturePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);
  const { selectedEventId, selectedEvent, selectionStatus, meta, items, error, setOpen, deleteItem, deleteItems, setModeration, setAlbum, bulkSetAlbum, setGuestFeature } = usePhotoVideoFeatureWorkspace();
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
        selectionStatus={selectionStatus}
        enabled={!!meta?.guest_upload_enabled}
        toggleDisabled={saving || !meta}
        onToggle={handleToggle}
        onBack={goBack}
      >
        {selectionStatus !== 'selected' || !meta ? (
          <FeatureWorkspaceStatePanel
            state={selectionStatus === 'loading' ? 'loading' : selectionStatus === 'empty' ? 'empty' : 'error'}
            loadingLabel="Loading gallery…"
            emptyLabel="Select an event on the Photo & Video Sharing page to manage photo & video sharing."
            error={error}
          />
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
