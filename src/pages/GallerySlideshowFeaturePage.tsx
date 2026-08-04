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
import { Loader2, AlertTriangle, MonitorPlay } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#472c1d' }}>
        <Loader2 className="h-6 w-6 animate-spin text-white" />
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
            className="lv-premium-shade bg-white/10 text-white border-white/40 hover:bg-white hover:text-[#967A59]"
            disabled={!liveUrl}
            onClick={() => liveUrl && window.open(liveUrl, '_blank', 'noopener,noreferrer')}
          >
            <MonitorPlay className="h-4 w-4 mr-1" /> Launch Live Slideshow
          </Button>
        }
      >
        {loading && !meta ? (
          <Card className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin h-6 w-6 text-[#967A59]" />
            <p className="text-sm text-muted-foreground">Loading Live Slideshow…</p>
          </Card>
        ) : !meta ? (
          <Card className="p-10 flex flex-col items-center text-center gap-3">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground break-words">
              {error || 'Select an event on the Photo & Video Sharing page to manage the Live Slideshow.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <GallerySlideshowStepsCard />
              <GallerySlideshowAccessCard meta={meta} />
            </div>

            <GallerySlideshowSettingsCard
              meta={meta}
              value={effective}
              onChange={setDraft}
              onSave={updateSlideshowSettings}
            />

            <GallerySlideshowPreviewCard items={items} settings={effective} loading={loading && items.length === 0} />
          </div>
        )}
      </FeatureWorkspaceLayout>
    </>
  );
};

export default GallerySlideshowFeaturePage;
