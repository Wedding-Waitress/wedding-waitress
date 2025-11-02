import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
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
import { buildGalleryUploadUrl } from '@/lib/urlUtils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Link, ImageIcon, Download, Play } from 'lucide-react';
import QRCodeGenerator from 'qrcode';

interface AlbumContentInlineCardProps {
  eventId: string;
}

export const AlbumContentInlineCard = ({ eventId }: AlbumContentInlineCardProps) => {
  const { toast } = useToast();

  const [event, setEvent] = useState<any>(null);
  const [gallerySettings, setGallerySettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('gallery');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const { media } = useAlbumMedia(eventId);
  const { events } = useEvents();

  useEffect(() => {
    if (eventId) {
      fetchEventData();
      fetchGallerySettings();
    }
  }, [eventId]);

  useEffect(() => {
    if (event?.slug) {
      const uploadUrl = buildGalleryUploadUrl(event.slug);
      QRCodeGenerator.toDataURL(uploadUrl, {
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      }).then(setQrDataUrl);
    }
  }, [event?.slug]);

  const fetchEventData = async () => {
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventData) {
      setEvent(eventData);
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

  const handleDownloadQR = () => {
    if (!qrDataUrl || !event?.slug) return;
    
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${event.name.replace(/[^a-z0-9]/gi, '_')}_upload_qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: 'QR Code downloaded' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const autoApproveOn = !gallerySettings?.require_approval;

  return (
    <div className="space-y-6">
      {/* Header Section with QR Code and Action Buttons */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 p-4 bg-gradient-subtle rounded-lg border border-primary/20">
        {/* Left: QR Code */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white border rounded-lg p-3 flex flex-col items-center gap-2">
            <p className="text-xs font-semibold text-center text-primary">Guest Upload QR</p>
            {event?.slug && qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt="Upload QR Code" className="w-[120px] h-[120px]" />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownloadQR}
                  className="text-xs h-7 px-2 border-primary text-primary hover:bg-primary/10"
                >
                  Download QR
                </Button>
              </>
            ) : (
              <div className="w-[120px] h-[120px] flex items-center justify-center text-xs text-muted-foreground text-center p-2">
                QR will appear after first save.
              </div>
            )}
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap lg:ml-auto">
          <Button variant="outline" size="sm" onClick={handleCopyUploadLink}>
            <Link className="w-4 h-4 mr-2" />
            Copy Upload Link
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyGalleryLink}>
            <ImageIcon className="w-4 h-4 mr-2" />
            Copy Gallery Link
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadAll} disabled={downloading}>
            <Download className="w-4 h-4 mr-2" />
            {downloading ? 'Preparing...' : 'Download All'}
          </Button>
          <Button variant="default" size="sm" onClick={() => setShowSlideshow(true)}>
            <Play className="w-4 h-4 mr-2" />
            Slideshow
          </Button>

          {/* Auto-approve toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
            <span className="text-xs font-medium">Auto-approve:</span>
            <Switch 
              checked={autoApproveOn} 
              onCheckedChange={() => updateSettings({ require_approval: !gallerySettings?.require_approval })}
              className="data-[state=checked]:bg-success"
            />
            <span className={`text-xs font-bold ${autoApproveOn ? 'text-success' : 'text-muted-foreground'}`}>
              {autoApproveOn ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation and Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 bg-gradient-subtle">
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

      {/* Modals */}
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