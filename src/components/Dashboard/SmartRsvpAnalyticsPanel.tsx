/**
 * SmartRsvpAnalyticsPanel
 *
 * Premium slide-over surfacing the full Smart RSVP & Messaging analytics
 * for an event: KPI summary at top, then a per-guest delivery table with
 * search, method filter and sort.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryAnalyticsPanel } from './DeliveryAnalyticsPanel';
import { GuestDeliveryBadges } from './GuestDeliveryBadges';
import { SmartSmsCreditStatus, getCreditHealth } from './SmartSmsCreditStatus';
import { useSmsCredits } from '@/hooks/useSmsCredits';
import { normalizeRsvp } from '@/lib/rsvp';
import { Search } from 'lucide-react';

interface Props {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GuestRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  mobile: string | null;
  rsvp: string | null;
  rsvp_invite_status: string | null;
  rsvp_invite_sent_at: string | null;
}

interface SmsLog {
  guest_id: string | null;
  status: string;
  delivery_method: string | null;
  created_at: string;
  delivered_at: string | null;
  failed_at: string | null;
  last_status_at: string | null;
  error_message: string | null;
  twilio_error_code: string | null;
  twilio_error_message: string | null;
}

interface EmailLog {
  guest_id: string;
  status: string;
  sent_at: string;
}

type MethodFilter = 'all' | 'email' | 'sms' | 'both';
type SortKey = 'name' | 'sent' | 'status';

export const SmartRsvpAnalyticsPanel: React.FC<Props> = ({ eventId, open, onOpenChange }) => {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [purchaseMethod, setPurchaseMethod] = useState<'email' | 'sms' | 'both' | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const { credits: smsCredits } = useSmsCredits(eventId);

  useEffect(() => {
    if (!open || !eventId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [g, s, e, p] = await Promise.all([
          supabase.from('guests')
            .select('id, first_name, last_name, email, mobile, rsvp, rsvp_invite_status, rsvp_invite_sent_at')
            .eq('event_id', eventId),
          supabase.from('sms_send_logs')
            .select('guest_id, status, delivery_method, created_at, delivered_at, failed_at, last_status_at, error_message, twilio_error_code, twilio_error_message')
            .eq('event_id', eventId),
          supabase.from('rsvp_invite_logs')
            .select('guest_id, status, sent_at')
            .eq('event_id', eventId).eq('channel', 'email'),
          supabase.from('rsvp_invite_purchases')
            .select('delivery_method').eq('event_id', eventId).eq('status', 'completed')
            .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (cancelled) return;
        setGuests((g.data ?? []) as GuestRow[]);
        setSmsLogs((s.data ?? []) as SmsLog[]);
        setEmailLogs((e.data ?? []) as EmailLog[]);
        const dm = (p.data as any)?.delivery_method;
        setPurchaseMethod(dm === 'email' || dm === 'sms' || dm === 'both' ? dm : null);
      } catch (err) {
        console.error('[SmartRsvpAnalyticsPanel] load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, eventId]);

  const rows = useMemo(() => {
    const smsByGuest = new Map<string, SmsLog[]>();
    smsLogs.forEach(l => {
      if (!l.guest_id) return;
      const arr = smsByGuest.get(l.guest_id) ?? [];
      arr.push(l);
      smsByGuest.set(l.guest_id, arr);
    });
    const emailByGuest = new Map<string, EmailLog[]>();
    emailLogs.forEach(l => {
      const arr = emailByGuest.get(l.guest_id) ?? [];
      arr.push(l);
      emailByGuest.set(l.guest_id, arr);
    });

    return guests.map(g => {
      const sms = smsByGuest.get(g.id) ?? [];
      const emails = emailByGuest.get(g.id) ?? [];
      const status = (g.rsvp_invite_status || '').toLowerCase();
      const method: 'email' | 'sms' | 'both' | null =
        status === 'both_sent' ? 'both'
        : status === 'sms_sent' ? 'sms'
        : status === 'email_sent' || status === 'mail_sent' ? 'email'
        : purchaseMethod;
      const lastSms = sms.sort((a,b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
      const lastStatus = (lastSms?.status || '').toLowerCase();
      const isFailedStatus = lastStatus === 'failed' || lastStatus === 'undelivered' || lastStatus === 'blocked';
      const isDelivered = lastStatus === 'delivered';
      const isPendingSent = lastStatus === 'queued' || lastStatus === 'sent';
      let deliveryStatus: 'Delivered' | 'Failed' | 'Blocked' | 'Pending' = 'Pending';
      if (lastSms) {
        if (isDelivered) deliveryStatus = 'Delivered';
        else if (lastStatus === 'blocked') deliveryStatus = 'Blocked';
        else if (isFailedStatus) deliveryStatus = 'Failed';
        else if (isPendingSent) deliveryStatus = 'Pending';
      } else if (status && status !== 'not_sent') {
        // fallback for email-only or pre-webhook history
        deliveryStatus = 'Delivered';
      }
      const resendCount = sms.length + emails.length;
      const credits = sms.filter(l => ['sent','delivered'].includes((l.status || '').toLowerCase())).length;
      const responded = (() => {
        const r = normalizeRsvp(g.rsvp);
        return r === 'Attending' || r === 'Not Attending';
      })();
      return {
        id: g.id,
        name: `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim(),
        contact: method === 'sms' ? (g.mobile || '—') : method === 'email' ? (g.email || '—') : (g.email || g.mobile || '—'),
        method,
        sentAt: g.rsvp_invite_sent_at || lastSms?.created_at || null,
        deliveredAt: lastSms?.delivered_at || null,
        lastStatusAt: lastSms?.last_status_at || lastSms?.delivered_at || lastSms?.failed_at || null,
        deliveryStatus,
        rsvp: normalizeRsvp(g.rsvp),
        responded,
        failed: isFailedStatus,
        resendCount,
        credits,
        inviteStatus: g.rsvp_invite_status,
        rsvpRaw: g.rsvp,
        twilioErrorCode: lastSms?.twilio_error_code || null,
        twilioErrorMessage: lastSms?.twilio_error_message || lastSms?.error_message || null,
      };
    });
  }, [guests, smsLogs, emailLogs, purchaseMethod]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter(r => {
      if (q && !(r.name.toLowerCase().includes(q) || r.contact.toLowerCase().includes(q))) return false;
      if (methodFilter !== 'all' && r.method !== methodFilter) return false;
      return true;
    });
    if (sortKey === 'name') out = out.sort((a,b) => a.name.localeCompare(b.name));
    else if (sortKey === 'sent') out = out.sort((a,b) => +new Date(b.sentAt || 0) - +new Date(a.sentAt || 0));
    else if (sortKey === 'status') out = out.sort((a,b) => a.deliveryStatus.localeCompare(b.deliveryStatus));
    return out;
  }, [rows, search, methodFilter, sortKey]);

  const fmt = (d: string | null) => d ? new Date(d).toLocaleString() : '—';
  const relTime = (d: string | null) => {
    if (!d) return '';
    const ms = Date.now() - new Date(d).getTime();
    if (ms < 60_000) return 'just now';
    const m = Math.floor(ms / 60_000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    return `${days}d ago`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Smart RSVP Analytics</SheetTitle>
          <SheetDescription>
            Smart RSVP delivery history and per-guest tracking for this event.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <SmartSmsCreditStatus eventId={eventId} variant="compact" />

          {(() => {
            const delivered = rows.filter(r => r.deliveryStatus === 'Delivered').length;
            const failed = rows.filter(r => r.deliveryStatus === 'Failed' || r.deliveryStatus === 'Blocked').length;
            const total = delivered + failed;
            const successPct = total > 0 ? Math.round((delivered / total) * 100) : null;
            const chip = (label: string, value: React.ReactNode, tone: string) => (
              <div className={`flex-1 min-w-[110px] rounded-xl border px-3 py-2 ${tone}`}>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="text-sm font-semibold text-foreground">{value}</div>
              </div>
            );
            return (
              <div className="flex flex-wrap gap-2">
                {chip('Credits Remaining', smsCredits.remaining, 'border-emerald-200 bg-emerald-50/40')}
                {chip('Credits Used', smsCredits.used, 'border-border bg-muted/40')}
                {chip('SMS Delivered', delivered, 'border-green-200 bg-green-50/40')}
                {chip('SMS Failed', failed, 'border-red-200 bg-red-50/40')}
                {chip('Delivery Success', successPct === null ? '—' : `${successPct}%`, 'border-primary/30 bg-primary/5')}
              </div>
            );
          })()}

          <DeliveryAnalyticsPanel eventId={eventId} />

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search guest or contact…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v as MethodFilter)}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="both">Email + SMS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort: Name</SelectItem>
                <SelectItem value="sent">Sort: Sent date</SelectItem>
                <SelectItem value="status">Sort: Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="max-h-[55vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 sticky top-0">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-semibold">Guest</th>
                    <th className="px-3 py-2 font-semibold">Method</th>
                    <th className="px-3 py-2 font-semibold">Contact</th>
                    <th className="px-3 py-2 font-semibold">Sent</th>
                    <th className="px-3 py-2 font-semibold">Delivery</th>
                    <th className="px-3 py-2 font-semibold">Response</th>
                    <th className="px-3 py-2 font-semibold text-right">Sends</th>
                    <th className="px-3 py-2 font-semibold text-right">Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No matching guests.</td></tr>
                  ) : filtered.map(r => (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="px-3 py-2 font-medium text-foreground">{r.name || '—'}</td>
                      <td className="px-3 py-2">
                        <GuestDeliveryBadges
                          inviteStatus={r.inviteStatus}
                          rsvp={r.rsvpRaw}
                          purchaseDeliveryMethod={purchaseMethod}
                          lowCredits={getCreditHealth(smsCredits.remaining, smsCredits.total).state === 'critical' || smsCredits.remaining === 0}
                          className="ml-0"
                        />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[160px]">{r.contact}</td>
                      <td className="px-3 py-2 text-muted-foreground">{fmt(r.sentAt)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            r.deliveryStatus === 'Failed' || r.deliveryStatus === 'Blocked' ? 'text-red-600 font-semibold'
                            : r.deliveryStatus === 'Delivered' ? 'text-green-700 font-semibold'
                            : 'text-amber-700 font-semibold'
                          }
                          title={
                            (r.deliveryStatus === 'Failed' || r.deliveryStatus === 'Blocked') && (r.twilioErrorCode || r.twilioErrorMessage)
                              ? `Twilio ${r.twilioErrorCode ?? ''}${r.twilioErrorCode && r.twilioErrorMessage ? ': ' : ''}${r.twilioErrorMessage ?? ''}`.trim()
                              : r.lastStatusAt ? `Updated ${fmt(r.lastStatusAt)}` : undefined
                          }
                        >
                          {r.deliveryStatus}
                        </span>
                        {r.lastStatusAt && (
                          <div className="text-[10px] text-muted-foreground">{relTime(r.lastStatusAt)}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">{r.responded ? r.rsvp : 'Pending'}</td>
                      <td className="px-3 py-2 text-right">{r.resendCount}</td>
                      <td className="px-3 py-2 text-right">{r.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
