// Feature workspace: Photo & Video Gallery View.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEvents } from '@/hooks/useEvents';
import { useSelectedEvent } from '@/hooks/useSelectedEvent';
import { useEventMediaGallery } from '@/hooks/useEventMediaGallery';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';
import { GalleryViewAccessCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryViewAccessCard';
import { GalleryPasswordCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryPasswordCard';
import { GalleryBrandingCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryBrandingCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { buildGalleryGuestAppUrl } from '@/lib/urlUtils';
import { LoaderCircle, TriangleAlert, Eye } from 'lucide-react';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';

export const GalleryViewFeaturePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);
  const { events } = useEvents();
  const { selectedEventId, selectedEvent } = useSelectedEvent(events);
  const { meta, loading, error, setPassword, updateBranding, setGuestFeature } = useEventMediaGallery(selectedEventId);
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

  const guestGalleryUrl = buildGalleryGuestAppUrl(meta?.primary_token);


  const handleToggle = async (v: boolean) => {
    setSaving(true);
    try {
      await setGuestFeature('gallery_view_enabled', v);
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
      <SeoHead title="Photo & Video Gallery View | Wedding Waitress" description="Control how guests access, view and experience your shared gallery." noIndex />
      <FeatureWorkspaceLayout
        brownOutline
        backgroundAppearance="photo-video-sharing"
        controlsAppearance="photo-video-sharing"
        title="Photo & Video Gallery View"
        description="Control how guests access, view and experience your shared gallery."
        eventName={(selectedEvent as any)?.name}
        enabled={!!meta?.gallery_view_enabled}
        toggleDisabled={saving || loading || !meta}
        onToggle={handleToggle}
        onBack={goBack}
        disabledNotice="This feature is currently turned off for your guests. You can still manage its settings and preview the gallery."
        headerAction={
          <button
            type="button"
            onClick={() => guestGalleryUrl && window.open(guestGalleryUrl, '_blank', 'noopener,noreferrer')}
            disabled={!guestGalleryUrl}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 min-h-[44px] text-sm font-medium text-white transition-all duration-200 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4b97e]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#28140e] disabled:opacity-50 ${managementStyles.glassAction}`}
          >
            <Eye className="h-4 w-4 shrink-0" strokeWidth={1.8} /> Preview as Guest
          </button>
        }
      >
        {loading && !meta ? (
          <Card className="p-12 flex flex-col items-center justify-center gap-3">
            <LoaderCircle className="animate-spin h-6 w-6 text-[#967A59]" strokeWidth={1.8} />
            <p className="text-sm text-muted-foreground">Loading gallery…</p>
          </Card>
        ) : !meta ? (
          <Card className="p-10 flex flex-col items-center text-center gap-3">
            <TriangleAlert className="h-8 w-8 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-sm text-muted-foreground break-words">
              {error || 'Select an event on the Photo & Video Sharing page to manage the gallery view.'}
            </p>
            <Button variant="outline" className="lv-premium-shade" onClick={goBack}>Back to Photo &amp; Video Sharing</Button>
          </Card>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="h-full [&>*]:h-full">
                <GalleryBrandingCard eventId={selectedEventId!} meta={meta} onSave={updateBranding} appearance="espresso-glass" />
              </div>
              <GalleryViewAccessCard meta={meta} guestUrl={guestGalleryUrl} appearance="espresso-glass" />
              <div className="h-full [&>*]:h-full">
                <GalleryPasswordCard
                  passwordEnabled={meta.password_enabled}
                  hasPassword={meta.has_password}
                  onSave={setPassword}
                  appearance="espresso-glass"
                />
              </div>
            </div>

            <p className={`text-sm break-words ${managementStyles.galleryViewFootnote}`}>
              These appearance settings are shared across your guest-facing gallery experiences.
            </p>
          </div>
        )}
      </FeatureWorkspaceLayout>
    </>
  );
};

export default GalleryViewFeaturePage;
