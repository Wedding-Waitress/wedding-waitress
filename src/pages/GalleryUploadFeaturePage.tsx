// Feature workspace: Upload Photos & Videos (stage 1 — layout foundation).
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEvents } from '@/hooks/useEvents';
import { useSelectedEvent } from '@/hooks/useSelectedEvent';
import { useEventMediaGallery } from '@/hooks/useEventMediaGallery';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';
import { Loader2, Upload } from 'lucide-react';

export const GalleryUploadFeaturePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);
  const { events } = useEvents();
  const { selectedEventId, selectedEvent } = useSelectedEvent(events);
  const { meta, loading, setGuestFeature } = useEventMediaGallery(selectedEventId);
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

  const handleToggle = async (v: boolean) => {
    setSaving(true);
    try {
      await setGuestFeature('guest_upload_enabled', v);
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
      <SeoHead title="Upload Photos & Videos | Wedding Waitress" description="Manage the photos and videos uploaded by your guests." noindex />
      <FeatureWorkspaceLayout
        title="Upload Photos & Videos"
        description="Manage the photos and videos uploaded by your guests."
        eventName={(selectedEvent as any)?.name}
        enabled={!!meta?.guest_upload_enabled}
        toggleDisabled={saving || loading || !meta}
        onToggle={handleToggle}
        onBack={goBack}
      >
        <section className="mx-auto w-full max-w-[1100px] rounded-2xl border shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)] px-5 sm:px-10 py-14 sm:py-24 text-center"
          style={{ backgroundColor: '#FBF8F3', borderColor: 'rgba(0,0,0,0.08)' }}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(150,122,89,0.12)' }}>
            <Upload className="h-6 w-6 text-[#967A59]" />
          </div>
          <h2 className="mt-6 text-xl sm:text-2xl font-bold" style={{ color: '#1D1D1F' }}>Upload workspace</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm sm:text-base break-words" style={{ color: '#6E6E73' }}>
            This is where the upload tools and settings for this feature will live.
          </p>
        </section>
      </FeatureWorkspaceLayout>
    </>
  );
};

export default GalleryUploadFeaturePage;
