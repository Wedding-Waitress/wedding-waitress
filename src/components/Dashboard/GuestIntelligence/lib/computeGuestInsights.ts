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
  // Extended
  attendingTotal: number;
  totalGuests: number;
  missing: number; // attending guests with no dietary info
  completionPct: number; // recorded (with or without 'none') / attending
  categories: Array<{ key: string; label: string; count: number; tone: 'neutral' | 'warning' }>;
  alerts: Array<{ key: string; label: string; count: number }>;
  topCategory: { label: string; count: number } | null;
  attentionNotes: Array<{ id: string; text: string }>;
}

const CATEGORY_DEFS: Array<{ key: string; label: string; patterns: RegExp; tone: 'neutral' | 'warning' }> = [
  { key: 'vegetarian', label: 'Vegetarian', patterns: /\bveg(etarian)?\b/i, tone: 'neutral' },
  { key: 'vegan', label: 'Vegan', patterns: /\bvegan\b/i, tone: 'neutral' },
  { key: 'halal', label: 'Halal', patterns: /\bhalal\b/i, tone: 'neutral' },
  { key: 'kosher', label: 'Kosher', patterns: /\bkosher\b/i, tone: 'neutral' },
  { key: 'gluten_free', label: 'Gluten-Free', patterns: /gluten[\s-]?free|\bgf\b|coeliac|celiac/i, tone: 'neutral' },
  { key: 'dairy_free', label: 'Dairy-Free', patterns: /dairy[\s-]?free|lactose/i, tone: 'neutral' },
  { key: 'nut_allergy', label: 'Nut Allergy', patterns: /\bnut(s)?\b|peanut|almond|cashew/i, tone: 'warning' },
  { key: 'shellfish', label: 'Shellfish Allergy', patterns: /shellfish|prawn|shrimp|crab|lobster/i, tone: 'warning' },
  { key: 'egg', label: 'Egg Allergy', patterns: /\begg(s)?\b/i, tone: 'warning' },
  { key: 'soy', label: 'Soy', patterns: /\bsoy\b|soya/i, tone: 'neutral' },
  { key: 'pescatarian', label: 'Pescatarian', patterns: /pescatarian|fish only/i, tone: 'neutral' },
  { key: 'kids_meal', label: 'Kids Meal', patterns: /kid(s)?|child(ren)?/i, tone: 'neutral' },
];

const isMissingDietary = (d: string) => {
  const v = d.trim().toLowerCase();
  return !v || v === 'na' || v === 'n/a' || v === 'none' || v === 'no' || v === '-';
};

export const computeDietaryInsights = (guests: Guest[]): DietaryInsights => {
  const attending = guests.filter(g => normalizeRsvp(g.rsvp) === 'Attending');
  const map = new Map<string, number>();
  const catCounts = new Map<string, number>();
  let totalWithDietary = 0;
  let missing = 0;
  let othersCount = 0;

  for (const g of attending) {
    const d = (g.dietary || '').trim();
    if (isMissingDietary(d)) {
      missing++;
      continue;
    }
    totalWithDietary++;
    map.set(d, (map.get(d) ?? 0) + 1);
    let matched = false;
    for (const def of CATEGORY_DEFS) {
      if (def.patterns.test(d)) {
        catCounts.set(def.key, (catCounts.get(def.key) ?? 0) + 1);
        matched = true;
      }
    }
    if (!matched) othersCount++;
  }

  const breakdown = Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  const categories = CATEGORY_DEFS
    .map(d => ({ key: d.key, label: d.label, count: catCounts.get(d.key) ?? 0, tone: d.tone }))
    .filter(c => c.count > 0);
  if (othersCount > 0) categories.push({ key: 'other', label: 'Other', count: othersCount, tone: 'neutral' });

  const alerts = categories
    .filter(c => c.tone === 'warning')
    .map(c => ({ key: c.key, label: c.label, count: c.count }));

  const topCategory = categories.length
    ? [...categories].sort((a, b) => b.count - a.count)[0]
    : null;

  const attentionNotes: Array<{ id: string; text: string }> = [];
  const halal = catCounts.get('halal') ?? 0;
  const kids = catCounts.get('kids_meal') ?? 0;
  const allergyTotal = alerts.reduce((s, a) => s + a.count, 0);
  if (halal >= 5) attentionNotes.push({ id: 'halal', text: `Large halal guest count (${halal}) — coordinate with caterer.` });
  if (kids >= 3) attentionNotes.push({ id: 'kids', text: `${kids} kids meals — confirm child-friendly menu options.` });
  if (allergyTotal >= 3) attentionNotes.push({ id: 'allergies', text: `${allergyTotal} allergy-sensitive guests — flag plates clearly.` });
  if (attending.length > 0 && missing / attending.length > 0.3) {
    attentionNotes.push({ id: 'missing', text: `Over 30% of attending guests are missing dietary info.` });
  }

  const recorded = totalWithDietary + (attending.length - totalWithDietary - missing); // recorded includes "none"
  const completionPct = attending.length ? Math.max(0, Math.min(1, (attending.length - missing) / attending.length)) : 0;

  return {
    totalWithDietary,
    pctOfAttending: attending.length ? totalWithDietary / attending.length : 0,
    breakdown: breakdown.slice(0, 6),
    topTag: breakdown[0]?.tag ?? null,
    attendingTotal: attending.length,
    totalGuests: guests.length,
    missing,
    completionPct,
    categories: categories.sort((a, b) => b.count - a.count),
    alerts,
    topCategory: topCategory ? { label: topCategory.label, count: topCategory.count } : null,
    attentionNotes,
  };
};

export interface SeatingInsights {
  assigned: number;
  unassigned: number;
  emptyTables: number;
  nearCapacity: Array<{ name: string; used: number; limit: number }>;
  overCapacity: Array<{ name: string; used: number; limit: number }>;
  // Extended
  attendingTotal: number;
  totalTables: number;
  totalCapacity: number;
  emptySeats: number;
  underFilledTables: Array<{ name: string; used: number; limit: number }>;
  atCapacityTables: Array<{ name: string; used: number; limit: number }>;
  largestTables: Array<{ name: string; used: number; limit: number }>;
  completionPct: number; // assigned / attending
  couplesSeparated: number; // primary+plus-one pairs at different tables
  couplesPairsConsidered: number;
  familySplits: Array<{ name: string; tableCount: number; total: number }>;
}

export const computeSeatingInsights = (guests: Guest[], tables: TableLite[]): SeatingInsights => {
  const attending = guests.filter(g => normalizeRsvp(g.rsvp) !== 'Not Attending');
  const assigned = attending.filter(g => !!g.table_id).length;
  const unassigned = attending.length - assigned;
  const counts = new Map<string, number>();
  for (const g of attending) {
    if (g.table_id) counts.set(g.table_id, (counts.get(g.table_id) ?? 0) + 1);
  }
  const tableInfo = tables.map(t => ({
    id: t.id,
    name: t.name,
    used: counts.get(t.id) ?? 0,
    limit: t.limit_seats || 0,
  }));
  const emptyTables = tableInfo.filter(t => t.used === 0).length;
  const nearCapacity: SeatingInsights['nearCapacity'] = [];
  const overCapacity: SeatingInsights['overCapacity'] = [];
  const underFilledTables: SeatingInsights['underFilledTables'] = [];
  const atCapacityTables: SeatingInsights['atCapacityTables'] = [];
  let totalCapacity = 0;
  for (const t of tableInfo) {
    if (t.limit) totalCapacity += t.limit;
    if (!t.limit) continue;
    if (t.used > t.limit) overCapacity.push({ name: t.name, used: t.used, limit: t.limit });
    else if (t.used === t.limit) atCapacityTables.push({ name: t.name, used: t.used, limit: t.limit });
    else if (t.used / t.limit >= 0.9) nearCapacity.push({ name: t.name, used: t.used, limit: t.limit });
    else if (t.used > 0 && t.used / t.limit <= 0.5) underFilledTables.push({ name: t.name, used: t.used, limit: t.limit });
  }
  const largestTables = [...tableInfo]
    .filter(t => t.used > 0)
    .sort((a, b) => b.used - a.used)
    .slice(0, 4)
    .map(t => ({ name: t.name, used: t.used, limit: t.limit }));

  const emptySeats = Math.max(0, totalCapacity - assigned);
  const completionPct = attending.length ? assigned / attending.length : 0;

  // Couples separated: primary + their plus-one at different tables
  const byId = new Map(guests.map(g => [g.id, g] as const));
  let couplesSeparated = 0;
  let couplesPairsConsidered = 0;
  for (const g of guests) {
    if (!g.added_by_guest_id) continue;
    const primary = byId.get(g.added_by_guest_id);
    if (!primary) continue;
    if (!primary.table_id || !g.table_id) continue;
    couplesPairsConsidered++;
    if (primary.table_id !== g.table_id) couplesSeparated++;
  }

  // Family splits: family_group spread across multiple tables (group size >= 3)
  const familyMap = new Map<string, { tables: Set<string>; total: number }>();
  for (const g of guests) {
    const fam = (g.family_group || '').trim();
    if (!fam || !g.table_id) continue;
    const entry = familyMap.get(fam) ?? { tables: new Set<string>(), total: 0 };
    entry.tables.add(g.table_id);
    entry.total++;
    familyMap.set(fam, entry);
  }
  const familySplits = Array.from(familyMap.entries())
    .filter(([, v]) => v.total >= 3 && v.tables.size > 1)
    .map(([name, v]) => ({ name, tableCount: v.tables.size, total: v.total }))
    .sort((a, b) => b.tableCount - a.tableCount)
    .slice(0, 4);

  return {
    assigned, unassigned, emptyTables, nearCapacity, overCapacity,
    attendingTotal: attending.length,
    totalTables: tables.length,
    totalCapacity,
    emptySeats,
    underFilledTables,
    atCapacityTables,
    largestTables,
    completionPct,
    couplesSeparated,
    couplesPairsConsidered,
    familySplits,
  };
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
