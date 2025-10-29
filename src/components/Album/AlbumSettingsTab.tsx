import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface AlbumSettingsTabProps {
  eventId: string;
  settings: any;
  onUpdateSettings: (updates: any) => void;
}

export const AlbumSettingsTab = ({ settings, onUpdateSettings }: AlbumSettingsTabProps) => {
  if (!settings) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Password Protection</p>
              <p className="text-sm text-muted-foreground">Require password to view gallery</p>
            </div>
            <Switch 
              checked={settings.password_protected || false}
              onCheckedChange={(checked) => onUpdateSettings({ password_protected: checked })}
            />
          </div>

          {settings.password_protected && (
            <div>
              <Label>Gallery Password</Label>
              <Input 
                type="password"
                value={settings.gallery_password || ''}
                onChange={(e) => onUpdateSettings({ gallery_password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-approve Uploads</p>
              <p className="text-sm text-muted-foreground">New uploads appear immediately</p>
            </div>
            <Switch 
              checked={!settings.require_approval}
              onCheckedChange={(checked) => onUpdateSettings({ require_approval: !checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Show Download Buttons</p>
              <p className="text-sm text-muted-foreground">Let guests download media</p>
            </div>
            <Switch 
              checked={settings.show_download_buttons !== false}
              onCheckedChange={(checked) => onUpdateSettings({ show_download_buttons: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Watermark</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">Enable Watermark</p>
            <Switch 
              checked={settings.watermark_enabled || false}
              onCheckedChange={(checked) => onUpdateSettings({ watermark_enabled: checked })}
            />
          </div>
          
          {settings.watermark_enabled && (
            <div>
              <Label>Watermark Text</Label>
              <Input 
                value={settings.watermark_text || ''}
                onChange={(e) => onUpdateSettings({ watermark_text: e.target.value })}
                placeholder="e.g., John & Jane • 2025"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
