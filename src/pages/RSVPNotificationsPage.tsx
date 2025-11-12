import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRSVPNotificationSettings } from '@/hooks/useRSVPNotificationSettings';
import { useRSVPAnalytics } from '@/hooks/useRSVPAnalytics';
import { useEvents } from '@/hooks/useEvents';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { ReminderHistoryModal } from '@/components/Dashboard/ReminderHistoryModal';
import { InitialInvitationWizard } from '@/components/Dashboard/InitialInvitationWizard';
import { Bell, Mail, MessageSquare, Users, Settings, BarChart3, AlertTriangle, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import { StandardEventSelector } from '@/components/Dashboard/StandardEventSelector';
import { supabase } from '@/integrations/supabase/client';
import { useGuests } from '@/hooks/useGuests';

export const RSVPNotificationsPage = () => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showInvitationWizard, setShowInvitationWizard] = useState(false);
  const [saving, setSaving] = useState(false);

  const { events } = useEvents();
  const { guests, fetchGuests } = useGuests(selectedEventId);
  const { userSettings, eventSettings, loading, saveUserSettings, saveEventSettings } = useRSVPNotificationSettings(selectedEventId);
  const { analytics } = useRSVPAnalytics(selectedEventId);
  const { settings: apiSettings, updateSettings: updateApiSettings } = useNotificationSettings();

  useEffect(() => {
    if (selectedEventId) {
      fetchEventData();
    }
  }, [selectedEventId]);

  const fetchEventData = async () => {
    if (!selectedEventId) return;
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('id', selectedEventId)
      .single();
    setEventData(data);
  };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      userSettings && saveUserSettings(userSettings),
      eventSettings && saveEventSettings(eventSettings),
    ]);
    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading settings...</div>;
  }

  const hasEmailConfig = userSettings?.email_notifications;
  const hasSMSConfig = userSettings?.sms_enabled && userSettings?.twilio_sender_id;
  const hasWhatsAppConfig = userSettings?.whatsapp_enabled && userSettings?.twilio_sender_id;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          🔔 RSVP Notifications & Settings
        </h1>
        <p className="text-muted-foreground">
          Configure automatic reminders, host alerts, and daily summaries for your events
        </p>
      </div>

      {/* Event Selector */}
      <StandardEventSelector
        selectedEventId={selectedEventId}
        onEventSelect={setSelectedEventId}
        events={events}
      />

      {!selectedEventId ? (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>Please select an event to configure RSVP notifications</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Initial RSVP Invitations Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Send Initial RSVP Invitations
              </CardTitle>
              <CardDescription>
                Send beautiful email invitations with embedded QR codes - completely FREE!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    ✅ Professional HTML email templates<br />
                    ✅ Personalized QR codes for each guest<br />
                    ✅ Direct RSVP link to guest lookup page<br />
                    ✅ Zero cost - uses free email delivery
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <p className="text-sm font-semibold text-success">
                      Cost: $0.00 (FREE)
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowInvitationWizard(true)}
                  className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                  size="lg"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitations
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Card 1: Notification Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Notification Channels
              </CardTitle>
              <CardDescription>Configure how you want to receive RSVP updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-toggle">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive RSVP updates via email</p>
                </div>
                <Switch
                  id="email-toggle"
                  checked={userSettings?.email_notifications || false}
                  onCheckedChange={(checked) =>
                    userSettings && saveUserSettings({ ...userSettings, email_notifications: checked })
                  }
                />
              </div>
              {userSettings?.email_notifications && (
                <div>
                  <Label>Notification Email</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={userSettings?.notification_email || ''}
                    onChange={(e) =>
                      userSettings && saveUserSettings({ ...userSettings, notification_email: e.target.value })
                    }
                  />
                </div>
              )}

              {/* SMS */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-toggle">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send reminders via SMS</p>
                </div>
                <Switch
                  id="sms-toggle"
                  checked={userSettings?.sms_enabled || false}
                  onCheckedChange={(checked) =>
                    userSettings && saveUserSettings({ ...userSettings, sms_enabled: checked })
                  }
                />
              </div>

              {/* WhatsApp */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="whatsapp-toggle">WhatsApp Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send reminders via WhatsApp</p>
                </div>
                <Switch
                  id="whatsapp-toggle"
                  checked={userSettings?.whatsapp_enabled || false}
                  onCheckedChange={(checked) =>
                    userSettings && saveUserSettings({ ...userSettings, whatsapp_enabled: checked })
                  }
                />
              </div>

              {(userSettings?.sms_enabled || userSettings?.whatsapp_enabled) && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold">Twilio API Configuration</h4>
                  </div>
                  
                  {/* Account SID */}
                  <div>
                    <Label htmlFor="twilio-sid">Twilio Account SID</Label>
                    <Input
                      id="twilio-sid"
                      placeholder="AC..."
                      value={apiSettings?.twilio_account_sid || ''}
                      onChange={(e) => updateApiSettings({ twilio_account_sid: e.target.value })}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Find in <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Twilio Console</a>
                    </p>
                  </div>

                  {/* Auth Token */}
                  <div>
                    <Label htmlFor="twilio-token">Twilio Auth Token</Label>
                    <Input
                      id="twilio-token"
                      type="password"
                      placeholder="••••••••"
                      value={apiSettings?.twilio_auth_token || ''}
                      onChange={(e) => updateApiSettings({ twilio_auth_token: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Messaging Service SID */}
                  <div>
                    <Label htmlFor="twilio-msg-sid">Twilio Messaging Service SID (Optional)</Label>
                    <Input
                      id="twilio-msg-sid"
                      placeholder="MG..."
                      value={apiSettings?.twilio_messaging_service_sid || ''}
                      onChange={(e) => updateApiSettings({ twilio_messaging_service_sid: e.target.value })}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use Messaging Service SID or Phone Number below (not both)
                    </p>
                  </div>

                  {/* Sender Phone Number */}
                  <div>
                    <Label htmlFor="twilio-sender">Twilio Phone Number (Optional)</Label>
                    <Input
                      id="twilio-sender"
                      placeholder="+1234567890"
                      value={userSettings?.twilio_sender_id || ''}
                      onChange={(e) =>
                        userSettings && saveUserSettings({ ...userSettings, twilio_sender_id: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your verified Twilio phone number (include country code)
                    </p>
                  </div>

                  {/* Configuration Status Alert */}
                  {(!apiSettings?.twilio_account_sid || !apiSettings?.twilio_auth_token || (!apiSettings?.twilio_messaging_service_sid && !userSettings?.twilio_sender_id)) && (
                    <Alert variant="destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        Missing Twilio credentials. SMS/WhatsApp will run in <strong>Preview Mode</strong> (logs only, no actual sending).
                      </AlertDescription>
                    </Alert>
                  )}

                  {(apiSettings?.twilio_account_sid && apiSettings?.twilio_auth_token && (apiSettings?.twilio_messaging_service_sid || userSettings?.twilio_sender_id)) && (
                    <Alert className="border-success/50 bg-success/10">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <AlertDescription className="text-success">
                        Twilio configuration complete - live SMS/WhatsApp delivery enabled
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {!hasEmailConfig && !hasSMSConfig && !hasWhatsAppConfig && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    No notification channels configured. Enable at least one channel above.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Host Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Host Alerts
              </CardTitle>
              <CardDescription>Choose who receives RSVP notifications for this event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="partner1"
                  checked={eventSettings?.notify_partner1 || false}
                  onCheckedChange={(checked: boolean) =>
                    eventSettings && saveEventSettings({ ...eventSettings, notify_partner1: checked })
                  }
                />
                <Label htmlFor="partner1" className="font-normal">
                  {eventData?.partner1_name || 'Partner 1'}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="partner2"
                  checked={eventSettings?.notify_partner2 || false}
                  onCheckedChange={(checked: boolean) =>
                    eventSettings && saveEventSettings({ ...eventSettings, notify_partner2: checked })
                  }
                />
                <Label htmlFor="partner2" className="font-normal">
                  {eventData?.partner2_name || 'Partner 2'}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="planner"
                  checked={eventSettings?.notify_event_planner || false}
                  onCheckedChange={(checked: boolean) =>
                    eventSettings && saveEventSettings({ ...eventSettings, notify_event_planner: checked })
                  }
                />
                <Label htmlFor="planner" className="font-normal">
                  Event Planner
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="both"
                  checked={eventSettings?.notify_both_partners || false}
                  onCheckedChange={(checked: boolean) =>
                    eventSettings && saveEventSettings({ ...eventSettings, notify_both_partners: checked })
                  }
                />
                <Label htmlFor="both" className="font-normal">
                  Both Partners
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Automation Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Automation Rules
              </CardTitle>
              <CardDescription>Automatic RSVP reminders and daily summaries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto Reminders */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label htmlFor="auto-reminders">Auto RSVP Reminders</Label>
                    <p className="text-sm text-muted-foreground">Automatically send reminders before the event</p>
                  </div>
                  <Switch
                    id="auto-reminders"
                    checked={eventSettings?.auto_reminders_enabled || false}
                    onCheckedChange={(checked) =>
                      eventSettings && saveEventSettings({ ...eventSettings, auto_reminders_enabled: checked })
                    }
                  />
                </div>

                {eventSettings?.auto_reminders_enabled && (
                  <div className="ml-6 space-y-4">
                    <div>
                      <Label>Send reminder</Label>
                      <Select
                        value={eventSettings?.reminder_days_before?.toString() || '7'}
                        onValueChange={(value) =>
                          eventSettings && saveEventSettings({ ...eventSettings, reminder_days_before: parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day before event</SelectItem>
                          <SelectItem value="3">3 days before event</SelectItem>
                          <SelectItem value="7">7 days before event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="only-no-reply"
                        checked={eventSettings?.reminder_only_no_reply || false}
                        onCheckedChange={(checked: boolean) =>
                          eventSettings && saveEventSettings({ ...eventSettings, reminder_only_no_reply: checked })
                        }
                      />
                      <Label htmlFor="only-no-reply" className="font-normal">
                        Only remind guests with no reply
                      </Label>
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Summary */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="daily-summary">Daily RSVP Summary</Label>
                  <p className="text-sm text-muted-foreground">Receive a daily digest at 8:00 AM</p>
                </div>
                <Switch
                  id="daily-summary"
                  checked={eventSettings?.daily_summary_enabled || false}
                  onCheckedChange={(checked) =>
                    eventSettings && saveEventSettings({ ...eventSettings, daily_summary_enabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Analytics Summary */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Analytics Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{analytics.totalRemindersSent}</div>
                  <div className="text-sm text-muted-foreground">Reminders Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-5 h-5" />
                    {analytics.acceptedRsvps}
                  </div>
                  <div className="text-sm text-muted-foreground">Accepted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive flex items-center justify-center gap-1">
                    <XCircle className="w-5 h-5" />
                    {analytics.declinedRsvps}
                  </div>
                  <div className="text-sm text-muted-foreground">Declined</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-warning flex items-center justify-center gap-1">
                    <Clock className="w-5 h-5" />
                    {analytics.pendingRsvps}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
              </div>

              {analytics.pendingRsvps === 0 && (
                <Alert>
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  <AlertDescription className="text-muted-foreground">
                    No guests to remind - all RSVPs received!
                  </AlertDescription>
                </Alert>
              )}

              {analytics.nextReminderDate && (
                <Alert className="border-primary/50">
                  <Bell className="w-4 h-4 text-primary" />
                  <AlertDescription>
                    <span className="font-medium text-primary">Next reminder scheduled:</span>{' '}
                    {new Date(analytics.nextReminderDate).toLocaleString()}
                  </AlertDescription>
                </Alert>
              )}

              <Button variant="outline" onClick={() => setShowHistory(true)} className="w-full">
                View Reminder History
              </Button>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg" className="bg-gradient-to-r from-[#667eea] to-[#764ba2]">
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </>
      )}

      <ReminderHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        eventId={selectedEventId}
      />

      {selectedEventId && eventData && (
        <InitialInvitationWizard
          open={showInvitationWizard}
          onOpenChange={setShowInvitationWizard}
          eventId={selectedEventId}
          eventName={eventData.name}
          guests={guests}
          onSuccess={() => {
            fetchGuests();
          }}
        />
      )}
    </div>
  );
};