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
          <CardTitle>Upload Limits</CardTitle>
          <CardDescription>
            Control file sizes and video lengths guests can upload
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Max Photo Size (MB)</Label>
            <Input 
              type="number"
              min="1"
              max="50"
              value={settings.max_photo_size_mb || 25}
              onChange={(e) => onUpdateSettings({ 
                max_photo_size_mb: parseInt(e.target.value) 
              })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Recommended: 10MB for standard photos, 25MB for high-res
            </p>
          </div>

          <Separator />

          <div>
            <Label>Max Video Size (MB)</Label>
            <Input 
              type="number"
              min="50"
              max="2000"
              step="50"
              value={settings.max_video_size_mb || 1000}
              onChange={(e) => onUpdateSettings({ 
                max_video_size_mb: parseInt(e.target.value) 
              })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              💡 500MB = ~5 mins | 1000MB = ~10 mins | 2000MB = ~30 mins
            </p>
          </div>

          <Separator />

          <div>
            <Label>Max Video Duration</Label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-background"
              value={settings.max_video_duration_seconds || 600}
              onChange={(e) => onUpdateSettings({ 
                max_video_duration_seconds: parseInt(e.target.value) 
              })}
            >
              <option value="60">1 minute</option>
              <option value="180">3 minutes</option>
              <option value="300">5 minutes</option>
              <option value="600">10 minutes</option>
              <option value="1800">30 minutes</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Longer videos = longer uploads on mobile
            </p>
          </div>

          {(settings.max_video_size_mb > 1000 || settings.max_video_duration_seconds > 600) && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ <strong>High limits may cause:</strong>
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-300 mt-2 ml-4 list-disc space-y-1">
                <li>Long upload times on mobile (10-30 minutes)</li>
                <li>Failed uploads on slow connections</li>
                <li>High storage costs</li>
              </ul>
            </div>
          )}
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
