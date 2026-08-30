// Feature workspace: Digital Guestbook (unified — written, audio and video messages)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhotoVideoFeatureWorkspace, type PhotoVideoWorkspaceSelection } from '@/hooks/usePhotoVideoFeatureWorkspace';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';
import { FeatureWorkspaceStatePanel } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceStatePanel';
import { GalleryTextGuestbookAccessCard, buildTextGuestbookUrl } from '@/components/Dashboard/PhotoVideoGallery/GalleryTextGuestbookAccessCard';
import { GalleryTextGuestbookStepsCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryTextGuestbookStepsCard';
import { GalleryGuestbookMessagesCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryGuestbookMessagesCard';
import { Button } from '@/components/ui/enhanced-button';
import { ExternalLink } from 'lucide-react';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';

export const GalleryTextGuestbookFeaturePage: React.FC<PhotoVideoWorkspaceSelection> = (selection) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedEventId, selectedEvent, selectionStatus, meta, items, loading, error, setModeration, setGuestbookEnabled, setGuestbookShare } = usePhotoVideoFeatureWorkspace(selection);
  const [saving, setSaving] = useState(false);

  const goBack = () => navigate('/dashboard?tab=photo-video-gallery');
  const guestUrl = buildTextGuestbookUrl(meta?.primary_token ?? null);


  const handleToggle = async (v: boolean) => {
    setSaving(true);
    try {
      await setGuestbookEnabled(v);
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Digital Guestbook | Wedding Waitress"
        description="Read and manage private written, audio and video messages and well wishes from your guests."
        noIndex
      />
      <FeatureWorkspaceLayout
        brownOutline
        backgroundAppearance="photo-video-sharing"
        controlsAppearance="photo-video-sharing"
        title="Digital Guestbook"
        description="Read and manage private written, audio and video messages and well wishes from your guests."
        eventName={(selectedEvent as any)?.name}
        selectionStatus={selectionStatus}
        enabled={!!meta?.guestbook_text_enabled || !!meta?.voice_guestbook_enabled}
        toggleDisabled={saving || !meta}
        onToggle={handleToggle}
        onBack={goBack}
        disabledNotice="This feature is currently turned off for your guests. You can still manage existing messages and preview the Digital Guestbook."
        headerAction={
          <Button
            variant="outline"
            className={`lv-premium-shade text-white border ${managementStyles.glassAction} ${managementStyles.workspaceHeaderAction}`}
            disabled={!guestUrl}
            onClick={() => guestUrl && window.open(guestUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4 mr-1" strokeWidth={1.8} /> Preview as Guest
          </Button>
        }
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




            <GalleryGuestbookMessagesCard
              eventId={selectedEventId}
              items={items}
              eventName={(selectedEvent as any)?.name}
              loading={loading}
              error={error}
              onSetItemModeration={setModeration}
              onSetGuestbookShare={setGuestbookShare}
              appearance="espresso-glass"
            />
          </div>
        )}
      </FeatureWorkspaceLayout>
    </>
  );
};

export default GalleryTextGuestbookFeaturePage;
