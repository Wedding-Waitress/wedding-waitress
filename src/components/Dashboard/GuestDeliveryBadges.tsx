/**
 * GuestDeliveryBadges
 *
 * Ultra-compact trailing pills rendered inside the existing RSVP Status cell
 * on desktop AND inside the mobile/tablet card status row.
 *
 * Renders, in priority order:
 *   1. Delivery method (Email / SMS / Email + SMS)
 *   2. Delivery status (Delivered / Pending / Failed)
 *   3. Responded (when guest has answered)
 *
 * Strict constraints:
 * - Single-line by default (`whitespace-nowrap`) — never breaks table row height
 * - Tiny size: `text-[10px] leading-none px-1.5 py-0.5`
 * - No new column / no colgroup change
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { normalizeRsvp } from '@/lib/rsvp';

type DeliveryMethod = 'email' | 'sms' | 'both' | null;

interface Props {
  inviteStatus?: string | null;            // guest.rsvp_invite_status
  rsvp?: string | null;                    // guest.rsvp
  purchaseDeliveryMethod?: DeliveryMethod; // fallback from rsvp_invite_purchases
  /** When true, render a tiny inline "Low Credits" pill (remaining ≤ 24). */
  lowCredits?: boolean;
  className?: string;
}

const PILL = 'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-semibold whitespace-nowrap';

const styles = {
  email:     'bg-blue-50 text-blue-700 border-blue-200',
  sms:       'bg-indigo-50 text-indigo-700 border-indigo-200',
  both:      'bg-slate-50 text-slate-700 border-slate-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  failed:    'bg-red-50 text-red-700 border-red-200',
  responded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lowCredits:'bg-red-50 text-red-700 border-red-200',
};

const deriveMethod = (status?: string | null, fallback?: DeliveryMethod): DeliveryMethod => {
  const s = (status || '').toLowerCase();
  if (s === 'both_sent') return 'both';
  if (s === 'email_sent' || s === 'mail_sent') return 'email';
  if (s === 'sms_sent') return 'sms';
  return fallback ?? null;
};

const deriveDelivery = (status?: string | null): 'delivered' | 'pending' | 'failed' | null => {
  const s = (status || '').toLowerCase();
  if (!s || s === 'not_sent' || s === 'pending') return null;
  if (s.includes('fail') || s === 'blocked') return 'failed';
  if (s.endsWith('_sent') || s === 'mail_sent') return 'delivered';
  return null;
};

export const GuestDeliveryBadges: React.FC<Props> = ({
  inviteStatus,
  rsvp,
  purchaseDeliveryMethod,
  lowCredits,
  className,
}) => {
  const method = deriveMethod(inviteStatus, purchaseDeliveryMethod);
  const delivery = deriveDelivery(inviteStatus);
  const responded = (() => {
    const r = normalizeRsvp(rsvp);
    return r === 'Attending' || r === 'Not Attending';
  })();
  const showLowCreditsPill = lowCredits && (method === 'sms' || method === 'both');

  if (!method && !delivery && !responded && !showLowCreditsPill) return null;

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1 ml-1.5 align-middle', className)}>
      {method && (
        <span className={cn(PILL, styles[method])} title={`Method: ${method === 'both' ? 'Email + SMS' : method.toUpperCase()}`}>
          {method === 'both' ? 'E+S' : method === 'email' ? 'Email' : 'SMS'}
        </span>
      )}
      {delivery && (
        <span className={cn(PILL, styles[delivery])} title={`Delivery: ${delivery}`}>
          {delivery === 'delivered' ? 'Delivered' : delivery === 'failed' ? 'Failed' : 'Pending'}
        </span>
      )}
      {responded && (
        <span className={cn(PILL, styles.responded)} title="Guest has responded">
          Responded
        </span>
      )}
      {showLowCreditsPill && (
        <span className={cn(PILL, styles.lowCredits)} title="Low SMS credits — top up to keep sending">
          Low Credits
        </span>
      )}
    </span>
  );
};
