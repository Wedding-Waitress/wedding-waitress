import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Dashboard/AppSidebar';
import { AlbumOwnerHeader } from '@/components/Album/AlbumOwnerHeader';
import { AlbumGalleryTab } from '@/components/Album/AlbumGalleryTab';
import { AlbumGuestbookTab } from '@/components/Album/AlbumGuestbookTab';
import { AlbumVoiceTab } from '@/components/Album/AlbumVoiceTab';
import { AlbumSettingsTab } from '@/components/Album/AlbumSettingsTab';
import { AlbumInsightsTab } from '@/components/Album/AlbumInsightsTab';
import { SlideshowModal } from '@/components/Album/SlideshowModal';
import { AlbumQRModal } from '@/components/Album/AlbumQRModal';
import { downloadMediaAsZip } from '@/lib/albumZipDownloader';
import { useAlbumMedia } from '@/hooks/useAlbumMedia';
import { buildGalleryUploadUrl } from '@/lib/urlUtils';

export const AlbumOwnerDashboard = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [event, setEvent] = useState<any>(null);
  const [gallerySettings, setGallerySettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('gallery');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const { media } = useAlbumMedia(eventId || null);

  useEffect(() => {
    checkAuthorization();
  }, [eventId]);

  const checkAuthorization = async () => {
    if (!eventId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      const { data: eventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error || !eventData) {
        toast({ title: 'Event not found', variant: 'destructive' });
        navigate('/dashboard');
        return;
      }

      const isOwner = eventData.user_id === user.id;
      
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!isOwner && !adminRole) {
        toast({ title: 'Unauthorized', description: 'You do not have access to this album', variant: 'destructive' });
        navigate('/dashboard');
        return;
      }

      setEvent(eventData);
      setIsAuthorized(true);
      localStorage.setItem('ww:last_active_event_id', eventId);
      await fetchGallerySettings();
    } catch (error) {
      console.error('Authorization error:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchGallerySettings = async () => {
    if (!eventId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let { data } = await supabase
      .from('media_gallery_settings')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    // If settings don't exist, create default settings
    if (!data) {
      const { data: newSettings, error } = await supabase
        .from('media_gallery_settings')
        .insert({
          event_id: eventId,
          user_id: user.id,
          primary_color: '#6D28D9',
          require_approval: true,
          show_download_buttons: true,
          is_active: true,
          allow_photos: true,
          allow_videos: true,
        })
        .select()
        .single();

      if (!error && newSettings) {
        data = newSettings;
      }
    }

    setGallerySettings(data);
  };

  const updateSettings = async (updates: any) => {
    if (!eventId) return;

    const { error } = await supabase
      .from('media_gallery_settings')
      .update(updates)
      .eq('event_id', eventId);

    if (!error) {
      setGallerySettings({ ...gallerySettings, ...updates });
      toast({ title: 'Settings updated' });
    }
  };

  const handleDownloadAll = async () => {
    if (!event) return;
    setDownloading(true);
    const visibleMedia = media.filter(m => m.status === 'ready');
    await downloadMediaAsZip(visibleMedia, event.name);
    setDownloading(false);
  };

  const handleCopyUploadLink = () => {
    if (!event?.slug) return;
    const url = buildGalleryUploadUrl(event.slug);
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', description: 'Upload link copied to clipboard' });
  };

  const handleCopyGalleryLink = () => {
    if (!event?.slug) return;
    const url = `${buildGalleryUploadUrl(event.slug)}#gallery`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', description: 'Gallery link copied to clipboard' });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-subtle">
        <AppSidebar 
          activeTab="photo-video-gallery"
          onTabChange={(tab) => {
            if (tab === 'photo-video-gallery') return; // Already on this page
            navigate('/dashboard', { state: { activeTab: tab } });
          }}
          onSignOut={handleSignOut}
        />
        
        <div className="flex-1 flex flex-col">
          <AlbumOwnerHeader
            event={event}
            gallerySettings={gallerySettings}
            onToggleAutoApprove={() => updateSettings({ require_approval: !gallerySettings?.require_approval })}
            onCopyUploadLink={handleCopyUploadLink}
            onCopyGalleryLink={handleCopyGalleryLink}
            onDownloadAll={handleDownloadAll}
            onPlaySlideshow={() => setShowSlideshow(true)}
            onShowQR={() => setShowQRModal(true)}
            downloading={downloading}
          />

          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="gallery">Gallery</TabsTrigger>
                  <TabsTrigger value="guestbook">Guestbook</TabsTrigger>
                  <TabsTrigger value="voice">Voice Messages</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="gallery">
                  <AlbumGalleryTab eventId={eventId!} eventName={event?.name || ''} />
                </TabsContent>
                <TabsContent value="guestbook">
                  <AlbumGuestbookTab eventId={eventId!} eventName={event?.name || ''} />
                </TabsContent>
                <TabsContent value="voice">
                  <AlbumVoiceTab eventId={eventId!} eventName={event?.name || ''} />
                </TabsContent>
                <TabsContent value="settings">
                  <AlbumSettingsTab eventId={eventId!} settings={gallerySettings} onUpdateSettings={updateSettings} />
                </TabsContent>
                <TabsContent value="insights">
                  <AlbumInsightsTab eventId={eventId!} />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {showSlideshow && (
            <SlideshowModal
              items={media.filter(m => m.visibility === 'public' && m.status === 'ready' && (m.type === 'photo' || m.type === 'video'))}
              onClose={() => setShowSlideshow(false)}
            />
          )}

          {showQRModal && event?.slug && (
            <AlbumQRModal
              eventSlug={event.slug}
              eventName={event.name}
              onClose={() => setShowQRModal(false)}
            />
          )}
        </div>
      </div>
    </SidebarProvider>
  );
};
