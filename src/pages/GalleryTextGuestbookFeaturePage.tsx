// Feature workspace: Digital Guestbook (unified — written, audio and video messages)
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEvents } from '@/hooks/useEvents';
import { useSelectedEvent } from '@/hooks/useSelectedEvent';
import { useEventMediaGallery } from '@/hooks/useEventMediaGallery';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';
import { GalleryTextGuestbookAccessCard, buildTextGuestbookUrl } from '@/components/Dashboard/PhotoVideoGallery/GalleryTextGuestbookAccessCard';
import { GalleryTextGuestbookStepsCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryTextGuestbookStepsCard';
import { GalleryGuestbookMessagesCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryGuestbookMessagesCard';
import { Button } from '@/components/ui/enhanced-button';
import { Card } from '@/components/ui/card';
import { LoaderCircle, TriangleAlert, ExternalLink } from 'lucide-react';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';

export const GalleryTextGuestbookFeaturePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);
  const { events } = useEvents();
  const { selectedEventId, selectedEvent } = useSelectedEvent(events);
  const { meta, items, loading, error, setModeration, setGuestbookEnabled, setGuestbookShare } = useEventMediaGallery(selectedEventId);
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

  if (!authChecked) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${managementStyles.photoVideoSharingSurface}`}>
        <LoaderCircle className="h-6 w-6 animate-spin text-white" strokeWidth={1.8} />
      </div>
    );
  }

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
        enabled={!!meta?.guestbook_text_enabled || !!meta?.voice_guestbook_enabled}
        toggleDisabled={saving || loading || !meta}
        onToggle={handleToggle}
        onBack={goBack}
        disabledNotice="This feature is currently turned off for your guests. You can still manage existing messages and preview the Digital Guestbook."
        headerAction={
          <Button
            variant="outline"
            className={`lv-premium-shade text-white border ${managementStyles.glassAction}`}
            disabled={!guestUrl}
            onClick={() => guestUrl && window.open(guestUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4 mr-1" strokeWidth={1.8} /> Preview as Guest
          </Button>
        }
      >
        {loading && !meta ? (
          <Card className={`p-12 flex flex-col items-center justify-center gap-3 ${managementStyles.loadingGlassPanel}`}>
            <LoaderCircle className={`animate-spin h-6 w-6 text-[#967A59] ${managementStyles.loadingGlassSpinner}`} strokeWidth={1.8} />
            <p className="text-sm text-muted-foreground">Loading Digital Guestbook…</p>
          </Card>
        ) : !meta ? (
          <Card className={`p-10 flex flex-col items-center text-center gap-3 ${managementStyles.loadingGlassPanel}`}>
            <TriangleAlert className={`h-8 w-8 text-muted-foreground ${managementStyles.loadingGlassSpinner}`} strokeWidth={1.8} />
            <p className="text-sm text-muted-foreground break-words">
              {error || 'Select an event on the Photo & Video Sharing page to manage the Digital Guestbook.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
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
