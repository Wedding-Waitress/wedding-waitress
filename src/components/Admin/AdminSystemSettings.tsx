import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Settings, AlertTriangle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AdminSystemSettings = () => {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    audioGuestbookEnabled: true,
    photoVideoSharingEnabled: true,
    kioskModeEnabled: true,
    watermarkEnabled: false,
  });
  const { toast } = useToast();

  const handleToggle = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
    toast({
      title: 'Setting Updated',
      description: `${key} has been toggled`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Feature Flags */}
      <Card className="ww-box">
        <CardHeader>
          <CardTitle style={{ color: '#6D28D9' }}>
            <Settings className="w-5 h-5 inline mr-2" />
            Feature Flags
          </CardTitle>
          <CardDescription>
            Enable or disable features globally
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="maintenance">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Temporarily disable public access
              </p>
            </div>
            <Switch
              id="maintenance"
              checked={settings.maintenanceMode}
              onCheckedChange={() => handleToggle('maintenanceMode')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="audio">Audio Guestbook</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to record audio messages
              </p>
            </div>
            <Switch
              id="audio"
              checked={settings.audioGuestbookEnabled}
              onCheckedChange={() => handleToggle('audioGuestbookEnabled')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="photo">Photo & Video Sharing</Label>
              <p className="text-sm text-muted-foreground">
                Enable guest photo/video uploads
              </p>
            </div>
            <Switch
              id="photo"
              checked={settings.photoVideoSharingEnabled}
              onCheckedChange={() => handleToggle('photoVideoSharingEnabled')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="kiosk">Kiosk Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable full-screen kiosk displays
              </p>
            </div>
            <Switch
              id="kiosk"
              checked={settings.kioskModeEnabled}
              onCheckedChange={() => handleToggle('kioskModeEnabled')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Brand Settings */}
      <Card className="ww-box">
        <CardHeader>
          <CardTitle style={{ color: '#6D28D9' }}>Brand Settings</CardTitle>
          <CardDescription>
            Customize branding and appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo">Logo Upload</Label>
            <Input id="logo" type="file" accept="image/*" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                defaultValue="#6D28D9"
                className="w-20"
              />
              <Input value="#6D28D9" readOnly className="flex-1" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="watermark">Watermark Toggle</Label>
              <p className="text-sm text-muted-foreground">
                Add watermark to all media
              </p>
            </div>
            <Switch
              id="watermark"
              checked={settings.watermarkEnabled}
              onCheckedChange={() => handleToggle('watermarkEnabled')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Tools */}
      <Card className="ww-box">
        <CardHeader>
          <CardTitle style={{ color: '#6D28D9' }}>Data Tools</CardTitle>
          <CardDescription>
            Manage system data and exports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full justify-start">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Archive old media (disabled by default)
          </Button>

          <Button variant="outline" className="w-full justify-start">
            <Download className="w-4 h-4 mr-2" />
            Export daily stats (CSV)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
