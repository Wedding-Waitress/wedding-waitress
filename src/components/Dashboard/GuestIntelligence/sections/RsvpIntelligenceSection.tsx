import { useMemo } from 'react';
import { CheckCircle2, Clock, MailOpen, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import InsightCard from '../InsightCard';
import EmptyHint from '../EmptyHint';
import { computeRsvpInsights } from '../lib/computeGuestInsights';
import { useEventGuestActivities } from '@/hooks/useEventGuestActivities';
import { normalizeRsvp } from '@/lib/rsvp';
import type { Guest } from '@/hooks/useGuests';

interface Props {
  guests: Guest[];
  eventId?: string | null;
}

const HOURS_24 = 24 * 60 * 60 * 1000;

export const RsvpIntelligenceSection = ({ guests, eventId }: Props) => {
  const ins = useMemo(() => computeRsvpInsights(guests), [guests]);
  const ratePct = ins.total ? Math.round(ins.responseRate * 100) : 0;

  const { activities, loading } = useEventGuestActivities(eventId, { limit: 1000 });

  const intel = useMemo(() => {
    const guestById = new Map(guests.map(g => [g.id, g]));
    const opens = new Set<string>();
    const responses = new Set<string>();
    const changes = new Map<string, number>();
    const reminders = new Map<string, number>();
    let recentResponses = 0;
    const now = Date.now();

    for (const a of activities) {
      if (a.activity_type === 'opened') opens.add(a.guest_id);
      if (a.activity_type === 'responded') {
        responses.add(a.guest_id);
        if (now - new Date(a.occurred_at).getTime() <= HOURS_24) recentResponses++;
      }
      if (a.activity_type === 'rsvp_changed') {
        changes.set(a.guest_id, (changes.get(a.guest_id) ?? 0) + 1);
      }
      if (a.activity_type === 'reminder_sent') {
        reminders.set(a.guest_id, (reminders.get(a.guest_id) ?? 0) + 1);
      }
    }

    const pendingGuests = guests.filter(g => normalizeRsvp(g.rsvp) === 'Pending');
    const awaiting = pendingGuests.length;
    const openedNoRsvp = pendingGuests.filter(g => opens.has(g.id)).length;
    const rsvpChanges = Array.from(changes.values()).filter(c => c >= 1).length;

    // Follow-up = pending AND (no open OR ≥2 reminders)
    const highFollowUp = pendingGuests.filter(g => {
      const opened = opens.has(g.id);
      const remCount = reminders.get(g.id) ?? 0;
      return !opened || remCount >= 2;
    }).length;

    return {
      awaiting,
      openedNoRsvp,
      recentResponses,
      rsvpChanges,
      highFollowUp,
      hasActivityData: activities.length > 0,
    };
  }, [activities, guests]);

  if (ins.total === 0) {
    return (
      <IntelligenceSection
        value="rsvp"
        title="RSVP Intelligence"
        description="Smart RSVP behaviour signals"
        icon={<CheckCircle2 className="w-4 h-4" />}
      >
        <EmptyHint>Add guests to see RSVP intelligence here.</EmptyHint>
      </IntelligenceSection>
    );
  }

  return (
    <IntelligenceSection
      value="rsvp"
      title="RSVP Intelligence"
      description="Smart RSVP behaviour signals"
      icon={<CheckCircle2 className="w-4 h-4" />}
      badge={`${ratePct}%`}
      badgeTone={ins.pending > 0 ? 'warning' : 'neutral'}
    >
      {/* Progress */}
      <div className="rounded-xl border border-[#ECE5D8] bg-white px-3.5 py-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[12px] text-[#1D1D1F] font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[#967A59]" />
            RSVP Completion Progress
          </div>
          <div className="text-[13px] font-semibold text-[#1D1D1F] tabular-nums">{ratePct}%</div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[#F4EDE0] overflow-hidden">
          <div
            className="h-full bg-[#967A59] transition-[width] duration-500 ease-out"
            style={{ width: `${ratePct}%` }}
          />
        </div>
        <div className="text-[11px] text-[#6E6E73] mt-1.5">
          {ins.attending + ins.declined} of {ins.total} responded
        </div>
      </div>

      {/* Core counts */}
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <InsightCard label="Attending" value={ins.attending} tone="positive" />
        <InsightCard
          label="Awaiting RSVP"
          value={intel.awaiting}
          tone={intel.awaiting > 0 ? 'warning' : 'neutral'}
        />
        <InsightCard label="Declined" value={ins.declined} />
        <InsightCard
          label="Recently Responded"
          value={intel.recentResponses}
          hint="Last 24 hours"
          tone={intel.recentResponses > 0 ? 'info' : 'neutral'}
        />
      </div>

      {/* Behaviour signals */}
      {intel.hasActivityData ? (
        <div className="space-y-1.5">
          <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
            Behaviour signals
          </div>
          <SignalRow
            icon={<MailOpen className="w-3.5 h-3.5" />}
            label="Opened but no RSVP"
            value={intel.openedNoRsvp}
            tone={intel.openedNoRsvp > 0 ? 'warning' : 'neutral'}
          />
          <SignalRow
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            label="RSVP changes"
            value={intel.rsvpChanges}
            tone={intel.rsvpChanges > 0 ? 'info' : 'neutral'}
          />
          <SignalRow
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            label="High follow-up needed"
            value={intel.highFollowUp}
            hint={
              intel.highFollowUp > 0
                ? 'Pending + no open or 2+ reminders'
                : undefined
            }
            tone={intel.highFollowUp > 0 ? 'warning' : 'neutral'}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#ECE5D8] bg-[#FBF8F2]/60 px-3.5 py-3 text-[11.5px] text-[#6E6E73] leading-snug flex gap-2">
          <Clock className="w-3.5 h-3.5 text-[#967A59] shrink-0 mt-0.5" />
          <span>
            {loading
              ? 'Loading behaviour signals…'
              : 'Open, response and reminder signals will appear here once invites start tracking activity.'}
          </span>
        </div>
      )}
    </IntelligenceSection>
  );
};

const toneStyles = {
  neutral: 'bg-[#FBF8F2] border-[#ECE5D8] text-[#1D1D1F]',
  info: 'bg-[#FAF6EF] border-[#ECE5D8] text-[#1D1D1F]',
  warning: 'bg-[#FBF4E8] border-[#EDDDC0] text-[#8A5A14]',
};

const SignalRow = ({
  icon,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  tone?: keyof typeof toneStyles;
}) => (
  <div
    className={`flex items-center gap-2.5 border rounded-lg px-3 py-2 ${toneStyles[tone]}`}
  >
    <div className="text-[#967A59] shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="text-[12.5px] font-medium leading-tight">{label}</div>
      {hint && <div className="text-[10.5px] text-[#6E6E73] mt-0.5">{hint}</div>}
    </div>
    <div className="text-[13px] font-semibold tabular-nums shrink-0">{value}</div>
  </div>
);

export default RsvpIntelligenceSection;
