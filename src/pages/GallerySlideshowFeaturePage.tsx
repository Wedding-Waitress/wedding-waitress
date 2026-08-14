// Feature workspace: Live Slideshow
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEvents } from '@/hooks/useEvents';
import { useSelectedEvent } from '@/hooks/useSelectedEvent';
import { useEventMediaGallery } from '@/hooks/useEventMediaGallery';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';
import { GallerySlideshowAccessCard, buildLiveSlideshowUrl } from '@/components/Dashboard/PhotoVideoGallery/GallerySlideshowAccessCard';
import { GallerySlideshowStepsCard } from '@/components/Dashboard/PhotoVideoGallery/GallerySlideshowStepsCard';
import { GallerySlideshowSettingsCard } from '@/components/Dashboard/PhotoVideoGallery/GallerySlideshowSettingsCard';
import { GallerySlideshowPreviewCard } from '@/components/Dashboard/PhotoVideoGallery/GallerySlideshowPreviewCard';
import { slideshowSettingsFromRow, type SlideshowSettings } from '@/lib/slideshowSettings';
import { Button } from '@/components/ui/enhanced-button';
import { Card } from '@/components/ui/card';
import { LoaderCircle, TriangleAlert, ExternalLink } from 'lucide-react';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';

export const GallerySlideshowFeaturePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);
  const { events } = useEvents();
  const { selectedEventId, selectedEvent } = useSelectedEvent(events);
  const { meta, items, loading, error, setSlideshowEnabled, updateSlideshowSettings } = useEventMediaGallery(selectedEventId);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<SlideshowSettings | null>(null);

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

  if (!authChecked) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${managementStyles.photoVideoSharingSurface}`}>
        <LoaderCircle size={24} strokeWidth={1.8} className={`animate-spin text-white ${managementStyles.loadingGlassSpinner}`} />
      </div>
    );
  }

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
        toggleClassName={managementStyles.galleryViewToggle}
        title="Live Slideshow"
        description="Display approved guest photos and videos in a beautiful, continuously updating slideshow."
        eventName={(selectedEvent as any)?.name}
        enabled={!!meta?.slideshow_enabled}
        toggleDisabled={saving || loading || !meta}
        onToggle={handleToggle}
        onBack={goBack}
        disabledNotice="This feature is currently turned off. You can still configure and preview the slideshow."
        headerAction={
          <Button
            variant="outline"
            className={`lv-premium-shade text-white border ${managementStyles.glassAction}`}
            disabled={!liveUrl}
            onClick={() => liveUrl && window.open(liveUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink size={16} strokeWidth={1.8} className="mr-1.5" /> Launch Live Slideshow
          </Button>
        }
      >
        {loading && !meta ? (
          <Card className={`p-12 flex flex-col items-center justify-center gap-3 ${managementStyles.loadingGlassPanel}`}>
            <LoaderCircle size={24} strokeWidth={1.8} className={`animate-spin text-[#967A59] ${managementStyles.loadingGlassSpinner}`} />
            <p className="text-sm text-muted-foreground">Loading Live Slideshow…</p>
          </Card>
        ) : !meta ? (
          <Card className={`p-10 flex flex-col items-center text-center gap-3 ${managementStyles.loadingGlassPanel}`}>
            <TriangleAlert size={28} strokeWidth={1.8} className={`text-muted-foreground ${managementStyles.loadingGlassSpinner}`} />
            <p className="text-sm text-muted-foreground break-words">
              {error || 'Select an event on the Photo & Video Sharing page to manage the Live Slideshow.'}
            </p>
          </Card>
        ) : (
          <div className={`space-y-6 sm:space-y-8 ${managementStyles.slideshowWorkspace}`} data-appearance="espresso-glass">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <GallerySlideshowStepsCard appearance="espresso-glass" />
              <GallerySlideshowAccessCard meta={meta} appearance="espresso-glass" />
            </div>

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
