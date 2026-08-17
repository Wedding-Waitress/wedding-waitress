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
  rsvp_date: string | null;
}

type IntelTag =
  | 'fast_responder'
  | 'needs_followup'
  | 'multiple_resends'
  | 'delivery_issue'
  | 'vip_pending'
  | null;

type UrgencyFilter = 'all' | 'no_response_7d' | 'failed_delivery' | 'needs_attention' | 'recent_response';

const humanizeDuration = (ms: number): string => {
  if (!isFinite(ms) || ms <= 0) return '—';
  const hours = ms / 3_600_000;
  if (hours < 1) {
    const m = Math.max(1, Math.round(ms / 60_000));
    return `${m} Min Avg. Response`;
  }
  if (hours < 48) return `${Math.round(hours)} Hours Avg. Response`;
  const days = hours / 24;
  return `${days.toFixed(1)} Days Avg. Response`;
};

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
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');
  const { credits: smsCredits } = useSmsCredits(eventId);

  useEffect(() => {
    if (!open || !eventId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [g, s, e, p] = await Promise.all([
          supabase.from('guests')
            .select('id, first_name, last_name, email, mobile, rsvp, rsvp_invite_status, rsvp_invite_sent_at, rsvp_date')
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
      const credits = sms.filter(l => ['sent','delivered'].includes((l.status || '').toLowerCase())).length;
      const responded = (() => {
        const r = normalizeRsvp(g.rsvp);
        return r === 'Attending' || r === 'Not Attending';
      })();
      const sendsCount = sms.length + emails.length;
      const isResend = sendsCount > 1;
      const respondedAt = g.rsvp_date ? new Date(g.rsvp_date).getTime() : null;
      const sentAtIso = g.rsvp_invite_sent_at || lastSms?.created_at || null;
      const sentAtMs = sentAtIso ? new Date(sentAtIso).getTime() : null;
      const responseMs = responded && respondedAt && sentAtMs && respondedAt >= sentAtMs
        ? respondedAt - sentAtMs
        : null;
      const daysSinceSent = sentAtMs ? (Date.now() - sentAtMs) / 86_400_000 : null;

      let intel: IntelTag = null;
      if (deliveryStatus === 'Failed' || deliveryStatus === 'Blocked') intel = 'delivery_issue';
      else if (responded && responseMs !== null && responseMs <= 24 * 3_600_000) intel = 'fast_responder';
      else if (!responded && sendsCount >= 2) intel = 'multiple_resends';
      else if (!responded && daysSinceSent !== null && daysSinceSent >= 7) intel = 'needs_followup';

      return {
        id: g.id,
        name: `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim(),
        contact: method === 'sms' ? (g.mobile || '—') : method === 'email' ? (g.email || '—') : (g.email || g.mobile || '—'),
        method,
        sentAt: sentAtIso,
        sentAtMs,
        deliveredAt: lastSms?.delivered_at || null,
        lastStatusAt: lastSms?.last_status_at || lastSms?.delivered_at || lastSms?.failed_at || null,
        deliveryStatus,
        rsvp: normalizeRsvp(g.rsvp),
        responded,
        respondedAt,
        responseMs,
        isResend,
        failed: isFailedStatus,
        resendCount: sendsCount,
        credits,
        inviteStatus: g.rsvp_invite_status,
        rsvpRaw: g.rsvp,
        twilioErrorCode: lastSms?.twilio_error_code || null,
        twilioErrorMessage: lastSms?.twilio_error_message || lastSms?.error_message || null,
        intel,
      };
    });
  }, [guests, smsLogs, emailLogs, purchaseMethod]);

  // Intelligence KPI calculations
  const intelligence = useMemo(() => {
    const invited = rows.filter(r => r.sentAt).length;
    const deliveredCount = rows.filter(r => r.deliveryStatus === 'Delivered').length;
    const failedCount = rows.filter(r => r.deliveryStatus === 'Failed' || r.deliveryStatus === 'Blocked').length;
    const deliveryDenom = deliveredCount + failedCount;
    const deliveryRate = deliveryDenom > 0 ? Math.round((deliveredCount / deliveryDenom) * 100) : null;
    const respondedCount = rows.filter(r => r.responded).length;
    const responseRate = invited > 0 ? Math.round((respondedCount / invited) * 100) : null;

    const responseTimes = rows.map(r => r.responseMs).filter((v): v is number => v !== null && v > 0);
    const avgResponseMs = responseTimes.length >= 2
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

    // Best method: highest response rate among methods with >=3 invitations
    const methodGroups: Array<'email' | 'sms' | 'both'> = ['email', 'sms', 'both'];
    const methodPerf = methodGroups.map(m => {
      const inGroup = rows.filter(r => r.method === m && r.sentAt);
      const respGroup = inGroup.filter(r => r.responded).length;
      return { method: m, total: inGroup.length, rate: inGroup.length > 0 ? respGroup / inGroup.length : 0 };
    }).filter(g => g.total >= 3).sort((a, b) => b.rate - a.rate);
    const bestMethod = methodPerf[0] ?? null;

    const resendAttempts = rows.filter(r => r.isResend).length;
    const resendResponded = rows.filter(r => r.isResend && r.responded).length;
    const resendSuccessRate = resendAttempts > 0 ? Math.round((resendResponded / resendAttempts) * 100) : null;

    return { deliveryRate, responseRate, avgResponseMs, bestMethod, resendSuccessRate, invited, respondedCount, deliveredCount, failedCount, resendAttempts };
  }, [rows]);

  const insights = useMemo(() => {
    const arr: string[] = [];
    if (intelligence.bestMethod) {
      const label = intelligence.bestMethod.method === 'both' ? 'Email + SMS' : intelligence.bestMethod.method === 'sms' ? 'SMS' : 'Email';
      arr.push(`${label} invitations are generating the strongest response performance.`);
    }
    const followups = rows.filter(r => r.intel === 'needs_followup' || r.intel === 'multiple_resends').length;
    if (followups > 0) arr.push(`${followups} guest${followups === 1 ? '' : 's'} still require follow-up.`);
    if (intelligence.deliveryRate !== null && intelligence.deliveryRate >= 95) arr.push('SMS and email delivery performance is excellent.');
    if (intelligence.avgResponseMs !== null && intelligence.avgResponseMs <= 48 * 3_600_000) arr.push('Most guests respond within 48 hours.');
    if (intelligence.resendSuccessRate !== null && intelligence.resendSuccessRate >= 40) arr.push('Resend campaigns are converting well.');
    return arr;
  }, [intelligence, rows]);

  const [insightIdx, setInsightIdx] = useState(0);
  useEffect(() => {
    if (insights.length <= 1) return;
    const t = setInterval(() => setInsightIdx(i => (i + 1) % insights.length), 6000);
    return () => clearInterval(t);
  }, [insights.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    let out = rows.filter(r => {
      if (q && !(r.name.toLowerCase().includes(q) || r.contact.toLowerCase().includes(q))) return false;
      if (methodFilter !== 'all' && r.method !== methodFilter) return false;
      if (urgencyFilter === 'no_response_7d') {
        if (r.responded || !r.sentAtMs || (now - r.sentAtMs) < 7 * 86_400_000) return false;
      } else if (urgencyFilter === 'failed_delivery') {
        if (r.deliveryStatus !== 'Failed' && r.deliveryStatus !== 'Blocked') return false;
      } else if (urgencyFilter === 'needs_attention') {
        if (!(r.intel === 'needs_followup' || r.intel === 'multiple_resends' || r.intel === 'delivery_issue')) return false;
      } else if (urgencyFilter === 'recent_response') {
        if (!r.responded || !r.respondedAt || (now - r.respondedAt) > 7 * 86_400_000) return false;
      }
      return true;
    });
    if (sortKey === 'name') out = out.sort((a,b) => a.name.localeCompare(b.name));
    else if (sortKey === 'sent') out = out.sort((a,b) => +new Date(b.sentAt || 0) - +new Date(a.sentAt || 0));
    else if (sortKey === 'status') out = out.sort((a,b) => a.deliveryStatus.localeCompare(b.deliveryStatus));
    return out;
  }, [rows, search, methodFilter, sortKey, urgencyFilter]);

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
      <SheetContent side="right" className="ww-guest-analytics-drawer w-full sm:max-w-3xl overflow-y-auto">
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

          {/* Smart RSVP Intelligence KPI row */}
          {(() => {
            const intelChip = (label: string, value: React.ReactNode, sub?: string, tooltip?: string, tone = 'border-border bg-card') => (
              <div className={`flex-1 min-w-[140px] rounded-xl border px-3 py-2 ${tone}`} title={tooltip}>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="text-sm font-semibold text-foreground">{value}</div>
                {sub && <div className="text-[10px] text-muted-foreground/80 mt-0.5">{sub}</div>}
              </div>
            );
            const bestLabel = intelligence.bestMethod
              ? (intelligence.bestMethod.method === 'both' ? 'Email + SMS' : intelligence.bestMethod.method === 'sms' ? 'SMS' : 'Email')
              : 'Not enough data';
            return (
              <div className="flex flex-wrap gap-2">
                {intelChip('Delivery Rate', intelligence.deliveryRate === null ? '—' : `${intelligence.deliveryRate}%`, undefined, 'Percentage of invitations successfully delivered.', 'border-emerald-200/70 bg-emerald-50/40')}
                {intelChip('Response Rate', intelligence.responseRate === null ? '—' : `${intelligence.responseRate}%`, undefined, 'Percentage of invited guests who submitted an RSVP.', 'border-primary/30 bg-primary/5')}
                {intelChip('Avg. Response', intelligence.avgResponseMs === null ? 'Not enough responses yet' : humanizeDuration(intelligence.avgResponseMs), undefined, 'Average time between invitation sent and RSVP received.')}
                {intelChip('Best Method', bestLabel, intelligence.bestMethod ? 'Highest response performance.' : undefined, 'Delivery method with the strongest RSVP response rate.')}
                {intelChip('Resend Success', intelligence.resendSuccessRate === null ? '—' : `${intelligence.resendSuccessRate}%`, undefined, 'Guests who responded after receiving a resend.', 'border-amber-200/70 bg-amber-50/40')}
              </div>
            );
          })()}

          {insights.length > 0 && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground/80 italic">
              {insights[insightIdx % insights.length]}
            </div>
          )}

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
              <SelectContent className="ww-guest-list-menu">
                <SelectItem value="all">All methods</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="both">Email + SMS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="ww-guest-list-menu">
                <SelectItem value="name">Sort: Name</SelectItem>
                <SelectItem value="sent">Sort: Sent date</SelectItem>
                <SelectItem value="status">Sort: Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Urgency / segmentation chips */}
          {(() => {
            const opts: Array<{ key: UrgencyFilter; label: string }> = [
              { key: 'all', label: 'All guests' },
              { key: 'no_response_7d', label: 'No Response > 7 days' },
              { key: 'failed_delivery', label: 'Failed Delivery' },
              { key: 'needs_attention', label: 'Needs Attention' },
              { key: 'recent_response', label: 'Recently Responded' },
            ];
            return (
              <div className="flex flex-wrap gap-1.5">
                {opts.map(o => {
                  const active = urgencyFilter === o.key;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => setUrgencyFilter(o.key)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            );
          })()}

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
                      <td className="px-3 py-2 font-medium text-foreground">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{r.name || '—'}</span>
                          {r.intel && (() => {
                            const map: Record<Exclude<IntelTag, null>, { label: string; cls: string }> = {
                              fast_responder: { label: 'Fast Responder', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                              needs_followup: { label: 'Needs Follow-Up', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
                              multiple_resends: { label: 'Multiple Resends', cls: 'border-orange-200 bg-orange-50 text-orange-700' },
                              delivery_issue: { label: 'Delivery Issue', cls: 'border-red-200 bg-red-50 text-red-700' },
                              vip_pending: { label: 'VIP Pending', cls: 'border-primary/30 bg-primary/5 text-primary' },
                            };
                            const t = map[r.intel];
                            return <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${t.cls}`}>{t.label}</span>;
                          })()}
                        </div>
                      </td>
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
