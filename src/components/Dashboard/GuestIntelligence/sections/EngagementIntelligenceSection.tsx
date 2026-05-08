import { useMemo } from 'react';
import { Activity, Eye, EyeOff, Sparkles, Clock, Users, RefreshCw } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import EmptyHint from '../EmptyHint';
import { useEventGuestActivities } from '@/hooks/useEventGuestActivities';
import { normalizeRsvp } from '@/lib/rsvp';
import type { Guest } from '@/hooks/useGuests';

interface Props {
  guests: Guest[];
  eventId?: string | null;
}

const Stat = ({
  label, value, tone = 'neutral', hint,
}: { label: string; value: React.ReactNode; tone?: 'neutral' | 'positive' | 'warning' | 'info'; hint?: string }) => {
  const valueColor =
    tone === 'warning' ? 'text-[#8A5A14]' : tone === 'positive' ? 'text-[#2F6B2F]' : 'text-[#1D1D1F]';
  return (
    <div className="rounded-lg bg-white border border-[#ECE5D8] px-2.5 py-2 text-center">
      <div className="text-[10px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">{label}</div>
      <div className={`text-[14px] font-semibold mt-0.5 tabular-nums ${valueColor}`}>{value}</div>
      {hint && <div className="text-[10px] text-[#6E6E73] mt-0.5">{hint}</div>}
    </div>
  );
};

const SignalRow = ({
  icon, label, value, tone = 'neutral',
}: { icon?: React.ReactNode; label: React.ReactNode; value: React.ReactNode; tone?: 'neutral' | 'warning' | 'positive' }) => {
  const valueColor =
    tone === 'warning' ? 'text-[#8A5A14]' : tone === 'positive' ? 'text-[#2F6B2F]' : 'text-[#6E6E73]';
  return (
    <div className="flex items-center justify-between text-[13px] bg-[#FBF8F2] border border-[#ECE5D8] rounded-lg px-3 py-2">
      <span className="flex items-center gap-2 text-[#1D1D1F] truncate pr-2">
        {icon ? <span className="text-[#967A59] shrink-0">{icon}</span> : null}
        <span className="truncate">{label}</span>
      </span>
      <span className={`text-[12.5px] font-medium tabular-nums shrink-0 ${valueColor}`}>{value}</span>
    </div>
  );
};

const INTERACTION_TYPES = new Set(['opened', 'clicked', 'responded', 'rsvp_changed']);
const SEND_TYPES = new Set(['invited_email', 'invited_sms', 'delivered', 'reminder_sent', 'resent']);

export const EngagementIntelligenceSection = ({ guests, eventId }: Props) => {
  const { activities, loading } = useEventGuestActivities(eventId, { limit: 2000 });

  const ins = useMemo(() => {
    const total = guests.length;
    if (total === 0) {
      return null;
    }

    const byId = new Map(guests.map(g => [g.id, g] as const));
    type Per = {
      opens: number; interactions: number; lastInteractionAt: number | null; rsvpChanges: number;
    };
    const per = new Map<string, Per>();
    const ensure = (id: string) => {
      let p = per.get(id);
      if (!p) { p = { opens: 0, interactions: 0, lastInteractionAt: null, rsvpChanges: 0 }; per.set(id, p); }
      return p;
    };

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    let recent24h = 0;
    let rsvpUpdatesToday = 0;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    for (const a of activities) {
      const t = new Date(a.occurred_at).getTime();
      if (a.activity_type === 'opened') {
        const p = ensure(a.guest_id); p.opens++; p.interactions++; p.lastInteractionAt = Math.max(p.lastInteractionAt ?? 0, t);
      } else if (INTERACTION_TYPES.has(a.activity_type)) {
        const p = ensure(a.guest_id); p.interactions++; p.lastInteractionAt = Math.max(p.lastInteractionAt ?? 0, t);
        if (a.activity_type === 'rsvp_changed') p.rsvpChanges++;
      }
      if (INTERACTION_TYPES.has(a.activity_type) && now - t <= day) recent24h++;
      if (a.activity_type === 'rsvp_changed' && t >= todayStart.getTime()) rsvpUpdatesToday++;
    }

    // Sent-by-status (existing field) OR sent-by-activity feed
    const sentByActivity = new Set<string>();
    for (const a of activities) {
      if (SEND_TYPES.has(a.activity_type)) sentByActivity.add(a.guest_id);
    }
    let invited = 0;
    for (const g of guests) {
      const s = (g.rsvp_invite_status || '').toLowerCase();
      const sentStatus = s && s !== 'not_sent' && s !== 'pending';
      if (sentStatus || sentByActivity.has(g.id)) invited++;
    }

    // Engaged set
    const engaged = Array.from(per.entries()).filter(([, p]) => p.interactions > 0);
    const engagedIds = new Set(engaged.map(([id]) => id));
    const engagementCompletionPct = invited ? engagedIds.size / invited : 0;

    // Top engaged guests
    const mostEngaged = engaged
      .map(([id, p]) => {
        const g = byId.get(id);
        return g ? { id, name: `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() || 'Guest', interactions: p.interactions, opens: p.opens } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b!.interactions - a!.interactions))
      .slice(0, 5) as Array<{ id: string; name: string; interactions: number; opens: number }>;

    // Opened but no response
    const openedNoResponse: Array<{ id: string; name: string; opens: number }> = [];
    for (const [id, p] of per) {
      if (p.opens === 0) continue;
      const g = byId.get(id);
      if (!g) continue;
      if (normalizeRsvp(g.rsvp) === 'Pending') {
        openedNoResponse.push({ id, name: `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() || 'Guest', opens: p.opens });
      }
    }
    openedNoResponse.sort((a, b) => b.opens - a.opens);

    // Repeat opens (>=2)
    const repeatOpens = Array.from(per.values()).filter(p => p.opens >= 2).length;

    // Low engagement: invited but 0 interactions
    let lowEngagement = 0;
    for (const g of guests) {
      const s = (g.rsvp_invite_status || '').toLowerCase();
      const sentStatus = s && s !== 'not_sent' && s !== 'pending';
      const wasInvited = sentStatus || sentByActivity.has(g.id);
      if (!wasInvited) continue;
      if (!engagedIds.has(g.id)) lowEngagement++;
    }

    // Most active families
    const familyMap = new Map<string, { interactions: number; members: number }>();
    for (const g of guests) {
      const fam = (g.family_group || '').trim();
      if (!fam) continue;
      const p = per.get(g.id);
      const entry = familyMap.get(fam) ?? { interactions: 0, members: 0 };
      entry.members++;
      entry.interactions += p?.interactions ?? 0;
      familyMap.set(fam, entry);
    }
    const topFamilies = Array.from(familyMap.entries())
      .filter(([, v]) => v.interactions > 0 && v.members >= 2)
      .map(([name, v]) => ({ name, interactions: v.interactions, members: v.members }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 3);

    // Activity totals
    const totalOpens = Array.from(per.values()).reduce((s, p) => s + p.opens, 0);
    const totalRsvpChanges = Array.from(per.values()).reduce((s, p) => s + p.rsvpChanges, 0);

    return {
      total,
      invited,
      engagedCount: engagedIds.size,
      engagementCompletionPct,
      mostEngaged,
      openedNoResponse: openedNoResponse.slice(0, 5),
      openedNoResponseCount: openedNoResponse.length,
      repeatOpens,
      lowEngagement,
      totalOpens,
      totalRsvpChanges,
      recent24h,
      rsvpUpdatesToday,
      topFamilies,
      hasActivityData: activities.length > 0,
    };
  }, [guests, activities]);

  if (!ins) {
    return (
      <IntelligenceSection
        value="engagement"
        title="Engagement Intelligence"
        description="How guests are interacting with your invites"
        icon={<Activity className="w-4 h-4" />}
      >
        <EmptyHint>Add guests to see engagement insights.</EmptyHint>
      </IntelligenceSection>
    );
  }

  const completionPctRound = Math.round(ins.engagementCompletionPct * 100);

  return (
    <IntelligenceSection
      value="engagement"
      title="Engagement Intelligence"
      description="How guests are interacting with your invites"
      icon={<Activity className="w-4 h-4" />}
      badge={ins.openedNoResponseCount > 0 ? `${ins.openedNoResponseCount} opened, no RSVP` : ''}
      badgeTone="warning"
    >
      <div className="space-y-4">
        {/* Top stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Engaged" value={ins.engagedCount} tone="positive" />
          <Stat label="Repeat Opens" value={ins.repeatOpens} tone="info" />
          <Stat label="Low Engagement" value={ins.lowEngagement} tone={ins.lowEngagement > 0 ? 'warning' : 'neutral'} />
        </div>

        {/* Completion progress */}
        {ins.invited > 0 && (
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium mb-1.5">
              <span>Engagement completion</span>
              <span className="tabular-nums normal-case tracking-normal text-[#1D1D1F]">
                {completionPctRound}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#ECE5D8]">
              <div className="h-full bg-[#967A59] transition-all" style={{ width: `${completionPctRound}%` }} />
            </div>
            <div className="text-[11.5px] text-[#6E6E73] mt-1.5">
              {ins.engagedCount} of {ins.invited} invited guest{ins.invited === 1 ? '' : 's'} have interacted
            </div>
          </div>
        )}

        {/* Recent activity strip */}
        {ins.hasActivityData && (
          <div className="grid grid-cols-2 gap-2">
            <SignalRow
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Interacted in last 24h"
              value={ins.recent24h}
              tone={ins.recent24h > 0 ? 'positive' : 'neutral'}
            />
            <SignalRow
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              label="RSVP updates today"
              value={ins.rsvpUpdatesToday}
              tone={ins.rsvpUpdatesToday > 0 ? 'positive' : 'neutral'}
            />
          </div>
        )}

        {/* Activity totals */}
        {ins.hasActivityData && (ins.totalOpens > 0 || ins.totalRsvpChanges > 0) && (
          <div className="space-y-1.5">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
              Activity summary
            </div>
            <SignalRow
              icon={<Eye className="w-3.5 h-3.5" />}
              label="Invitation opens"
              value={ins.totalOpens}
            />
            {ins.totalRsvpChanges > 0 && (
              <SignalRow
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                label="RSVP updates"
                value={ins.totalRsvpChanges}
              />
            )}
          </div>
        )}

        {/* Most engaged guests */}
        {ins.mostEngaged.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
              Most engaged guests
            </div>
            {ins.mostEngaged.map(g => (
              <SignalRow
                key={g.id}
                icon={<Sparkles className="w-3.5 h-3.5" />}
                label={g.name}
                value={`${g.interactions} interaction${g.interactions === 1 ? '' : 's'}`}
                tone="positive"
              />
            ))}
          </div>
        )}

        {/* Opened but no response */}
        {ins.openedNoResponse.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
              Opened invite but haven't RSVPd
            </div>
            {ins.openedNoResponse.map(g => (
              <SignalRow
                key={g.id}
                icon={<Eye className="w-3.5 h-3.5" />}
                label={g.name}
                value={`${g.opens} open${g.opens === 1 ? '' : 's'}`}
                tone="warning"
              />
            ))}
            {ins.openedNoResponseCount > ins.openedNoResponse.length && (
              <div className="text-[11.5px] text-[#6E6E73] px-1">
                +{ins.openedNoResponseCount - ins.openedNoResponse.length} more
              </div>
            )}
          </div>
        )}

        {/* Most active households */}
        {ins.topFamilies.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
              Most active households
            </div>
            {ins.topFamilies.map(f => (
              <SignalRow
                key={f.name}
                icon={<Users className="w-3.5 h-3.5" />}
                label={`${f.name} · ${f.members} guest${f.members === 1 ? '' : 's'}`}
                value={`${f.interactions} interaction${f.interactions === 1 ? '' : 's'}`}
                tone="positive"
              />
            ))}
          </div>
        )}

        {/* Empty activity hint */}
        {!ins.hasActivityData && !loading && (
          <div className="rounded-xl bg-[#FBF8F2] border border-[#ECE5D8] px-3 py-2.5 text-[12px] text-[#6E6E73] flex items-start gap-2 leading-snug">
            <EyeOff className="w-3.5 h-3.5 text-[#967A59] shrink-0 mt-0.5" />
            <span>
              No tracked interactions yet — open and click insights will appear once guests engage with invites.
            </span>
          </div>
        )}

        <div className="text-[11px] text-[#6E6E73] leading-snug">
          For invite delivery, opens and reminders, see the Communications Centre.
        </div>
      </div>
    </IntelligenceSection>
  );
};

export default EngagementIntelligenceSection;
