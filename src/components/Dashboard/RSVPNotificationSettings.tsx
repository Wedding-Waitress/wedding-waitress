import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, Check, X, RefreshCw } from 'lucide-react';

export const RSVPNotificationSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    email_notifications: true,
    notification_email: '',
    notify_on_accept: true,
    notify_on_decline: true,
    notify_on_update: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('rsvp_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          email_notifications: data.email_notifications,
          notification_email: data.notification_email || '',
          notify_on_accept: data.notify_on_accept,
          notify_on_decline: data.notify_on_decline,
          notify_on_update: data.notify_on_update,
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('rsvp_notification_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Your RSVP notification preferences have been updated.',
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          RSVP Notifications
        </CardTitle>
        <CardDescription>
          Get notified when guests update their RSVP status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Email Notifications</Label>
            <div className="text-sm text-muted-foreground">
              Receive email alerts for RSVP changes
            </div>
          </div>
          <Switch
            checked={settings.email_notifications}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, email_notifications: checked })
            }
          />
        </div>

        {settings.email_notifications && (
          <>
            <div className="space-y-2">
              <Label htmlFor="notification-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Notification Email
              </Label>
              <Input
                id="notification-email"
                type="email"
                placeholder="your@email.com (leave blank to use account email)"
                value={settings.notification_email}
                onChange={(e) =>
                  setSettings({ ...settings, notification_email: e.target.value })
                }
              />
            </div>

            <div className="space-y-4 pt-2">
              <Label className="text-sm font-medium">Notify me when:</Label>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Guest accepts invitation</span>
                </div>
                <Switch
                  checked={settings.notify_on_accept}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_accept: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-red-600" />
                  <span className="text-sm">Guest declines invitation</span>
                </div>
                <Switch
                  checked={settings.notify_on_decline}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_decline: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">Guest updates their RSVP</span>
                </div>
                <Switch
                  checked={settings.notify_on_update}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_update: checked })
                  }
                />
              </div>
            </div>
          </>
        )}

        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};