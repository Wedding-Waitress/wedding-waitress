import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, Check, X, RefreshCw, AlertTriangle } from 'lucide-react';

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
  const [testSending, setTestSending] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);

  useEffect(() => {
    loadSettings();
    checkEmailConfiguration();
  }, []);

  const checkEmailConfiguration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notification_settings')
        .select('email_enabled, resend_api_key, from_email')
        .eq('user_id', user.id)
        .maybeSingle();

      setEmailConfigured(!!data?.email_enabled && !!data?.resend_api_key && !!data?.from_email);
    } catch (error) {
      console.error('Error checking email configuration:', error);
    }
  };

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

  const sendTestNotification = async () => {
    setTestSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call edge function directly with test data
      const { data, error } = await supabase.functions.invoke('send-rsvp-notification', {
        body: {
          guest_id: 'test-guest',
          event_id: 'test-event',
          old_rsvp: 'Pending',
          new_rsvp: 'Attending',
          user_id: user.id,
          is_test: true,
        }
      });

      if (error) throw error;

      toast({
        title: 'Test notification sent! ✅',
        description: `Check your email: ${settings.notification_email || 'your configured email'}`,
      });
    } catch (error: any) {
      console.error('Test notification failed:', error);
      toast({
        title: 'Test failed',
        description: error.message || 'Could not send test notification. Check your email configuration.',
        variant: 'destructive',
      });
    } finally {
      setTestSending(false);
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
        {settings.email_notifications && !emailConfigured && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Email not configured</AlertTitle>
            <AlertDescription>
              Please configure your Resend API key and from email in Admin Settings → Notification Settings before enabling RSVP notifications.
            </AlertDescription>
          </Alert>
        )}

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

        <div className="flex gap-2">
          <Button onClick={saveSettings} disabled={saving} className="flex-1">
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={sendTestNotification}
            disabled={!settings.email_notifications || !emailConfigured || testSending}
            className="flex-1"
          >
            {testSending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Test
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};