import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle } from 'lucide-react';
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
import { useEvents } from '@/hooks/useEvents';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { buildGalleryUploadUrl } from '@/lib/urlUtils';

interface AlbumHostConsoleEmbeddedProps {
  eventId: string;
}

export const AlbumHostConsoleEmbedded = ({ eventId }: AlbumHostConsoleEmbeddedProps) => {
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

  const { media } = useAlbumMedia(eventId);
  const { events } = useEvents();

  useEffect(() => {
    checkAuthorization();
  }, [eventId]);

  const checkAuthorization = async () => {
    if (!eventId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: eventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error || !eventData) {
        toast({ title: 'Event not found', variant: 'destructive' });
        setLoading(false);
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
        setLoading(false);
        return;
      }

      setEvent(eventData);
      setIsAuthorized(true);
      await fetchGallerySettings();
    } catch (error) {
      console.error('Authorization error:', error);
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
    setLoading(false);
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

  const handleEventChange = (newEventId: string) => {
    localStorage.setItem('ww:last_active_event_id', newEventId);
    navigate(`/album/${newEventId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <Card className="ww-box p-8 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
        <CardTitle className="mb-2">Unauthorized Access</CardTitle>
        <CardDescription className="mb-6">
          You do not have permission to access this album.
        </CardDescription>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Go Back
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AlbumOwnerHeader
        event={event}
        allEvents={events}
        gallerySettings={gallerySettings}
        onEventChange={handleEventChange}
        onToggleAutoApprove={() => updateSettings({ require_approval: !gallerySettings?.require_approval })}
        onCopyUploadLink={handleCopyUploadLink}
        onCopyGalleryLink={handleCopyGalleryLink}
        onDownloadAll={handleDownloadAll}
        onPlaySlideshow={() => setShowSlideshow(true)}
        onShowQR={() => setShowQRModal(true)}
        downloading={downloading}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="guestbook">Guestbook</TabsTrigger>
          <TabsTrigger value="voice">Voice Messages</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="gallery">
          <AlbumGalleryTab eventId={eventId} eventName={event?.name || ''} />
        </TabsContent>
        <TabsContent value="guestbook">
          <AlbumGuestbookTab eventId={eventId} eventName={event?.name || ''} />
        </TabsContent>
        <TabsContent value="voice">
          <AlbumVoiceTab eventId={eventId} eventName={event?.name || ''} />
        </TabsContent>
        <TabsContent value="settings">
          <AlbumSettingsTab eventId={eventId} settings={gallerySettings} onUpdateSettings={updateSettings} />
        </TabsContent>
        <TabsContent value="insights">
          <AlbumInsightsTab eventId={eventId} />
        </TabsContent>
      </Tabs>

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
  );
};
