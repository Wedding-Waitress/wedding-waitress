/**
 * RSVP Activation Modal — Smart RSVP & Messaging
 *
 * Updated 2026-05-08:
 *  - Brand rename ("Activate Smart RSVP & Messaging") + premium subtitle
 *  - Combined-option sales line under delivery method picker
 *  - Persistence: sessionStorage + DB (last activation's delivery_method) restore
 *    so the user's prior selection survives Stripe redirect, refresh, modal reopen
 *    and post-payment return.
 */
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, CreditCard, Check, Loader2, MessageSquare } from "lucide-react";
import { getPricingTier } from '@/hooks/useRsvpPurchase';
import { getRsvpTier } from '@/lib/stripePrices';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type DeliveryMethod = 'email' | 'sms' | 'both';

interface RsvpActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalGuestCount: number;
  onPayNow: () => void;
  eventId?: string | null;
}

const BUNDLE_FEATURES = [
  'Unlimited Email Invitations',
  '400 SMS Credits Included',
  'Smart RSVP Tracking',
  'Guest Delivery History',
  'RSVP Response Monitoring',
];

const STORAGE_KEY = 'ww:rsvpDeliveryMethod';

const isMethod = (v: unknown): v is DeliveryMethod =>
  v === 'email' || v === 'sms' || v === 'both';

export const RsvpActivationModal: React.FC<RsvpActivationModalProps> = ({
  isOpen,
  onClose,
  totalGuestCount,
  onPayNow,
  eventId,
}) => {
  const pricing = getPricingTier(totalGuestCount);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<DeliveryMethod | null>(null);
  const [attempted, setAttempted] = useState(false);
  const { toast } = useToast();

  // Restore prior selection on open: prefer the last completed activation's
  // saved delivery_method (so already-activated events reopen with their choice
  // pre-selected), otherwise fall back to sessionStorage (abandoned checkout).
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (isMethod(stored)) setMethod(stored);
      } catch { /* ignore */ }

      if (!eventId) return;
      try {
        const { data } = await supabase
          .from('rsvp_invite_purchases')
          .select('delivery_method')
          .eq('event_id', eventId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const dbMethod = (data as { delivery_method?: string } | null)?.delivery_method;
        if (!cancelled && isMethod(dbMethod)) setMethod(dbMethod);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [isOpen, eventId]);

  // Persist current selection so an abandoned checkout reopens with it.
  useEffect(() => {
    if (!method) return;
    try { sessionStorage.setItem(STORAGE_KEY, method); } catch { /* ignore */ }
  }, [method]);

  const canPay = !!method && !loading;

  const handlePayNow = async () => {
    setAttempted(true);
    if (!method) {
      toast({
        title: "Select an invitation method",
        description: "Please select at least one invitation method.",
        variant: "destructive",
      });
      return;
    }

    if (!eventId) {
      onPayNow();
      return;
    }

    setLoading(true);
    try {
      const tier = getRsvpTier(totalGuestCount);
      const body = {
        price_id: tier.price_id,
        mode: 'payment',
        event_id: eventId,
        plan_type: 'rsvp',
        delivery_method: method,
      };

      const invokeAttempt = async () => {
        const { data, error } = await supabase.functions.invoke('create-checkout', { body });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        return data;
      };

      let data;
      try {
        data = await invokeAttempt();
      } catch {
        await new Promise(r => setTimeout(r, 2000));
        data = await invokeAttempt();
      }

      if (data?.url) {
        try {
          sessionStorage.setItem('ww:returnTab', 'guest-list');
          sessionStorage.setItem('ww:rsvpSelectedCount', String(totalGuestCount ?? 0));
          sessionStorage.setItem(STORAGE_KEY, method);
        } catch { /* popup navigation is a best-effort fallback */ }
        onClose();
        const inIframe = window.self !== window.top;
        if (inIframe) {
          try {
            window.top!.location.href = data.url;
          } catch {
            window.open(data.url, '_blank', 'noopener,noreferrer');
          }
        } else {
          window.location.href = data.url;
        }
      } else {
        throw new Error("No checkout URL returned from server");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const MethodCard = ({
    value,
    title,
    icons,
  }: {
    value: DeliveryMethod;
    title: string;
    icons: React.ReactNode;
  }) => {
    const selected = method === value;
    return (
      <button
        type="button"
        onClick={() => setMethod(value)}
        aria-pressed={selected}
        className={`min-h-[64px] rounded-lg border-2 p-3 flex flex-col items-center justify-center gap-1.5 text-center transition-all lv-premium-shade ${
          selected
            ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/40'
        }`}
      >
        <div className="flex items-center gap-1.5">{icons}</div>
        <span className="text-xs font-medium text-foreground leading-tight">{title}</span>
      </button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="ww-guest-list-dialog ww-rsvp-activation-dialog max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-lg mt-8 text-left">
            <Mail className="w-5 h-5 text-primary" />
            Activate Smart RSVP & Messaging
          </DialogTitle>
          <p className="text-xs text-muted-foreground text-center px-4 pt-1">
            Fully managed RSVP invitations, messaging, tracking and delivery history.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Delivery method selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Choose your delivery method:</p>
            <p className="font-medium text-primary text-center mt-2 mb-3">
              Choose Email and SMS together for one low price
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <MethodCard
                value="email"
                title="Email Invitations"
                icons={<Mail className="w-5 h-5 text-blue-500" />}
              />
              <MethodCard
                value="sms"
                title="SMS Invitations"
                icons={<MessageSquare className="w-5 h-5 text-green-500" />}
              />
              <MethodCard
                value="both"
                title="Email + SMS"
                icons={
                  <>
                    <Mail className="w-5 h-5 text-blue-500" />
                    <MessageSquare className="w-5 h-5 text-green-500" />
                  </>
                }
              />
            </div>
            {attempted && !method && (
              <p className="text-xs text-destructive">Please select at least one invitation method.</p>
            )}
          </div>

          {/* What you get */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">RSVP Invite Bundle includes:</p>
            <ul className="space-y-1.5">
              {BUNDLE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing */}
          <div className="border-2 border-primary rounded-lg p-4 space-y-1 text-center">
            <p className="text-sm text-muted-foreground">
              Based on your guest list ({pricing.label})
            </p>
            <p className="text-3xl font-bold text-primary">${pricing.price} AUD</p>
            <p className="text-xs text-foreground font-medium">One-time activation per event</p>
            <p className="text-xs text-muted-foreground">
              Includes 400 SMS credits + unlimited email invitations.
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center px-2">
            SMS credits are only consumed when sending SMS invitations.
            Additional SMS credits can be purchased anytime.
          </p>
        </div>

        <DialogFooter className="gap-2 pb-6">
          <Button
            onClick={onClose}
            className="rounded-full bg-red-500 hover:bg-red-600 text-white lv-premium-shade"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayNow}
            disabled={!canPay}
            aria-busy={loading}
            className="rounded-full bg-green-500 hover:bg-green-600 text-white lv-premium-shade disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4 mr-2" />
            )}
            Pay Now — ${pricing.price} AUD
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
