// Feature workspace: Digital Photo Booth
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhotoVideoFeatureWorkspace, type PhotoVideoWorkspaceSelection } from '@/hooks/usePhotoVideoFeatureWorkspace';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';
import { FeatureWorkspaceStatePanel } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceStatePanel';
import { GalleryPhotoBoothAccessCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryPhotoBoothAccessCard';
import { GalleryPhotoBoothStepsCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryPhotoBoothStepsCard';
import { GalleryPhotoBoothTemplatesCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryPhotoBoothTemplatesCard';
import { categoryOf } from '@/lib/mediaPrivacy';
import { GalleryGrid } from '@/components/Dashboard/PhotoVideoGallery/GalleryGrid';
import { PhotoBoothDownloadAllButton } from '@/components/Dashboard/PhotoVideoGallery/PhotoBoothDownloadAllButton';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';

export const GalleryPhotoBoothFeaturePage: React.FC<Partial<PhotoVideoWorkspaceSelection>> = (selection) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    selectedEventId, selectedEvent, selectionStatus, meta, items, error,
    deleteItem, deleteItems, setModeration, setAlbum, bulkSetAlbum,
    setPhotoBoothEnabled, setPhotoBoothMode, updatePhotoBoothTemplate,
  } = usePhotoVideoFeatureWorkspace(selection);
  const [saving, setSaving] = useState(false);

  const goBack = () => navigate('/dashboard?tab=photo-video-gallery');


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

  return (
    <>
      <SeoHead
        title="Digital Photo Booth | Wedding Waitress"
        description="Let guests take photos on their phone or tablet and send them directly to your event gallery."
        noIndex
      />
      <FeatureWorkspaceLayout
        managerChrome
        hideSelectedEventPanel
        backgroundAppearance="photo-video-sharing"
        controlsAppearance="photo-video-sharing"
        title="Digital Photo Booth"
        description="Let guests take photos on their phone or tablet and send them directly to your event gallery."
        eventName={(selectedEvent as any)?.name}
        selectionStatus={selectionStatus}
        enabled={!!meta?.photo_booth_enabled}
        toggleDisabled={saving || !meta}
        onToggle={handleToggle}
        onBack={goBack}
        guestPreviewToken={meta?.primary_token ?? null}
        brownOutline
        disabledNotice="This feature is currently turned off for your guests. You can still manage and preview the Digital Photo Booth."
      >
        {selectionStatus !== 'selected' || !meta ? (
          <FeatureWorkspaceStatePanel
            state={selectionStatus === 'loading' ? 'loading' : selectionStatus === 'empty' ? 'empty' : 'error'}
            loadingLabel="Loading Digital Photo Booth…"
            emptyLabel="Select an event on the Photo & Video Sharing page to manage the Digital Photo Booth."
            error={error}
          />
        ) : (
          <div className="pb-page space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <GalleryPhotoBoothStepsCard appearance="espresso-glass" />
              <GalleryPhotoBoothAccessCard meta={meta} appearance="espresso-glass" />
            </div>

            {selectedEventId && (
              <GalleryPhotoBoothTemplatesCard
                eventId={selectedEventId}
                meta={meta}
                eventName={(selectedEvent as any)?.name}
                eventDate={(selectedEvent as any)?.date}
                onSave={updatePhotoBoothTemplate}
                appearance="espresso-glass"
              />
            )}



          </div>
        )}
      </FeatureWorkspaceLayout>
    </>
  );
};

export default GalleryPhotoBoothFeaturePage;
