import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Mail, MessageSquare, Send } from 'lucide-react';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  mobile: string | null;
  event_id: string;
}

interface IndividualReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest: Guest | null;
  eventName: string;
}

export const IndividualReminderModal = ({ isOpen, onClose, guest, eventName }: IndividualReminderModalProps) => {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    setStep(1);
    setMethod('email');
    setMessage('');
    onClose();
  };

  const handleSend = async () => {
    if (!guest) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create individual reminder campaign
      const { data: campaign } = await supabase
        .from('rsvp_reminder_campaigns')
        .insert({
          event_id: guest.event_id,
          user_id: user.id,
          name: `Individual Reminder - ${guest.first_name} ${guest.last_name}`,
          message_template: message,
          delivery_method: method,
          target_status: ['Pending'],
          status: 'completed',
          total_count: 1,
          sent_count: 1,
        })
        .select()
        .single();

      if (campaign) {
        // Log the individual delivery
        await supabase.from('reminder_deliveries').insert({
          campaign_id: campaign.id,
          guest_id: guest.id,
          delivery_method: method,
          status: 'sent',
          sent_at: new Date().toISOString(),
          reminder_type: 'individual',
        });
      }

      toast({
        title: 'Success',
        description: `🎉 Reminder sent to ${guest.first_name} ${guest.last_name}.`,
      });

      handleClose();
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reminder',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (!guest) return null;

  const defaultMessage = `Hi ${guest.first_name}, this is a friendly reminder about ${eventName}. Please confirm your RSVP when you get a chance!`;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Send Individual Reminder
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Method */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Sending to: <span className="font-medium text-foreground">{guest.first_name} {guest.last_name}</span>
              </p>
              <Label>Delivery Method</Label>
              <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email {guest.email ? `(${guest.email})` : '(Not available)'}
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      SMS {guest.mobile ? `(${guest.mobile})` : '(Not available)'}
                    </div>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      WhatsApp {guest.mobile ? `(${guest.mobile})` : '(Not available)'}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => { setMessage(defaultMessage); setStep(2); }}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Message */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            <div>
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your reminder message..."
                rows={6}
                className="mt-2"
              />
              {method === 'sms' && (
                <p className={`text-xs mt-1 ${message.length > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {message.length}/160 characters {message.length > 160 && '(Multiple SMS)'}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!message}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Send */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">To:</span>
                <span className="font-medium">{guest.first_name} {guest.last_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Method:</span>
                <span className="font-medium capitalize">{method}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Contact:</span>
                <span className="font-medium">{method === 'email' ? guest.email : guest.mobile}</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleSend} disabled={sending}>
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Sending...' : 'Send Reminder'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};