import { useMemo, useState } from 'react';
import {
  History, Activity, AlertTriangle, Flame, Clock, CheckCircle2,
  Mail, MessageSquare, Eye, MousePointerClick, Reply, Bell, RotateCcw,
  UserPlus, FileText, XCircle, Ban, ChevronRight,
} from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import EmptyHint from '../EmptyHint';
import { GuestActivityTimeline } from '@/components/Dashboard/GuestActivityTimeline';
import { useEventGuestActivities } from '@/hooks/useEventGuestActivities';
import type { Guest } from '@/hooks/useGuests';
import type { GuestActivity, GuestActivityType } from '@/hooks/useGuestActivities';

interface Props {
  guests: Guest[];
  eventId?: string | null;
}

const FAILURE_TYPES = new Set<GuestActivityType>(['bounced', 'failed']);
const REMINDER_TYPES = new Set<GuestActivityType>(['reminder_sent']);
const RSVP_TYPES = new Set<GuestActivityType>(['rsvp_changed', 'responded']);
const OPEN_TYPES = new Set<GuestActivityType>(['opened', 'clicked']);

const TYPE_LABEL: Record<GuestActivityType, string> = {
  invited_email: 'invited by email',
  invited_sms: 'invited by SMS',
  delivered: 'invitation delivered',
  opened: 'opened invitation',
  clicked: 'clicked link',
  responded: 'responded',
  resent: 'invitation resent',
  reminder_sent: 'reminder sent',
  rsvp_changed: 'updated RSVP',
  plus_one_added: 'added a plus-one',
  note_added: 'note added',
  bounced: 'invitation bounced',
  failed: 'delivery failed',
  unsubscribed: 'unsubscribed',
};

const TYPE_ICON: Record<GuestActivityType, React.ComponentType<{ className?: string }>> = {
  invited_email: Mail, invited_sms: MessageSquare, delivered: CheckCircle2,
  opened: Eye, clicked: MousePointerClick, responded: Reply, resent: RotateCcw,
  reminder_sent: Bell, rsvp_changed: FileText, plus_one_added: UserPlus,
  note_added: FileText, bounced: AlertTriangle, failed: XCircle, unsubscribed: Ban,
};

const formatWhen = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const Stat = ({ label, value, tone = 'neutral' }: { label: string; value: number | string; tone?: 'neutral' | 'good' | 'warn' }) => {
  const color = tone === 'good' ? 'text-[#2F6B2F]' : tone === 'warn' ? 'text-[#8A5A14]' : 'text-[#1D1D1F]';
  return (
    <div className="rounded-lg bg-white border border-[#ECE5D8] px-2.5 py-2 text-center">
      <div className="text-[10px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">{label}</div>
      <div className={`text-[14px] font-semibold mt-0.5 tabular-nums ${color}`}>{value}</div>
    </div>
  );
};

const SectionLabel = ({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) => (
  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.04em] text-[#6E6E73] font-semibold mt-4 mb-2">
    <Icon className="w-3.5 h-3.5 text-[#967A59]" />
    {children}
  </div>
);

export const ActivityTimelineAccessSection = ({ guests, eventId }: Props) => {
  const [guestId, setGuestId] = useState<string>('');
  const { activities, loading } = useEventGuestActivities(eventId, { limit: 500 });

  const guestNameById = useMemo(() => {
    const m = new Map<string, string>();
    guests.forEach(g => m.set(g.id, `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() || 'Guest'));
    return m;
  }, [guests]);

  const sortedGuests = useMemo(
    () => [...guests].sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    ),
    [guests]
  );

  const insights = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const within = (iso: string, hrs: number) => now - new Date(iso).getTime() <= hrs * 3600 * 1000;

    const today = activities.filter(a => within(a.occurred_at, 24));
    const last7d = activities.filter(a => now - new Date(a.occurred_at).getTime() <= 7 * dayMs);

    const rsvpToday = today.filter(a => RSVP_TYPES.has(a.activity_type)).length;
    const remindersRecent = last7d.filter(a => REMINDER_TYPES.has(a.activity_type)).length;
    const opensToday = today.filter(a => OPEN_TYPES.has(a.activity_type)).length;
    const failures = activities.filter(a => FAILURE_TYPES.has(a.activity_type) || a.status === 'failure');

    const recent = activities.slice(0, 6);

    // Per-guest aggregates
    type Agg = { total: number; opens: number; rsvpChanges: number; failures: number; lastAt: string };
    const perGuest = new Map<string, Agg>();
    activities.forEach(a => {
      if (!a.guest_id) return;
      const cur = perGuest.get(a.guest_id) ?? { total: 0, opens: 0, rsvpChanges: 0, failures: 0, lastAt: a.occurred_at };
      cur.total += 1;
      if (OPEN_TYPES.has(a.activity_type)) cur.opens += 1;
      if (a.activity_type === 'rsvp_changed') cur.rsvpChanges += 1;
      if (FAILURE_TYPES.has(a.activity_type) || a.status === 'failure') cur.failures += 1;
      if (new Date(a.occurred_at) > new Date(cur.lastAt)) cur.lastAt = a.occurred_at;
      perGuest.set(a.guest_id, cur);
    });

    const attentionGuests = [...perGuest.entries()]
      .filter(([, v]) => v.failures > 0 || v.rsvpChanges >= 3)
      .sort((a, b) => (b[1].failures - a[1].failures) || (b[1].rsvpChanges - a[1].rsvpChanges))
      .slice(0, 5);

    const hotspotGuests = [...perGuest.entries()]
      .filter(([, v]) => v.total >= 5 || v.opens >= 3 || v.rsvpChanges >= 2)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);

    const totalTracked = activities.length;
    const failureRate = totalTracked > 0 ? (failures.length / totalTracked) * 100 : 0;

    return {
      todayCount: today.length,
      rsvpToday,
      remindersRecent,
      opensToday,
      failuresCount: failures.length,
      recent,
      attentionGuests,
      hotspotGuests,
      totalTracked,
      failureRate,
    };
  }, [activities]);

  const noTracking = !loading && activities.length === 0;

  return (
    <IntelligenceSection
      value="activity"
      title="Guest Activity Timeline Access"
      description="Lightweight summary + per-guest drill-down"
      icon={<History className="w-4 h-4" />}
      badge={insights.todayCount > 0 ? `${insights.todayCount} today` : undefined}
    >
      {noTracking ? (
        <EmptyHint>
          No activity tracked yet. Once invitations are sent or guests respond, summaries will appear here.
        </EmptyHint>
      ) : (
        <>
          {/* Recent Guest Activity */}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Today" value={insights.todayCount} />
            <Stat label="RSVP Changes" value={insights.rsvpToday} tone={insights.rsvpToday > 0 ? 'good' : 'neutral'} />
            <Stat label="Reminders 7d" value={insights.remindersRecent} />
          </div>

          {/* Most Recent Timeline Events */}
          {insights.recent.length > 0 && (
            <>
              <SectionLabel icon={Activity}>Most Recent</SectionLabel>
              <ul className="space-y-1.5">
                {insights.recent.map(a => {
                  const Icon = TYPE_ICON[a.activity_type] ?? Clock;
                  const name = a.guest_id ? guestNameById.get(a.guest_id) ?? 'Guest' : 'Guest';
                  const failed = a.status === 'failure' || FAILURE_TYPES.has(a.activity_type);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-[#FBF8F2]/60 border border-[#ECE5D8]"
                    >
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${failed ? 'bg-red-50 text-red-600' : 'bg-white text-[#967A59]'} border border-[#ECE5D8]`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[#1D1D1F] truncate">
                          <span className="font-medium">{name}</span>{' '}
                          <span className="text-[#6E6E73]">{TYPE_LABEL[a.activity_type] ?? a.activity_type}</span>
                        </p>
                      </div>
                      <span className="text-[10.5px] text-[#6E6E73] tabular-nums shrink-0">
                        {formatWhen(a.occurred_at)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* Guests Requiring Attention */}
          {insights.attentionGuests.length > 0 && (
            <>
              <SectionLabel icon={AlertTriangle}>Requiring Attention</SectionLabel>
              <ul className="space-y-1.5">
                {insights.attentionGuests.map(([gid, v]) => (
                  <li
                    key={gid}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[#FBF4E8]/60 border border-[#EDDDC0]"
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-[#1D1D1F] truncate">
                        {guestNameById.get(gid) ?? 'Guest'}
                      </p>
                      <p className="text-[10.5px] text-[#8A5A14]">
                        {v.failures > 0 && `${v.failures} delivery issue${v.failures > 1 ? 's' : ''}`}
                        {v.failures > 0 && v.rsvpChanges >= 3 && ' · '}
                        {v.rsvpChanges >= 3 && `${v.rsvpChanges} RSVP changes`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGuestId(gid)}
                      className="text-[11px] text-[#967A59] font-medium hover:underline shrink-0 flex items-center gap-0.5"
                    >
                      Open <ChevronRight className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Activity Hotspots */}
          {insights.hotspotGuests.length > 0 && (
            <>
              <SectionLabel icon={Flame}>Activity Hotspots</SectionLabel>
              <ul className="space-y-1.5">
                {insights.hotspotGuests.map(([gid, v]) => (
                  <li
                    key={gid}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white border border-[#ECE5D8]"
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-[#1D1D1F] truncate">
                        {guestNameById.get(gid) ?? 'Guest'}
                      </p>
                      <p className="text-[10.5px] text-[#6E6E73]">
                        {v.total} interaction{v.total !== 1 ? 's' : ''}
                        {v.opens > 0 && ` · ${v.opens} open${v.opens > 1 ? 's' : ''}`}
                        {v.rsvpChanges > 0 && ` · ${v.rsvpChanges} RSVP edit${v.rsvpChanges > 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGuestId(gid)}
                      className="text-[11px] text-[#967A59] font-medium hover:underline shrink-0 flex items-center gap-0.5"
                    >
                      Open <ChevronRight className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Activity Health Summary */}
          <SectionLabel icon={CheckCircle2}>Activity Health</SectionLabel>
          <div className="rounded-lg border border-[#ECE5D8] bg-white px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] text-[#1D1D1F]">
                {insights.failureRate < 2
                  ? 'Delivery activity healthy'
                  : insights.failureRate < 8
                  ? 'Minor delivery issues detected'
                  : 'Elevated delivery failures'}
              </span>
              <span className={`text-[11px] font-semibold tabular-nums ${insights.failureRate < 2 ? 'text-[#2F6B2F]' : insights.failureRate < 8 ? 'text-[#8A5A14]' : 'text-red-600'}`}>
                {insights.failuresCount} issue{insights.failuresCount !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-[10.5px] text-[#6E6E73] mt-1">
              {insights.totalTracked} total interaction{insights.totalTracked !== 1 ? 's' : ''} tracked.
            </p>
          </div>
        </>
      )}

      {/* Timeline Drill-Down Access */}
      <SectionLabel icon={History}>Timeline Drill-Down</SectionLabel>
      {guests.length === 0 ? (
        <EmptyHint>Add guests first to view activity timelines.</EmptyHint>
      ) : (
        <>
          <select
            value={guestId}
            onChange={e => setGuestId(e.target.value)}
            className="w-full h-10 rounded-lg border border-[#ECE5D8] bg-white px-3 text-[13px] text-[#1D1D1F] mb-3 focus:outline-none focus:ring-2 focus:ring-[#967A59]/20 focus:border-[#967A59]/40 transition"
          >
            <option value="">Select a guest to view full timeline…</option>
            {sortedGuests.map(g => (
              <option key={g.id} value={g.id}>
                {g.first_name} {g.last_name}
              </option>
            ))}
          </select>
          {guestId ? (
            <GuestActivityTimeline guestId={guestId} defaultOpen />
          ) : (
            <p className="text-[11px] text-[#6E6E73] leading-relaxed">
              Open a per-guest CRM-style timeline to see invites, opens, reminders and RSVP updates in chronological order.
            </p>
          )}
        </>
      )}
    </IntelligenceSection>
  );
};

export default ActivityTimelineAccessSection;
