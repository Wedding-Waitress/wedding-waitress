import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageSquare, Send, CheckCircle2, XCircle, Clock, AlertCircle, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInvitationSend } from '@/hooks/useInvitationSend';
import { useUserPlan } from '@/hooks/useUserPlan';
import { buildInvitationElement, captureElement } from '@/lib/invitationExporter';
import type { Guest } from '@/hooks/useGuests';
import type { InvitationTemplate } from '@/hooks/useInvitationTemplates';
import type { QrConfig } from '@/lib/invitationQR';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: Guest[];
  eventId: string;
  template: InvitationTemplate;
  customText: Record<string, string>;
  customStyles: Record<string, any>;
  eventData: Record<string, string>;
  qrConfig?: QrConfig;
  qrDataUrl?: string;
}

const FREE_SEND_LIMIT = 3;

const statusBadge = (status?: string) => {
  switch (status) {
    case 'email_sent':
      return <Badge variant="secondary" className="text-[10px] gap-1"><Mail className="w-3 h-3" />Email sent</Badge>;
    case 'sms_sent':
      return <Badge variant="secondary" className="text-[10px] gap-1"><MessageSquare className="w-3 h-3" />SMS sent</Badge>;
    case 'both_sent':
      return <Badge variant="secondary" className="text-[10px] gap-1"><CheckCircle2 className="w-3 h-3" />Both sent</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] gap-1"><Clock className="w-3 h-3" />Not sent</Badge>;
  }
};

export const InvitationSendModal: React.FC<Props> = ({
  open, onOpenChange, guests, eventId,
  template, customText, customStyles, eventData, qrConfig, qrDataUrl,
}) => {
  const { toast } = useToast();
  const { sending, sendInvitationEmail, sendInvitationSms } = useInvitationSend();
  const { isStarterPlan } = useUserPlan();
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [sendCount, setSendCount] = useState(0);

  const filteredGuests = useMemo(() => {
    return guests.filter(g => channel === 'email' ? g.email?.trim() : g.mobile?.trim());
  }, [guests, channel]);

  const toggleGuest = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredGuests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredGuests.map(g => g.id)));
    }
  };

  const handleSend = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    if (isStarterPlan && sendCount + ids.length > FREE_SEND_LIMIT) {
      toast({
        title: 'Send limit reached',
        description: `Free plan allows ${FREE_SEND_LIMIT} sends. Upgrade for unlimited.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setProgress({ current: 0, total: ids.length });

      if (channel === 'email') {
        // Generate invitation image
        const exportOpts = {
          backgroundUrl: template.background_url,
          orientation: template.orientation,
          widthMm: template.width_mm,
          heightMm: template.height_mm,
          textZones: template.text_zones,
          customText,
          customStyles,
          eventData,
          qrConfig,
          qrDataUrl,
        };
        const el = buildInvitationElement(exportOpts);
        const canvas = await captureElement(el);
        const imageBase64 = canvas.toDataURL('image/png');

        setProgress({ current: 1, total: 2 });
        const result = await sendInvitationEmail(eventId, ids, imageBase64);
        setProgress({ current: 2, total: 2 });

        toast({
          title: 'Invitations sent',
          description: `${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped (no email)`,
        });
        setSendCount(prev => prev + result.sent);
      } else {
        const result = await sendInvitationSms(eventId, ids);
        setProgress({ current: ids.length, total: ids.length });

        toast({
          title: 'SMS sent',
          description: `${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped (no mobile)`,
        });
        setSendCount(prev => prev + result.sent);
      }

      setSelected(new Set());
      onOpenChange(false);
    } catch (err: any) {
      console.error('Send error:', err);
      toast({
        title: 'Send failed',
        description: err.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" /> Send Invitation to Guests
          </DialogTitle>
          <DialogDescription>
            Select guests and choose a delivery channel. {channel === 'email' ? 'Email will include your designed invitation image.' : 'SMS will include the RSVP link.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={channel} onValueChange={(v) => { setChannel(v as 'email' | 'sms'); setSelected(new Set()); }}>
          <TabsList className="w-full">
            <TabsTrigger value="email" className="flex-1 gap-2"><Mail className="w-4 h-4" />Email</TabsTrigger>
            <TabsTrigger value="sms" className="flex-1 gap-2"><MessageSquare className="w-4 h-4" />SMS</TabsTrigger>
          </TabsList>
        </Tabs>

        {isStarterPlan && (
          <div className="text-xs text-muted-foreground bg-muted rounded-lg p-2 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span>Free plan: {Math.max(0, FREE_SEND_LIMIT - sendCount)} sends remaining</span>
          </div>
        )}

        {filteredGuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-sm">No guests with {channel === 'email' ? 'email addresses' : 'mobile numbers'} found.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                checked={selected.size === filteredGuests.length && filteredGuests.length > 0}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all ({filteredGuests.length} guest{filteredGuests.length !== 1 ? 's' : ''})
              </span>
            </div>

            <ScrollArea className="flex-1 max-h-[300px] border rounded-lg">
              <div className="divide-y">
                {filteredGuests.map(guest => (
                  <label key={guest.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={selected.has(guest.id)}
                      onCheckedChange={() => toggleGuest(guest.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {guest.first_name} {guest.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {channel === 'email' ? guest.email : guest.mobile}
                      </p>
                    </div>
                    {statusBadge(guest.rsvp_invite_status)}
                  </label>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        {progress && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {sending ? 'Sending...' : 'Preparing...'}
            </p>
            <Progress value={(progress.current / progress.total) * 100} className="h-1.5" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || selected.size === 0}>
            <Send className="w-4 h-4 mr-2" />
            Send to {selected.size} guest{selected.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
