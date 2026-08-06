// Feature workspace: Digital Guestbook (unified — written, audio and video messages)
import React, { useEffect, useMemo, useState } from 'react';
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

  // Recordings only — text-only guestbook messages are never included in downloads.
  const recordings = useMemo(() => guestbookRecordings(items), [items]);

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#472c1d' }}>
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
            className="lv-premium-shade bg-white/10 text-white border-white/40 hover:bg-white hover:text-[#967A59]"
            disabled={!guestUrl}
            onClick={() => guestUrl && window.open(guestUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4 mr-1" strokeWidth={1.8} /> Preview as Guest
          </Button>
        }
      >
        {loading && !meta ? (
          <Card className="p-12 flex flex-col items-center justify-center gap-3">
            <LoaderCircle className="animate-spin h-6 w-6 text-[#967A59]" strokeWidth={1.8} />
            <p className="text-sm text-muted-foreground">Loading Digital Guestbook…</p>
          </Card>
        ) : !meta ? (
          <Card className="p-10 flex flex-col items-center text-center gap-3">
            <TriangleAlert className="h-8 w-8 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-sm text-muted-foreground break-words">
              {error || 'Select an event on the Photo & Video Sharing page to manage the Digital Guestbook.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <GalleryTextGuestbookStepsCard />
              <GalleryTextGuestbookAccessCard meta={meta} />
            </div>




            <GalleryGuestbookMessagesCard
              eventId={selectedEventId}
              items={items}
              eventName={(selectedEvent as any)?.name}
              loading={loading}
              error={error}
              onSetItemModeration={setModeration}
              onSetGuestbookShare={setGuestbookShare}
            />
          </div>
        )}
      </FeatureWorkspaceLayout>
    </>
  );
};

export default GalleryTextGuestbookFeaturePage;
