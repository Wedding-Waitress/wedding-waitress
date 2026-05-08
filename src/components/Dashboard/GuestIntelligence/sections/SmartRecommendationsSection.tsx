import { useMemo } from 'react';
import {
  Sparkles, AlertTriangle, Info, CheckCircle2,
  Mail, MapPin, ChefHat, Users, Activity, Compass,
} from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import EmptyHint from '../EmptyHint';
import {
  computeRsvpInsights,
  computeSeatingInsights,
  computeDietaryInsights,
  computeRelationshipInsights,
  type TableLite,
  type EventLite,
} from '../lib/computeGuestInsights';
import { useEventGuestActivities } from '@/hooks/useEventGuestActivities';
import { normalizeRsvp } from '@/lib/rsvp';
import type { Guest } from '@/hooks/useGuests';

type Tone = 'info' | 'warning' | 'positive';
type Category = 'follow-up' | 'seating' | 'dietary' | 'relationship' | 'engagement' | 'readiness';

interface Rec {
  id: string;
  title: string;
  detail?: string;
  tone: Tone;
  category: Category;
}

const TONE_BG: Record<Tone, string> = {
  warning: 'bg-[#FBF4E8] border-[#EDDDC0]',
  info: 'bg-[#FBF8F2] border-[#ECE5D8]',
  positive: 'bg-[#F4F9F4] border-[#DCEBDC]',
};

const TONE_ICON: Record<Tone, React.ReactNode> = {
  warning: <AlertTriangle className="w-3.5 h-3.5 text-[#8A5A14]" />,
  info: <Info className="w-3.5 h-3.5 text-[#967A59]" />,
  positive: <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B2F]" />,
};

const CATEGORY_META: Record<Category, { label: string; icon: React.ReactNode }> = {
  'follow-up': { label: 'Follow-up', icon: <Mail className="w-3.5 h-3.5" /> },
  seating: { label: 'Seating', icon: <MapPin className="w-3.5 h-3.5" /> },
  dietary: { label: 'Dietary', icon: <ChefHat className="w-3.5 h-3.5" /> },
  relationship: { label: 'Relationships', icon: <Users className="w-3.5 h-3.5" /> },
  engagement: { label: 'Engagement', icon: <Activity className="w-3.5 h-3.5" /> },
  readiness: { label: 'Event readiness', icon: <Compass className="w-3.5 h-3.5" /> },
};

const CATEGORY_ORDER: Category[] = ['follow-up', 'seating', 'dietary', 'relationship', 'engagement', 'readiness'];

const SEND_TYPES = new Set(['invited_email', 'invited_sms', 'delivered', 'reminder_sent', 'resent']);
const INTERACTION_TYPES = new Set(['opened', 'clicked', 'responded', 'rsvp_changed']);

export const SmartRecommendationsSection = ({
  guests,
  tables,
  event,
}: {
  guests: Guest[];
  tables: TableLite[];
  event?: EventLite | null;
}) => {
  const { activities } = useEventGuestActivities(event?.id ?? null, { limit: 2000 });

  const recs = useMemo<Rec[]>(() => {
    if (guests.length === 0) return [];

    const rsvp = computeRsvpInsights(guests);
    const seating = computeSeatingInsights(guests, tables);
    const dietary = computeDietaryInsights(guests);
    const rel = computeRelationshipInsights(guests);

    // Engagement from activities
    const opensByGuest = new Map<string, number>();
    const interactionByGuest = new Map<string, number>();
    const sentByActivity = new Set<string>();
    const now = Date.now();
    const day = 86400000;
    let recent24h = 0;
    let rsvpUpdatesToday = 0;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    for (const a of activities) {
      const t = new Date(a.occurred_at).getTime();
      if (a.activity_type === 'opened') opensByGuest.set(a.guest_id, (opensByGuest.get(a.guest_id) ?? 0) + 1);
      if (INTERACTION_TYPES.has(a.activity_type)) {
        interactionByGuest.set(a.guest_id, (interactionByGuest.get(a.guest_id) ?? 0) + 1);
        if (now - t <= day) recent24h++;
      }
      if (SEND_TYPES.has(a.activity_type)) sentByActivity.add(a.guest_id);
      if (a.activity_type === 'rsvp_changed' && t >= todayStart.getTime()) rsvpUpdatesToday++;
    }
    let openedNoRsvp = 0;
    for (const g of guests) {
      if ((opensByGuest.get(g.id) ?? 0) > 0 && normalizeRsvp(g.rsvp) === 'Pending') openedNoRsvp++;
    }
    let lowEngagement = 0;
    for (const g of guests) {
      const s = (g.rsvp_invite_status || '').toLowerCase();
      const wasInvited = (s && s !== 'not_sent' && s !== 'pending') || sentByActivity.has(g.id);
      if (wasInvited && !(interactionByGuest.get(g.id) ?? 0)) lowEngagement++;
    }
    let notOpened = 0;
    for (const g of guests) {
      const s = (g.rsvp_invite_status || '').toLowerCase();
      const wasInvited = (s && s !== 'not_sent' && s !== 'pending') || sentByActivity.has(g.id);
      if (wasInvited && !(opensByGuest.get(g.id) ?? 0)) notOpened++;
    }

    // Days to event
    let daysToEvent: number | null = null;
    if (event?.date) {
      daysToEvent = Math.ceil((new Date(event.date).getTime() - now) / day);
    }
    const urgent = daysToEvent !== null && daysToEvent <= 30;

    // Contact gaps
    let missingContact = 0;
    for (const g of guests) {
      if (!g.email?.trim() && !g.mobile?.trim()) missingContact++;
    }
    let inviteNotSent = 0;
    for (const g of guests) {
      const s = (g.rsvp_invite_status || '').toLowerCase();
      const wasInvited = (s && s !== 'not_sent' && s !== 'pending') || sentByActivity.has(g.id);
      if (!wasInvited) inviteNotSent++;
    }

    const out: Rec[] = [];

    /* ---------- Follow-up ---------- */
    if (rsvp.pending > 0) {
      out.push({
        id: 'pending-rsvp',
        category: 'follow-up',
        title: `${rsvp.pending} guest${rsvp.pending === 1 ? '' : 's'} still pending RSVP`,
        detail: urgent ? `Event is in ${daysToEvent} day${daysToEvent === 1 ? '' : 's'} — a reminder may help.` : 'Plan a gentle follow-up via Communications Centre.',
        tone: urgent ? 'warning' : 'info',
      });
    }
    if (notOpened > 0) {
      out.push({
        id: 'not-opened',
        category: 'follow-up',
        title: `${notOpened} guest${notOpened === 1 ? '' : 's'} have not opened invitations`,
        detail: 'Consider a different channel or a quick personal nudge.',
        tone: 'info',
      });
    }
    if (inviteNotSent > 0) {
      out.push({
        id: 'not-invited',
        category: 'follow-up',
        title: `${inviteNotSent} guest${inviteNotSent === 1 ? '' : 's'} not yet invited`,
        detail: 'Send invites from Communications Centre when ready.',
        tone: 'info',
      });
    }

    /* ---------- Seating ---------- */
    if (seating.unassigned > 0) {
      out.push({
        id: 'unseated',
        category: 'seating',
        title: `${seating.unassigned} guest${seating.unassigned === 1 ? '' : 's'} remain unseated`,
        detail: 'Open the Tables page to assign them.',
        tone: 'warning',
      });
    }
    if (seating.overCapacity.length > 0) {
      out.push({
        id: 'over-cap',
        category: 'seating',
        title: `${seating.overCapacity.length} table${seating.overCapacity.length === 1 ? '' : 's'} over capacity`,
        detail: seating.overCapacity.slice(0, 3).map(t => t.name).join(', '),
        tone: 'warning',
      });
    }
    if (seating.nearCapacity.length > 0) {
      out.push({
        id: 'near-cap',
        category: 'seating',
        title: `${seating.nearCapacity.length} table${seating.nearCapacity.length === 1 ? '' : 's'} nearing capacity`,
        detail: 'Consider rebalancing before final confirmations.',
        tone: 'info',
      });
    }
    if (seating.familySplits.length > 0) {
      out.push({
        id: 'family-split',
        category: 'seating',
        title: `Large family group${seating.familySplits.length === 1 ? '' : 's'} split across tables`,
        detail: seating.familySplits.slice(0, 2).map(f => `${f.name} (${f.tableCount} tables)`).join(', '),
        tone: 'info',
      });
    }

    /* ---------- Dietary ---------- */
    if (dietary.attentionNotes && dietary.attentionNotes.length > 0) {
      for (const n of dietary.attentionNotes.slice(0, 3)) {
        out.push({ id: `diet-${n.id}`, category: 'dietary', title: n.text, tone: 'info' });
      }
    }
    if (dietary.alerts && dietary.alerts.length > 0) {
      const total = dietary.alerts.reduce((s, a) => s + a.count, 0);
      out.push({
        id: 'diet-allergies',
        category: 'dietary',
        title: `${total} allergy-sensitive guest${total === 1 ? '' : 's'} require catering attention`,
        detail: dietary.alerts.slice(0, 3).map(a => `${a.label} (${a.count})`).join(', '),
        tone: 'warning',
      });
    }
    if (dietary.missing > 0) {
      out.push({
        id: 'diet-missing',
        category: 'dietary',
        title: `Dietary information incomplete for ${dietary.missing} guest${dietary.missing === 1 ? '' : 's'}`,
        detail: 'Prompt them via the guest live view to update.',
        tone: 'info',
      });
    }

    /* ---------- Relationship ---------- */
    if (rel.uncategorized > 0 && guests.length > 0) {
      out.push({
        id: 'rel-uncat',
        category: 'relationship',
        title: `${rel.uncategorized} guest${rel.uncategorized === 1 ? '' : 's'} missing relationship labels`,
        detail: 'Adding sides and roles improves seating intelligence.',
        tone: 'info',
      });
    }
    if (rel.imbalance) {
      const stronger = rel.partnerOne >= rel.partnerTwo
        ? (event?.partner1_name?.trim() || 'Partner 1')
        : (event?.partner2_name?.trim() || 'Partner 2');
      const weaker = rel.partnerOne >= rel.partnerTwo
        ? (event?.partner2_name?.trim() || 'Partner 2')
        : (event?.partner1_name?.trim() || 'Partner 1');
      out.push({
        id: 'rel-imbalance',
        category: 'relationship',
        title: `${weaker} side attendance is lower than ${stronger} side`,
        detail: 'Worth a quick check before confirming seating.',
        tone: 'info',
      });
    }
    if (rel.plusOneSlotsOpen > 0) {
      out.push({
        id: 'rel-plus-ones',
        category: 'relationship',
        title: `${rel.plusOneSlotsOpen} plus-one slot${rel.plusOneSlotsOpen === 1 ? '' : 's'} not yet filled`,
        detail: 'Reach out so you can plan seats and meals accurately.',
        tone: 'info',
      });
    }

    /* ---------- Engagement ---------- */
    if (openedNoRsvp > 0) {
      out.push({
        id: 'eng-opened-no-rsvp',
        category: 'engagement',
        title: `${openedNoRsvp} guest${openedNoRsvp === 1 ? '' : 's'} opened invitations but have not responded`,
        detail: 'A short personal nudge often converts these.',
        tone: 'warning',
      });
    }
    if (lowEngagement > 0) {
      out.push({
        id: 'eng-low',
        category: 'engagement',
        title: `Low engagement detected for ${lowEngagement} guest${lowEngagement === 1 ? '' : 's'}`,
        detail: 'Try an alternate channel or a personal message.',
        tone: 'info',
      });
    }
    if (rsvpUpdatesToday > 0) {
      out.push({
        id: 'eng-recent',
        category: 'engagement',
        title: `${rsvpUpdatesToday} RSVP update${rsvpUpdatesToday === 1 ? '' : 's'} today`,
        detail: recent24h > 0 ? `${recent24h} guest interaction${recent24h === 1 ? '' : 's'} in the last 24 hours.` : undefined,
        tone: 'positive',
      });
    }

    /* ---------- Readiness ---------- */
    if (rsvp.responseRate >= 0.85) {
      out.push({
        id: 'ready-rsvp',
        category: 'readiness',
        title: 'RSVP completion nearing target',
        detail: `${Math.round(rsvp.responseRate * 100)}% of guests have responded.`,
        tone: 'positive',
      });
    }
    if (rel.coveragePct >= 0.8 && guests.length > 0) {
      out.push({
        id: 'ready-rel',
        category: 'readiness',
        title: 'Most guests successfully categorized',
        detail: `${Math.round(rel.coveragePct * 100)}% have a side or role assigned.`,
        tone: 'positive',
      });
    }
    if (seating.attendingTotal > 0 && seating.completionPct < 0.8 && tables.length > 0) {
      out.push({
        id: 'ready-seating',
        category: 'readiness',
        title: 'Seating progress is incomplete',
        detail: `${Math.round(seating.completionPct * 100)}% of attending guests are seated.`,
        tone: 'info',
      });
    }
    if (missingContact > 0) {
      out.push({
        id: 'ready-contact',
        category: 'readiness',
        title: `${missingContact} guest${missingContact === 1 ? '' : 's'} missing contact details`,
        detail: 'Add email or mobile to enable digital invites and updates.',
        tone: 'info',
      });
    }

    return out;
  }, [guests, tables, event, activities]);

  const grouped = useMemo(() => {
    const map = new Map<Category, Rec[]>();
    for (const r of recs) {
      const arr = map.get(r.category) ?? [];
      arr.push(r);
      map.set(r.category, arr);
    }
    return map;
  }, [recs]);

  const actionable = recs.filter(r => r.tone === 'warning').length;

  return (
    <IntelligenceSection
      value="recommendations"
      title="Smart Recommendations"
      description="Calm, logic-based next steps tailored to your event"
      icon={<Sparkles className="w-4 h-4" />}
      badge={actionable || ''}
      badgeTone="warning"
    >
      {guests.length === 0 ? (
        <EmptyHint>Add guests to see tailored recommendations.</EmptyHint>
      ) : recs.length === 0 ? (
        <div className="rounded-xl bg-[#F4F9F4] border border-[#DCEBDC] px-3 py-3 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-[#2F6B2F] mt-0.5 shrink-0" />
          <div>
            <div className="text-[13px] font-medium text-[#1D1D1F] leading-snug">Everything looks great</div>
            <div className="text-[11.5px] text-[#6E6E73] mt-0.5 leading-snug">
              No action items right now — we'll surface new suggestions as your event evolves.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORY_ORDER.filter(c => grouped.has(c)).map(cat => {
            const items = grouped.get(cat)!;
            const meta = CATEGORY_META[cat];
            return (
              <div key={cat} className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
                  <span className="text-[#967A59]">{meta.icon}</span>
                  <span>{meta.label}</span>
                  <span className="ml-auto tabular-nums text-[#9E9E9E]">{items.length}</span>
                </div>
                {items.map(r => (
                  <div
                    key={r.id}
                    className={`rounded-xl border px-3 py-2.5 flex gap-2.5 ${TONE_BG[r.tone]}`}
                  >
                    <div className="mt-0.5 shrink-0">{TONE_ICON[r.tone]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#1D1D1F] leading-snug">
                        {r.title}
                      </div>
                      {r.detail && (
                        <div className="text-[11.5px] text-[#6E6E73] mt-0.5 leading-snug">
                          {r.detail}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </IntelligenceSection>
  );
};

export default SmartRecommendationsSection;
