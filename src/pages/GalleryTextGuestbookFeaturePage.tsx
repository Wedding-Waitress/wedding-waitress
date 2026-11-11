// Feature workspace: Digital Guestbook (unified — written, audio and video messages)
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhotoVideoFeatureWorkspace, type PhotoVideoWorkspaceSelection } from '@/hooks/usePhotoVideoFeatureWorkspace';
import { SeoHead } from '@/components/SEO/SeoHead';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';
import { FeatureWorkspaceStatePanel } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceStatePanel';
import { GalleryTextGuestbookAccessCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryTextGuestbookAccessCard';
import { GalleryTextGuestbookStepsCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryTextGuestbookStepsCard';
import { GalleryGuestbookMessagesCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryGuestbookMessagesCard';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';

export const GalleryTextGuestbookFeaturePage: React.FC<Partial<PhotoVideoWorkspaceSelection>> = (selection) => {
  const navigate = useNavigate();
  const { selectedEventId, selectedEvent, selectionStatus, meta, items, loading, error, refreshRecordings, setModeration } = usePhotoVideoFeatureWorkspace(selection);

  const goBack = () => navigate('/dashboard?tab=photo-video-gallery');



  return (
    <>
      <SeoHead
        title="Digital Guestbook | Wedding Waitress"
        description="Read and manage written, audio and video messages and well wishes from your guests."
        noIndex
      />
      <FeatureWorkspaceLayout
        hideSelectedEventPanel
        brownOutline
        backgroundAppearance="photo-video-sharing"
        controlsAppearance="photo-video-sharing"
        title="Digital Guestbook"
        description="Read and manage written, audio and video messages and well wishes from your guests."
        eventName={(selectedEvent as any)?.name}
        selectionStatus={selectionStatus}
        enabled
        hideAvailabilityControl
        onToggle={() => {}}
        onBack={goBack}
        guestPreviewToken={meta?.primary_token ?? null}
      >
        {selectionStatus !== 'selected' || !meta ? (
          <FeatureWorkspaceStatePanel
            state={selectionStatus === 'loading' ? 'loading' : selectionStatus === 'empty' ? 'empty' : 'error'}
            loadingLabel="Loading Digital Guestbook…"
            emptyLabel="Select an event on the Photo & Video Sharing page to manage the Digital Guestbook."
            error={error}
          />
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <div
              className="grid grid-cols-1 gap-6 items-stretch md:grid-cols-[minmax(0,9fr)_minmax(0,11fr)]"
              data-guestbook-upper-grid
            >
              <GalleryTextGuestbookStepsCard appearance="espresso-glass" />
              <GalleryTextGuestbookAccessCard meta={meta} appearance="espresso-glass" />
            </div>





          </div>
        )}
      </FeatureWorkspaceLayout>
    </>
  );
};

export default GalleryTextGuestbookFeaturePage;
