import { normalizePublicPlanName } from '@/lib/stripeExtensionPrices';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Edit, Mail, MessageSquareText, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import actionStyles from './RsvpInviteActions.module.css';
import { CommunicationCreditPackOptions } from './CommunicationCreditPackOptions';
import {
  deliveryMethodLabel,
  deliveryUnavailableReason,
  getRsvpDeliverySummary,
  sendButtonLabel,
  type RsvpContactGuest,
  type RsvpDeliveryMethod,
} from '@/lib/rsvpInviteWorkflow';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (method: RsvpDeliveryMethod) => void;
  onEditGuest: (guest: RsvpContactGuest) => void;
  eventId: string;
  planName: string;
  included: number;
  used: number;
  remaining: number;
  selectedGuests: RsvpContactGuest[];
  canPurchaseCredits?: boolean;
}

const METHODS: Array<{ value: RsvpDeliveryMethod; icon: typeof Mail; description: string }> = [
  { value: 'email', icon: Mail, description: 'Send one email to every selected guest.' },
  { value: 'sms', icon: MessageSquareText, description: 'Send one SMS to every selected guest.' },
  { value: 'both', icon: Send, description: 'Send both an email and an SMS to every selected guest.' },
];

export const RsvpAlreadyPaidModal: React.FC<Props> = ({
  isOpen, onClose, onContinue, onEditGuest, eventId, planName, included, used, remaining,
  selectedGuests, canPurchaseCredits = true,
}) => {
  const [method, setMethod] = useState<RsvpDeliveryMethod | null>(null);
  const capabilitySummary = useMemo(() => getRsvpDeliverySummary(selectedGuests), [selectedGuests]);
  const deliverySummary = useMemo(() => getRsvpDeliverySummary(selectedGuests, method), [selectedGuests, method]);
  const enough = method !== null && remaining >= deliverySummary.creditsUsed;

  useEffect(() => {
    if (!isOpen) setMethod(null);
  }, [isOpen]);

  const contactExplanation = (guest: RsvpContactGuest) => {
    const hasEmail = Boolean(guest.email?.trim());
    const hasMobile = Boolean(guest.mobile?.trim());
    if (hasEmail && !hasMobile) return `${guest.first_name} will receive an email only because no mobile number is saved.`;
    if (!hasEmail && hasMobile) return `${guest.first_name} will receive an SMS only because no email address is saved.`;
    return `${guest.first_name} cannot receive an invitation because no email address or mobile number is saved.`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="ww-guest-list-typography max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="mt-6 flex items-center justify-center gap-2 text-lg"><Send className="h-5 w-5 text-primary" />Send RSVP &amp; Invite</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <section className="rounded-xl border border-[#d8c7b2] bg-[#fbf6ed] p-4" aria-labelledby="selected-guests-heading">
            <h3 id="selected-guests-heading" className="font-semibold text-foreground">Selected guests</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <div className="rounded-lg border bg-white p-2 text-center"><strong>{capabilitySummary.selectedCount}</strong><span className="block text-xs text-muted-foreground">Selected</span></div>
              <div className="rounded-lg border bg-white p-2 text-center"><strong>{capabilitySummary.withEmail.length}</strong><span className="block text-xs text-muted-foreground">Guests receiving Email</span></div>
              <div className="rounded-lg border bg-white p-2 text-center"><strong>{capabilitySummary.withSms.length}</strong><span className="block text-xs text-muted-foreground">Guests receiving SMS</span></div>
              <div className="rounded-lg border bg-white p-2 text-center"><strong>{capabilitySummary.withBoth.length}</strong><span className="block text-xs text-muted-foreground">Guests receiving Both</span></div>
              <div className="col-span-2 rounded-lg border bg-white p-2 text-center sm:col-span-1"><strong>{capabilitySummary.missingEither.length}</strong><span className="block text-xs text-muted-foreground">Missing Email or Mobile</span></div>
            </div>
            {capabilitySummary.missingEither.length > 0 && (
              <div className="mt-3 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                {capabilitySummary.missingEither.map((guest) => (
                  <div key={guest.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-amber-900">{contactExplanation(guest)}</p>
                    <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full" onClick={() => onEditGuest(guest)}><Edit className="mr-1 h-4 w-4" aria-hidden="true" /> Edit Guest</Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="delivery-method-heading">
            <h3 id="delivery-method-heading" className="font-semibold text-foreground">Delivery method</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {METHODS.map(({ value, icon: Icon, description }) => {
                const available = capabilitySummary.availability[value];
                const reason = available ? null : deliveryUnavailableReason(value, selectedGuests);
                return (
                  <button key={value} type="button" aria-pressed={method === value} disabled={!available} onClick={() => setMethod(value)} className="min-h-[104px] rounded-xl border-2 border-[#cdb99e] bg-white p-3 text-left transition enabled:hover:border-green-500 disabled:cursor-not-allowed disabled:opacity-55 aria-pressed:border-green-600 aria-pressed:bg-green-50">
                    <span className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4" aria-hidden="true" />{deliveryMethodLabel(value)}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{available ? description : reason}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-primary/30 bg-primary/5 p-4" aria-labelledby="credit-heading">
            <h3 id="credit-heading" className="font-semibold text-foreground">{normalizePublicPlanName(planName).replace(/\s+Plan$/i, '')} Plan · Shared Credits</h3>
            <p className="mt-1 text-sm text-muted-foreground">{included} Email &amp; SMS credits included with your plan.</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border bg-white p-3"><p className="text-xl font-bold">{included}</p><p className="text-xs text-muted-foreground">Included</p></div>
              <div className="rounded-lg border bg-white p-3"><p className="text-xl font-bold">{used}</p><p className="text-xs text-muted-foreground">Used</p></div>
              <div className={`rounded-lg border p-3 ${!method || enough ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}><p className="text-xl font-bold">{remaining}</p><p className="text-xs text-muted-foreground">Remaining</p></div>
            </div>
            {method ? (
              <div className="mt-3 space-y-1 text-sm">
                <p className="font-semibold text-foreground">{sendButtonLabel(method, selectedGuests.length)}</p>
                <p>Email recipients: <strong>{deliverySummary.emailRecipientCount}</strong></p>
                <p>SMS recipients: <strong>{deliverySummary.smsRecipientCount}</strong></p>
                <p>This send will use <strong>{deliverySummary.creditsUsed}</strong> shared {deliverySummary.creditsUsed === 1 ? 'credit' : 'credits'}.</p>
                <p>Credits remaining after sending: <strong>{Math.max(0, remaining - deliverySummary.creditsUsed)}</strong></p>
              </div>
            ) : <p className="mt-3 text-sm text-muted-foreground">Choose a delivery method to calculate the shared credits required.</p>}
            {method && !enough && (
              <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-center">
                <p className="flex items-center justify-center gap-2 text-sm font-semibold"><AlertCircle className="h-4 w-4" />You need more shared invitation credits.</p>
                <CommunicationCreditPackOptions eventId={eventId} canPurchase={canPurchaseCredits} className="mt-3" />
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="gap-2 pb-4 max-sm:flex-col">
          <Button type="button" onClick={() => method && onContinue(method)} disabled={!method || !enough} className={actionStyles.primaryAction}><span>Continue</span></Button>
          <Button type="button" onClick={onClose} className={actionStyles.cancelAction}><span>Cancel</span></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
