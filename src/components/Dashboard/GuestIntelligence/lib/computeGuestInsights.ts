import type { Guest } from '@/hooks/useGuests';
import { normalizeRsvp } from '@/lib/rsvp';

export interface TableLite {
  id: string;
  name: string;
  limit_seats: number;
  table_no?: number | null;
}

export interface EventLite {
  id: string;
  date?: string | null;
  rsvp_deadline?: string | null;
  guest_limit?: number | null;
  partner1_name?: string | null;
  partner2_name?: string | null;
}

export interface RsvpInsights {
  total: number;
  attending: number;
  pending: number;
  declined: number;
  responseRate: number; // 0-1
}

export const computeRsvpInsights = (guests: Guest[]): RsvpInsights => {
  let attending = 0, declined = 0, pending = 0;
  for (const g of guests) {
    const s = normalizeRsvp(g.rsvp);
    if (s === 'Attending') attending++;
    else if (s === 'Not Attending') declined++;
    else pending++;
  }
  const total = guests.length;
  const responded = attending + declined;
  return { total, attending, pending, declined, responseRate: total ? responded / total : 0 };
};

export interface RelationshipInsights {
  partnerOne: number;
  partnerTwo: number;
  unspecified: number;
  topRoles: Array<{ role: string; count: number }>;
  imbalance: boolean;
  topFamilies: Array<{ name: string; count: number }>;
  familyGroupsCount: number;
  inFamilyGroup: number;
  individuals: number;
  coupleUnits: number; // primary + plus-one pairs (counted as units)
  plusOnesAdded: number;
  plusOnesAttending: number;
  plusOnesPending: number;
  plusOneSlotsOpen: number; // primaries with allow_plus_one but no plus-one added
  categorized: number; // has relation_partner OR relation_role
  uncategorized: number;
  coveragePct: number; // 0-1
  vipCount: number;
}

const VIP_ROLE_HINTS = ['parent', 'mother', 'father', 'bride', 'groom', 'best', 'maid', 'matron', 'bridal_party', 'wedding_party', 'immediate'];

export const computeRelationshipInsights = (guests: Guest[]): RelationshipInsights => {
  let p1 = 0, p2 = 0, none = 0;
  const roles = new Map<string, number>();
  const families = new Map<string, number>();
  let plusOnesAdded = 0, plusOnesAttending = 0, plusOnesPending = 0, plusOneSlotsOpen = 0;
  let categorized = 0, vipCount = 0, inFamily = 0;

  // map of primary -> has plus-one child added
  const primaryHasChild = new Set<string>();
  for (const g of guests) if (g.added_by_guest_id) primaryHasChild.add(g.added_by_guest_id);

  for (const g of guests) {
    if (g.relation_partner === 'partner_one') p1++;
    else if (g.relation_partner === 'partner_two') p2++;
    else none++;
    const r = (g.relation_role || '').trim();
    if (r) roles.set(r, (roles.get(r) ?? 0) + 1);
    const fam = (g.family_group || '').trim();
    if (fam) {
      families.set(fam, (families.get(fam) ?? 0) + 1);
      inFamily++;
    }
    if (g.added_by_guest_id) {
      plusOnesAdded++;
      const s = normalizeRsvp(g.rsvp);
      if (s === 'Attending') plusOnesAttending++;
      else if (s === 'Pending') plusOnesPending++;
    } else if (g.allow_plus_one && !primaryHasChild.has(g.id)) {
      plusOneSlotsOpen++;
    }
    if (g.relation_partner || r) categorized++;
    if (r && VIP_ROLE_HINTS.some(h => r.toLowerCase().includes(h))) vipCount++;
  }
  const topRoles = Array.from(roles.entries())
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const topFamilies = Array.from(families.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const sided = p1 + p2;
  const imbalance = sided > 0 && (Math.max(p1, p2) / sided) > 0.7;
  const coupleUnits = guests.filter(g => !g.added_by_guest_id && g.allow_plus_one && primaryHasChild.has(g.id)).length;
  const individuals = guests.filter(g => !g.added_by_guest_id && !(g.family_group || '').trim() && !(g.allow_plus_one && primaryHasChild.has(g.id))).length;
  const total = guests.length;
  return {
    partnerOne: p1, partnerTwo: p2, unspecified: none, topRoles, imbalance,
    topFamilies, familyGroupsCount: families.size, inFamilyGroup: inFamily,
    individuals, coupleUnits,
    plusOnesAdded, plusOnesAttending, plusOnesPending, plusOneSlotsOpen,
    categorized, uncategorized: total - categorized,
    coveragePct: total ? categorized / total : 0,
    vipCount,
  };
};

export interface DietaryInsights {
  totalWithDietary: number;
  pctOfAttending: number;
  breakdown: Array<{ tag: string; count: number }>;
  topTag: string | null;
}

export const computeDietaryInsights = (guests: Guest[]): DietaryInsights => {
  const attending = guests.filter(g => normalizeRsvp(g.rsvp) === 'Attending');
  const map = new Map<string, number>();
  let totalWithDietary = 0;
  for (const g of guests) {
    const d = (g.dietary || '').trim();
    if (!d || d.toLowerCase() === 'none' || d.toLowerCase() === 'no') continue;
    totalWithDietary++;
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  const breakdown = Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
  return {
    totalWithDietary,
    pctOfAttending: attending.length ? totalWithDietary / attending.length : 0,
    breakdown: breakdown.slice(0, 6),
    topTag: breakdown[0]?.tag ?? null,
  };
};

export interface SeatingInsights {
  assigned: number;
  unassigned: number;
  emptyTables: number;
  nearCapacity: Array<{ name: string; used: number; limit: number }>;
  overCapacity: Array<{ name: string; used: number; limit: number }>;
}

export const computeSeatingInsights = (guests: Guest[], tables: TableLite[]): SeatingInsights => {
  const attending = guests.filter(g => normalizeRsvp(g.rsvp) !== 'Not Attending');
  const assigned = attending.filter(g => !!g.table_id).length;
  const unassigned = attending.length - assigned;
  const counts = new Map<string, number>();
  for (const g of attending) {
    if (g.table_id) counts.set(g.table_id, (counts.get(g.table_id) ?? 0) + 1);
  }
  const emptyTables = tables.filter(t => !counts.get(t.id)).length;
  const nearCapacity: SeatingInsights['nearCapacity'] = [];
  const overCapacity: SeatingInsights['overCapacity'] = [];
  for (const t of tables) {
    const used = counts.get(t.id) ?? 0;
    const limit = t.limit_seats || 0;
    if (!limit) continue;
    if (used > limit) overCapacity.push({ name: t.name, used, limit });
    else if (used / limit >= 0.9) nearCapacity.push({ name: t.name, used, limit });
  }
  return { assigned, unassigned, emptyTables, nearCapacity, overCapacity };
};

export interface EngagementInsights {
  inviteSent: number;
  inviteNotSent: number;
  withEmail: number;
  withMobile: number;
  withBoth: number;
  withNeither: number;
}

export const computeEngagementInsights = (guests: Guest[]): EngagementInsights => {
  let sent = 0, notSent = 0, email = 0, mobile = 0, both = 0, neither = 0;
  for (const g of guests) {
    const s = (g.rsvp_invite_status || '').toLowerCase();
    if (s && s !== 'not_sent' && s !== 'pending') sent++;
    else notSent++;
    const e = !!g.email?.trim();
    const m = !!g.mobile?.trim();
    if (e) email++;
    if (m) mobile++;
    if (e && m) both++;
    if (!e && !m) neither++;
  }
  return { inviteSent: sent, inviteNotSent: notSent, withEmail: email, withMobile: mobile, withBoth: both, withNeither: neither };
};

export interface Recommendation {
  id: string;
  title: string;
  detail?: string;
  tone: 'info' | 'warning' | 'positive';
}

export const computeRecommendations = (
  rsvp: RsvpInsights,
  seating: SeatingInsights,
  dietary: DietaryInsights,
  engagement: EngagementInsights,
  event?: EventLite | null,
): Recommendation[] => {
  const recs: Recommendation[] = [];
  if (seating.unassigned > 0) {
    recs.push({
      id: 'unassigned',
      title: `${seating.unassigned} guest${seating.unassigned === 1 ? '' : 's'} unassigned`,
      detail: 'Open the Tables page to seat them.',
      tone: 'warning',
    });
  }
  if (seating.overCapacity.length > 0) {
    recs.push({
      id: 'over-cap',
      title: `${seating.overCapacity.length} table${seating.overCapacity.length === 1 ? '' : 's'} over capacity`,
      detail: seating.overCapacity.map(t => t.name).slice(0, 3).join(', '),
      tone: 'warning',
    });
  }
  if (rsvp.pending > 0) {
    let urgent = false;
    if (event?.date) {
      const days = Math.ceil((new Date(event.date).getTime() - Date.now()) / 86400000);
      urgent = days <= 30;
    }
    recs.push({
      id: 'pending-rsvp',
      title: `${rsvp.pending} pending RSVP${rsvp.pending === 1 ? '' : 's'}`,
      detail: urgent ? 'Event is within 30 days — consider sending a reminder.' : 'Consider a follow-up via Communications Centre.',
      tone: urgent ? 'warning' : 'info',
    });
  }
  if (engagement.inviteNotSent > 0) {
    recs.push({
      id: 'not-invited',
      title: `${engagement.inviteNotSent} guest${engagement.inviteNotSent === 1 ? '' : 's'} not yet invited`,
      detail: 'Use Communications Centre to send invites.',
      tone: 'info',
    });
  }
  if (dietary.totalWithDietary > 0 && dietary.topTag) {
    recs.push({
      id: 'dietary',
      title: `Top dietary need: ${dietary.topTag}`,
      detail: `${dietary.totalWithDietary} guest${dietary.totalWithDietary === 1 ? '' : 's'} with requirements.`,
      tone: 'info',
    });
  }
  if (engagement.withNeither > 0) {
    recs.push({
      id: 'no-contact',
      title: `${engagement.withNeither} guest${engagement.withNeither === 1 ? '' : 's'} missing contact info`,
      detail: 'Add email or mobile to enable digital invites.',
      tone: 'warning',
    });
  }
  if (recs.length === 0) {
    recs.push({ id: 'all-good', title: 'Everything looks great', detail: 'No action items right now.', tone: 'positive' });
  }
  return recs;
};
