import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Mail, MessageSquareText, Send } from 'lucide-react';
import { SMS_TOPUP } from '@/lib/stripePrices';
import { useSmsTopup } from '@/hooks/useSmsTopup';

interface Props {
  isOpen: boolean; onClose: () => void; onContinue: () => void; eventId: string;
  planName: string; included: number; used: number; remaining: number;
  selectedCount: number; channel: 'email' | 'sms';
}

export const RsvpAlreadyPaidModal: React.FC<Props> = ({
  isOpen, onClose, onContinue, eventId, planName, included, used, remaining, selectedCount, channel,
}) => {
  const { startTopup, loading } = useSmsTopup();
  const enough = remaining >= selectedCount;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="ww-guest-list-typography max-w-md">
        <DialogHeader><DialogTitle className="mt-8 flex items-center justify-center gap-2 text-lg"><Send className="h-5 w-5 text-primary" />Send RSVP &amp; Invite</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2 max-lg:px-3">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4"><p className="font-semibold text-foreground">{planName} Plan</p><p className="mt-1 text-sm text-muted-foreground">{included} Email &amp; SMS credits included with your plan.</p></div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border p-3"><p className="text-xl font-bold">{included}</p><p className="text-xs text-muted-foreground">Included</p></div>
            <div className="rounded-lg border p-3"><p className="text-xl font-bold">{used}</p><p className="text-xs text-muted-foreground">Used</p></div>
            <div className={`rounded-lg border p-3 ${enough ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}><p className="text-xl font-bold">{remaining}</p><p className="text-xs text-muted-foreground">Left</p></div>
          </div>
          <p className="flex items-center justify-center gap-2 text-sm">{channel === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}Sending to {selectedCount} selected guest{selectedCount === 1 ? '' : 's'} will use {selectedCount} credit{selectedCount === 1 ? '' : 's'}.</p>
          {!enough && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-center"><p className="text-sm font-semibold">You need more Email &amp; SMS credits.</p><p className="mt-1 text-xs text-muted-foreground">Add {SMS_TOPUP.credits} credits for ${SMS_TOPUP.price_aud} AUD.</p></div>}
        </div>
        <DialogFooter className="gap-2 pb-6 max-lg:px-3 max-lg:flex-row">
          {enough ? <Button onClick={onContinue} className="rounded-full bg-green-500 text-white hover:bg-green-600">Continue to Send Invites</Button> : <Button onClick={() => startTopup(eventId)} disabled={loading} className="rounded-full bg-green-500 text-white hover:bg-green-600"><CreditCard className="mr-2 h-4 w-4" />Buy {SMS_TOPUP.credits} Credits — ${SMS_TOPUP.price_aud}</Button>}
          <Button onClick={onClose} className="rounded-full bg-red-500 text-white hover:bg-red-600">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
