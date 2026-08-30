// Feature workspace: Live Slideshow
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhotoVideoFeatureWorkspace, type PhotoVideoWorkspaceSelection } from '@/hooks/usePhotoVideoFeatureWorkspace';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';
import { FeatureWorkspaceStatePanel } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceStatePanel';
import { buildLiveSlideshowUrl } from '@/components/Dashboard/PhotoVideoGallery/GallerySlideshowAccessCard';
import { GallerySlideshowSettingsCard } from '@/components/Dashboard/PhotoVideoGallery/GallerySlideshowSettingsCard';
import { GallerySlideshowPreviewCard } from '@/components/Dashboard/PhotoVideoGallery/GallerySlideshowPreviewCard';
import { slideshowSettingsFromRow, type SlideshowSettings } from '@/lib/slideshowSettings';
import { Button } from '@/components/ui/enhanced-button';
import { ExternalLink } from 'lucide-react';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';

export const GallerySlideshowFeaturePage: React.FC<PhotoVideoWorkspaceSelection> = (selection) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedEventId, selectedEvent, selectionStatus, meta, items, loading, error, setSlideshowEnabled, updateSlideshowSettings } = usePhotoVideoFeatureWorkspace(selection);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<SlideshowSettings | null>(null);

  // Seed the editable draft once the gallery meta arrives (per selected event).
  useEffect(() => {
    if (meta) setDraft(slideshowSettingsFromRow(meta));
  }, [meta?.gallery_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const goBack = () => navigate('/dashboard?tab=photo-video-gallery');
  const liveUrl = buildLiveSlideshowUrl(meta?.primary_token ?? null);
  const effective = useMemo(() => draft ?? slideshowSettingsFromRow(meta), [draft, meta]);

  const handleToggle = async (v: boolean) => {
    setSaving(true);
    try {
      await setSlideshowEnabled(v);
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Live Slideshow | Wedding Waitress"
        description="Display approved guest photos and videos in a beautiful, continuously updating slideshow."
        noIndex
      />
      <FeatureWorkspaceLayout
        brownOutline
        backgroundAppearance="photo-video-sharing"
        controlsAppearance="photo-video-sharing"
        contentWidth="wide"
        toggleClassName={managementStyles.galleryViewToggle}
        title="Live Slideshow"
        description="Display approved guest photos and videos in a beautiful, continuously updating slideshow."
        eventName={(selectedEvent as any)?.name}
        selectionStatus={selectionStatus}
        enabled={!!meta?.slideshow_enabled}
        toggleDisabled={saving || !meta}
        onToggle={handleToggle}
        onBack={goBack}
        disabledNotice="This feature is currently turned off. You can still configure and preview the slideshow."
        headerAction={
          <Button
            variant="outline"
            className={`lv-premium-shade text-white border ${managementStyles.glassAction} ${managementStyles.workspaceHeaderAction}`}
            disabled={!liveUrl}
            onClick={() => liveUrl && window.open(liveUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink size={16} strokeWidth={1.8} className="mr-1.5" /> Launch Live Slideshow
          </Button>
        }
      >
        {selectionStatus !== 'selected' || !meta ? (
          <FeatureWorkspaceStatePanel
            state={selectionStatus === 'loading' ? 'loading' : selectionStatus === 'empty' ? 'empty' : 'error'}
            loadingLabel="Loading Live Slideshow…"
            emptyLabel="Select an event on the Photo & Video Sharing page to manage the Live Slideshow."
            error={error}
          />
        ) : (
          <div className={`space-y-6 sm:space-y-8 ${managementStyles.slideshowWorkspace}`} data-appearance="espresso-glass">
            <GallerySlideshowSettingsCard
              meta={meta}
              value={effective}
              onChange={setDraft}
              onSave={updateSlideshowSettings}
              appearance="espresso-glass"
            />

            <GallerySlideshowPreviewCard items={items} settings={effective} loading={loading && items.length === 0} appearance="espresso-glass" />
          </div>
        )}
      </FeatureWorkspaceLayout>
    </>
  );
};

export default GallerySlideshowFeaturePage;
