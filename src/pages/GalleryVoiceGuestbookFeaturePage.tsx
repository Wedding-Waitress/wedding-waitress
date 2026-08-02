// Feature workspace: Audio Guestbook
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEvents } from '@/hooks/useEvents';
import { useSelectedEvent } from '@/hooks/useSelectedEvent';
import { useEventMediaGallery } from '@/hooks/useEventMediaGallery';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';
import { GalleryVoiceGuestbookAccessCard, buildVoiceGuestbookUrl } from '@/components/Dashboard/PhotoVideoGallery/GalleryVoiceGuestbookAccessCard';
import { GalleryVoiceGuestbookStepsCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryVoiceGuestbookStepsCard';
import { GalleryVoiceSettingsCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryVoiceSettingsCard';
import { guestbookRecordings } from '@/lib/mediaPrivacy';
import { GalleryVoiceMessagesCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryVoiceMessagesCard';
import { GalleryDownloadsCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryDownloadsCard';
import { Button } from '@/components/ui/enhanced-button';
import { Card } from '@/components/ui/card';
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react';

export const GalleryVoiceGuestbookFeaturePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);
  const { events } = useEvents();
  const { selectedEventId, selectedEvent } = useSelectedEvent(events);
  const { meta, items, loading, error, setModeration, setVoiceGuestbookEnabled } = useEventMediaGallery(selectedEventId);
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
  const guestUrl = buildVoiceGuestbookUrl(meta?.primary_token ?? null);

  // Recordings only — text-only guestbook messages are never included.
  const recordings = useMemo(
    () => guestbookRecordings(items),
    [items],
  );

  const handleToggle = async (v: boolean) => {
    setSaving(true);
    try {
      await setVoiceGuestbookEnabled(v);
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
        title="Audio Guestbook | Wedding Waitress"
        description="Listen to and manage private audio and video messages recorded by your guests."
        noIndex
      />
      <FeatureWorkspaceLayout
        title="Audio Guestbook"
        description="Listen to and manage private audio and video messages recorded by your guests."
        eventName={(selectedEvent as any)?.name}
        enabled={!!meta?.voice_guestbook_enabled}
        toggleDisabled={saving || loading || !meta}
        onToggle={handleToggle}
        onBack={goBack}
        disabledNotice="This feature is currently turned off for your guests. You can still manage existing recordings and preview the Audio Guestbook."
        headerAction={
          <Button
            variant="outline"
            className="lv-premium-shade bg-white/10 text-white border-white/40 hover:bg-white hover:text-[#967A59]"
            disabled={!guestUrl}
            onClick={() => guestUrl && window.open(guestUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4 mr-1" /> Preview as Guest
          </Button>
        }
      >
        {loading && !meta ? (
          <Card className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin h-6 w-6 text-[#967A59]" />
            <p className="text-sm text-muted-foreground">Loading Audio Guestbook…</p>
          </Card>
        ) : !meta ? (
          <Card className="p-10 flex flex-col items-center text-center gap-3">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground break-words">
              {error || 'Select an event on the Photo & Video Gallery page to manage the Audio Guestbook.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <GalleryVoiceGuestbookAccessCard meta={meta} />
              <GalleryVoiceGuestbookStepsCard />
            </div>

            <GalleryVoiceSettingsCard meta={meta} />

            <GalleryVoiceMessagesCard
              items={recordings}
              eventName={(selectedEvent as any)?.name}
              loading={loading}
              error={error}
              onSetModeration={setModeration}
            />

            <GalleryDownloadsCard
              privacyScope="guestbook"
              items={recordings}
              eventName={(selectedEvent as any)?.name}
              galleryTitle={meta.gallery_title}
              scopes={['all', 'approved']}
              labels={{ all: 'Download All Guestbook Messages', approved: 'Download Approved Guestbook Messages' }}
              title="Download Guestbook Messages"
              description="Save your guests' original recordings as a ZIP archive."
              filePrefix="voice-messages"
              emptyText="No recordings to download yet."
            />
          </div>
        )}
      </FeatureWorkspaceLayout>
    </>
  );
};

export default GalleryVoiceGuestbookFeaturePage;
