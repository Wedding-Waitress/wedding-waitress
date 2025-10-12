import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useMediaGallerySettings } from '@/hooks/useMediaGallerySettings';
import { Copy, QrCode, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { buildGuestLookupUrl } from '@/lib/urlUtils';
import { AdvancedQRGenerator } from '@/lib/advancedQRGenerator';
import { QRCodeSettings } from '@/hooks/useQRCodeSettings';

interface GallerySettingsTabProps {
  galleryId: string;
}

export const GallerySettingsTab: React.FC<GallerySettingsTabProps> = ({ galleryId }) => {
  const { settings, loading, saveSettings } = useMediaGallerySettings(galleryId);
  const { toast } = useToast();
  const [uploadUrl, setUploadUrl] = React.useState('');
  const [galleryTitle, setGalleryTitle] = React.useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState('');
  const [shortSlug, setShortSlug] = React.useState('');

  // Generate QR code with simplified settings
  const generateQRCode = async (url: string) => {
    try {
      // Force simplified QR code settings for Photo & Video Sharing
      const simplifiedSettings: QRCodeSettings = {
        event_id: '',
        user_id: '',
        shape: 'rounded',
        pattern: 'basic',
        pattern_style: 'basic',
        background_color: '#ffffff',
        foreground_color: '#000000',
        corner_style: 'square',
        has_scan_text: false,
        scan_text: '',
        gradient_type: 'none',
        gradient_colors: [],
        border_style: 'none',
        border_width: 0,
        border_color: '#000000',
        shadow_enabled: false,
        shadow_blur: 0,
        shadow_color: '#00000033',
        center_image_size: 0,
        background_opacity: 1.0,
        output_size: 2000,
        output_format: 'png',
        color_palette: 'default',
        advanced_settings: {},
        use_simplified_qr: true,
      };

      const generator = new AdvancedQRGenerator(2000);
      const dataUrl = await generator.generate(url, simplifiedSettings);
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        variant: 'destructive',
      });
    }
  };

  // Generate upload URL and QR code
  React.useEffect(() => {
    const generateUrl = async () => {
      if (!galleryId) return;
      
      try {
        // Fetch gallery info
        const { data: gallery } = await supabase
          .from('galleries' as any)
          .select('slug, title')
          .eq('id', galleryId)
          .single();

        // Fetch short link
        const { data: shortlink } = await supabase
          .from('gallery_shortlinks' as any)
          .select('slug')
          .eq('gallery_id', galleryId)
          .single();

        if ((gallery as any)?.slug) {
          // Use short link if available, otherwise fall back to full slug
          const url = (shortlink as any)?.slug
            ? `${window.location.origin}/p/${(shortlink as any).slug}`
            : `${window.location.origin}/g/${(gallery as any).slug}`;
          
          setUploadUrl(url);
          setGalleryTitle((gallery as any).title);
          await generateQRCode(url);
        }
      } catch (error) {
        console.error('Error generating URL:', error);
      }
    };

    generateUrl();
  }, [galleryId]);

  const copyUploadUrl = () => {
    navigator.clipboard.writeText(uploadUrl);
    toast({
      title: 'Copied!',
      description: 'Upload URL copied to clipboard',
    });
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `${galleryTitle.replace(/\s+/g, '-').toLowerCase()}-photo-video-qr.png`;
    link.href = qrCodeDataUrl;
    link.click();
    
    toast({
      title: 'Success!',
      description: 'QR code downloaded successfully',
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload URL and QR Code Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest Upload Link Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Guest Upload Link
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Share this link or QR code with your guests so they can upload photos and videos
            </p>
            <div className="flex gap-2">
              <Input value={uploadUrl} readOnly className="flex-1" />
              <Button variant="outline" onClick={copyUploadUrl}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Download Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              {galleryTitle} – Photo & Video Gallery QR Code
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Download this high-resolution QR code for printing on signage
            </p>
            
            {/* QR Code Display */}
            <div className="flex justify-center mb-4 bg-white p-4 rounded-lg border">
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="Photo & Video Gallery QR Code"
                  className="w-full max-w-[300px] h-auto"
                />
              ) : (
                <div className="w-[300px] h-[300px] flex items-center justify-center bg-muted rounded">
                  <p className="text-sm text-muted-foreground">Generating QR code...</p>
                </div>
              )}
            </div>
            
            {/* Download Button */}
            <Button 
              variant="default" 
              className="w-full bg-primary hover:bg-primary/90"
              onClick={downloadQRCode}
              disabled={!qrCodeDataUrl}
            >
              <Download className="w-4 h-4 mr-2" />
              Download QR Code
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Settings Form */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <h3 className="text-lg font-semibold mb-4">Gallery Settings</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Photo & Video Sharing</Label>
              <p className="text-sm text-muted-foreground">
                Allow guests to upload media
              </p>
            </div>
            <Switch
              checked={settings?.is_active ?? true}
              onCheckedChange={(checked) => saveSettings({ is_active: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Approval Before Showing</Label>
              <p className="text-sm text-muted-foreground">
                Manually approve uploads before they appear in the gallery
              </p>
            </div>
            <Switch
              checked={settings?.require_approval ?? true}
              onCheckedChange={(checked) => saveSettings({ require_approval: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Photos</Label>
              <p className="text-sm text-muted-foreground">
                Let guests upload photos
              </p>
            </div>
            <Switch
              checked={settings?.allow_photos ?? true}
              onCheckedChange={(checked) => saveSettings({ allow_photos: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Videos</Label>
              <p className="text-sm text-muted-foreground">
                Let guests upload video clips
              </p>
            </div>
            <Switch
              checked={settings?.allow_videos ?? true}
              onCheckedChange={(checked) => saveSettings({ allow_videos: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Max Uploads Per Guest</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={settings?.max_uploads_per_guest ?? 10}
              onChange={(e) => saveSettings({ max_uploads_per_guest: parseInt(e.target.value) })}
            />
            <p className="text-sm text-muted-foreground">
              Limit how many items each guest can upload
            </p>
          </div>

          <div className="space-y-2">
            <Label>Slideshow Interval (seconds)</Label>
            <Input
              type="number"
              min="1"
              max="60"
              value={settings?.slideshow_interval_seconds ?? 5}
              onChange={(e) => saveSettings({ slideshow_interval_seconds: parseInt(e.target.value) })}
            />
            <p className="text-sm text-muted-foreground">
              How long each photo/video displays in slideshow mode
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Captions</Label>
              <p className="text-sm text-muted-foreground">
                Display captions in the gallery
              </p>
            </div>
            <Switch
              checked={settings?.show_captions ?? true}
              onCheckedChange={(checked) => saveSettings({ show_captions: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};