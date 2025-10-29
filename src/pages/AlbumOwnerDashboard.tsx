import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { AlbumOwnerHeader } from '@/components/Album/AlbumOwnerHeader';
import { AlbumGalleryTab } from '@/components/Album/AlbumGalleryTab';
import { AlbumGuestbookTab } from '@/components/Album/AlbumGuestbookTab';
import { AlbumVoiceTab } from '@/components/Album/AlbumVoiceTab';
import { AlbumSettingsTab } from '@/components/Album/AlbumSettingsTab';
import { AlbumInsightsTab } from '@/components/Album/AlbumInsightsTab';
import { SlideshowModal } from '@/components/Album/SlideshowModal';
import { downloadMediaAsZip } from '@/lib/albumZipDownloader';
import { useAlbumMedia } from '@/hooks/useAlbumMedia';

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

    const { data } = await supabase
      .from('media_gallery_settings')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) return null;

  const galleryUrl = event ? `${window.location.origin}/g/${event.slug}` : '';

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AlbumOwnerHeader
        event={event}
        gallerySettings={gallerySettings}
        onToggleAutoApprove={() => updateSettings({ require_approval: !gallerySettings?.require_approval })}
        onCopyUploadLink={() => { navigator.clipboard.writeText(galleryUrl); toast({ title: 'Link copied' }); }}
        onCopyGalleryLink={() => { navigator.clipboard.writeText(`${galleryUrl}#gallery`); toast({ title: 'Link copied' }); }}
        onDownloadAll={handleDownloadAll}
        onPlaySlideshow={() => setShowSlideshow(true)}
        downloading={downloading}
      />

      <div className="max-w-7xl mx-auto p-4">
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

      {showSlideshow && (
        <SlideshowModal
          items={media.filter(m => m.visibility === 'public' && m.status === 'ready' && (m.type === 'photo' || m.type === 'video'))}
          onClose={() => setShowSlideshow(false)}
        />
      )}
    </div>
  );
};
