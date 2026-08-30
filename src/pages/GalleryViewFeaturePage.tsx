// Feature workspace: Photo & Video Gallery View.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhotoVideoFeatureWorkspace, type PhotoVideoWorkspaceSelection } from '@/hooks/usePhotoVideoFeatureWorkspace';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';
import { FeatureWorkspaceStatePanel } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceStatePanel';
import { GalleryViewAccessCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryViewAccessCard';
import { GalleryPasswordCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryPasswordCard';
import { GalleryBrandingCard } from '@/components/Dashboard/PhotoVideoGallery/GalleryBrandingCard';
import { Button } from '@/components/ui/enhanced-button';
import { buildGalleryGuestAppUrl } from '@/lib/urlUtils';
import { Eye } from 'lucide-react';
import managementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';

export const GalleryViewFeaturePage: React.FC<PhotoVideoWorkspaceSelection> = (selection) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedEventId, selectedEvent, selectionStatus, meta, error, setPassword, updateBranding, setGuestFeature } = usePhotoVideoFeatureWorkspace(selection);
  const [saving, setSaving] = useState(false);

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
        selectionStatus={selectionStatus}
        enabled={!!meta?.gallery_view_enabled}
        toggleDisabled={saving || !meta}
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
        {selectionStatus !== 'selected' || !meta ? (
          <FeatureWorkspaceStatePanel
            state={selectionStatus === 'loading' ? 'loading' : selectionStatus === 'empty' ? 'empty' : 'error'}
            loadingLabel="Loading gallery…"
            emptyLabel="Select an event on the Photo & Video Sharing page to manage the gallery view."
            error={error}
          />
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
