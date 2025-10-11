import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useMediaGallerySettings } from '@/hooks/useMediaGallerySettings';
import { Copy, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { buildGuestLookupUrl } from '@/lib/urlUtils';

interface GallerySettingsTabProps {
  eventId: string;
}

export const GallerySettingsTab: React.FC<GallerySettingsTabProps> = ({ eventId }) => {
  const { settings, loading, saveSettings } = useMediaGallerySettings(eventId);
  const { toast } = useToast();
  const [uploadUrl, setUploadUrl] = React.useState('');

  // Generate upload URL
  React.useEffect(() => {
    const generateUrl = async () => {
      try {
        const { data: event } = await supabase
          .from('events')
          .select('slug')
          .eq('id', eventId)
          .single();

        if (event?.slug) {
          setUploadUrl(buildGuestLookupUrl(event.slug));
        }
      } catch (error) {
        console.error('Error generating URL:', error);
      }
    };

    generateUrl();
  }, [eventId]);

  const copyUploadUrl = () => {
    navigator.clipboard.writeText(uploadUrl);
    toast({
      title: 'Copied!',
      description: 'Upload URL copied to clipboard',
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload URL Card */}
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