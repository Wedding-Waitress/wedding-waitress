import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { Mail, MessageSquare, Eye, EyeOff, ExternalLink, Loader2 } from 'lucide-react';

/**
 * AdminNotificationSettings
 * Email (Resend) is admin-managed.
 * SMS is now Wedding Waitress fully-managed Smart RSVP & Messaging — no Twilio fields shown.
 */
export const AdminNotificationSettings = () => {
  const { settings, loading, updateSettings } = useNotificationSettings();
  const [showKeys, setShowKeys] = useState({ resendApiKey: false });
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    resend_api_key: '',
    from_email: '',
    email_enabled: false,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        resend_api_key: settings.resend_api_key || '',
        from_email: settings.from_email || '',
        email_enabled: settings.email_enabled,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    // Smart RSVP & Messaging is fully managed: SMS provider always 'wedding_waitress',
    // and no per-user Twilio creds are stored. Preserve existing nullable fields.
    await updateSettings({
      ...formData,
      sms_provider: 'wedding_waitress',
      twilio_account_sid: null,
      twilio_auth_token: null,
      twilio_messaging_service_sid: null,
      sms_enabled: true,
    });
    setIsSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Settings */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Email (Resend)</h2>
              <p className="text-sm text-muted-foreground">Send questionnaires via email</p>
            </div>
          </div>
          <Switch
            checked={formData.email_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, email_enabled: checked })}
          />
        </div>

        <div className="space-y-4 pl-14">
          <div className="space-y-2">
            <Label htmlFor="resend_api_key">Resend API Key</Label>
            <div className="flex gap-2">
              <Input
                id="resend_api_key"
                type={showKeys.resendApiKey ? 'text' : 'password'}
                value={formData.resend_api_key}
                onChange={(e) => setFormData({ ...formData, resend_api_key: e.target.value })}
                placeholder="re_..."
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowKeys({ ...showKeys, resendApiKey: !showKeys.resendApiKey })}
              >
                {showKeys.resendApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from{' '}
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Resend Dashboard <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from_email">From Email Address</Label>
            <Input
              id="from_email"
              type="email"
              value={formData.from_email}
              onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
              placeholder="noreply@yourdomain.com"
            />
          </div>
        </div>
      </Card>

      {/* Smart RSVP & Messaging — fully managed */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Smart RSVP &amp; Messaging</h2>
            <p className="text-sm text-muted-foreground">
              Fully managed by Wedding Waitress — no provider setup required.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground pl-14">
          SMS sending uses Wedding Waitress&apos; managed messaging infrastructure. Each event
          includes 250 SMS credits with the Smart RSVP &amp; Messaging activation. Top-ups are
          available per event for $99 AUD (250 credits).
        </p>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="lv-premium-shade">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
};
