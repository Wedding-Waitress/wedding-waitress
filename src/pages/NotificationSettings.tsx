import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { Mail, MessageSquare, Eye, EyeOff, ExternalLink, Loader2 } from 'lucide-react';

export default function NotificationSettings() {
  const { settings, loading, updateSettings } = useNotificationSettings();
  const [showKeys, setShowKeys] = useState({
    resendApiKey: false,
    twilioAuthToken: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    resend_api_key: '',
    from_email: '',
    email_enabled: false,
    sms_provider: 'twilio' as 'twilio' | 'messagemedia' | 'telnyx',
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_messaging_service_sid: '',
    sms_enabled: false,
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        resend_api_key: settings.resend_api_key || '',
        from_email: settings.from_email || '',
        email_enabled: settings.email_enabled,
        sms_provider: (settings.sms_provider || 'twilio') as any,
        twilio_account_sid: settings.twilio_account_sid || '',
        twilio_auth_token: settings.twilio_auth_token || '',
        twilio_messaging_service_sid: settings.twilio_messaging_service_sid || '',
        sms_enabled: settings.sms_enabled,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings(formData);
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
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure email and SMS providers to send DJ questionnaires to clients
        </p>
      </div>

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
            <p className="text-xs text-muted-foreground">
              Make sure this domain is verified in{' '}
              <a
                href="https://resend.com/domains"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Resend <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
      </Card>

      {/* SMS Settings */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">SMS</h2>
              <p className="text-sm text-muted-foreground">Send questionnaires via SMS</p>
            </div>
          </div>
          <Switch
            checked={formData.sms_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, sms_enabled: checked })}
          />
        </div>

        <div className="space-y-4 pl-14">
          <div className="space-y-2">
            <Label htmlFor="sms_provider">SMS Provider</Label>
            <Select
              value={formData.sms_provider}
              onValueChange={(value: any) => setFormData({ ...formData, sms_provider: value })}
            >
              <SelectTrigger id="sms_provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="messagemedia">MessageMedia</SelectItem>
                <SelectItem value="telnyx">Telnyx</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.sms_provider === 'twilio' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="twilio_account_sid">Account SID</Label>
                <Input
                  id="twilio_account_sid"
                  value={formData.twilio_account_sid}
                  onChange={(e) => setFormData({ ...formData, twilio_account_sid: e.target.value })}
                  placeholder="AC..."
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twilio_auth_token">Auth Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="twilio_auth_token"
                    type={showKeys.twilioAuthToken ? 'text' : 'password'}
                    value={formData.twilio_auth_token}
                    onChange={(e) => setFormData({ ...formData, twilio_auth_token: e.target.value })}
                    placeholder="••••••••"
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowKeys({ ...showKeys, twilioAuthToken: !showKeys.twilioAuthToken })}
                  >
                    {showKeys.twilioAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="twilio_messaging_service_sid">Messaging Service SID</Label>
                <Input
                  id="twilio_messaging_service_sid"
                  value={formData.twilio_messaging_service_sid}
                  onChange={(e) => setFormData({ ...formData, twilio_messaging_service_sid: e.target.value })}
                  placeholder="MG..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Get credentials from{' '}
                  <a
                    href="https://console.twilio.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Twilio Console <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </>
          )}

          {formData.sms_provider === 'messagemedia' && (
            <p className="text-sm text-muted-foreground">MessageMedia integration coming soon</p>
          )}

          {formData.sms_provider === 'telnyx' && (
            <p className="text-sm text-muted-foreground">Telnyx integration coming soon</p>
          )}
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
