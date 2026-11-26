import { normalizeGuestPhone } from './guestPhone';
import { normalizePartner, normalizeRole, type ImportError } from './relationValidation';
import { getAllRoleOptions } from './relationUtils';
import { normalizeRsvp } from './rsvp';
import { secureGuestSchema } from './security/validation';

export const GUEST_FILE_COLUMNS = [
  ['First Name', 'first_name'], ['Last Name', 'last_name'], ['Mobile', 'mobile'], ['Email', 'email'],
  ['Address', 'mailing_address'], ['Suburb', 'mailing_suburb'], ['State', 'mailing_state'], ['Postcode', 'mailing_postcode'],
  ['+ Guest', 'allow_plus_one'], ['RSVP Status', 'rsvp'], ['Table Name', 'table_name'], ['Seat No', 'seat_no'],
  ['Relation Partner', 'relation_partner'], ['Relation Role', 'relation_role'], ['Dietary Requirements', 'dietary'],
  ['Family Group', 'family_group'], ['Notes', 'notes'],
] as const;
export const GUEST_TEMPLATE_COLUMNS = GUEST_FILE_COLUMNS.filter(([, field]) => ['first_name', 'last_name', 'mobile', 'email', 'mailing_address', 'mailing_suburb', 'mailing_state', 'mailing_postcode', 'table_name', 'seat_no'].includes(field));
const key = (value: string | null | undefined) => (value ?? '').replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[ _-]+/g, ' ');
const aliases: Record<string, string> = Object.fromEntries(GUEST_FILE_COLUMNS.flatMap(([label, field]) => [[key(label), field], [key(field), field]]));
Object.assign(aliases, { rsvp: 'rsvp', dietary: 'dietary', 'table no': 'table_name', 'table number': 'table_name', 'seat number': 'seat_no', '+ guest allowed': 'allow_plus_one', 'plus one': 'allow_plus_one' });
export const normalizeGuestImportHeader = (header: string) => aliases[key(header)] || '';
const IMPORT_RSVP_ALIASES: Record<string, string> = {
  coming: 'Attending', 'will attend': 'Attending',
  'not coming': 'Not Attending', 'not going': 'Not Attending',
  "can't come": 'Not Attending', 'cannot come': 'Not Attending',
  "can't attend": 'Not Attending', 'cannot attend': 'Not Attending',
};
const PENDING_RSVP_ALIASES = ['pending', 'maybe', 'unsure', 'not sure', 'awaiting reply'];
const DIETARY = ['None', 'Kids Meal', 'Pescatarian', 'Vegetarian', 'Vegan', 'Seafood Free', 'Gluten Free', 'Dairy Free', 'Nut Free', 'Halal', 'Kosha', 'Vendor'];
export interface GuestImportTable { id: string; name: string; table_no?: number | null; limit_seats: number }
export interface GuestImportRow extends Record<string, any> { event_id: string; first_name: string; last_name: string }
export interface GuestImportExisting { first_name: string | null; last_name: string | null; table_id?: string | null; seat_no?: number | null }
export function prepareGuestImport(lines: string[][], options: {
  eventId: string; tables: GuestImportTable[]; existing: GuestImportExisting[];
  partner1Name?: string | null; partner2Name?: string | null; customRoles?: string[];
}) {
  const headers = (lines[0] || []).map(normalizeGuestImportHeader);
  for (const required of ['first_name', 'last_name', 'table_name']) {
    if (!headers.includes(required)) throw new Error('Missing required column: ' + GUEST_FILE_COLUMNS.find(([, field]) => field === required)?.[0]);
  }
  const mapped = headers.filter(Boolean);
  if (new Set(mapped).size !== mapped.length) throw new Error('Two columns refer to the same guest field. Keep only one of each column.');
  const names = new Set(options.existing.map(g => key(g.first_name) + '|' + key(g.last_name)));
  const seats = new Set(options.existing.filter(g => g.table_id && g.seat_no).map(g => g.table_id + ':' + g.seat_no));
  const errors: ImportError[] = [];
  const rows: GuestImportRow[] = [];
  const dataRows = lines.slice(1).filter(row => row.some(value => value.trim()));
  for (const [index, values] of dataRows.entries()) {
    const row: Record<string, any> = {};
    headers.forEach((field, i) => { if (field) row[field] = (values[i] || '').trim(); });
    const fail = (field: string, reason: string) => { errors.push({ rowIndex: index + 2, field, value: row[field] || '', reason }); };
    const before = errors.length;
    if (!row.first_name) fail('first_name', 'First name is required');
    if (!row.last_name) fail('last_name', 'Last name is required');
    const name = key(row.first_name || '') + '|' + key(row.last_name || '');
    if (names.has(name)) fail('first_name', 'Guest already exists in this event or is duplicated in this file');
    const matches = options.tables.filter(t => key(t.name) === key(row.table_name || '') || key('Table ' + t.name) === key(row.table_name || '') || (t.table_no != null && String(t.table_no) === row.table_name));
    const table = matches.length === 1 ? matches[0] : undefined;
    if (!table) fail('table_name', matches.length > 1 ? 'Table name is ambiguous. Use its exact name.' : 'Use an existing table name from this event (see the template Instructions sheet).');
    const seat = row.seat_no ? Number(row.seat_no) : null;
    if (seat !== null && (!Number.isInteger(seat) || seat < 1 || (table && seat > table.limit_seats))) fail('seat_no', 'Seat number must be a whole number within the selected table capacity');
    if (table && seat !== null && seats.has(table.id + ':' + seat)) fail('seat_no', 'This seat is already occupied or used earlier in this file');
    try { row.mobile = normalizeGuestPhone(row.mobile); } catch (error) { fail('mobile', (error as Error).message); }
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) fail('email', 'Enter a valid email address or leave it blank');
    const rawRsvp = key(row.rsvp || 'Pending').replace(/’/g, "'");
    const rsvp = IMPORT_RSVP_ALIASES[rawRsvp] || normalizeRsvp(rawRsvp);
    if (rsvp === 'Pending' && !PENDING_RSVP_ALIASES.includes(rawRsvp)) {
      fail('rsvp', 'Use Attending / Yes / Coming, Not Attending / No / Not Coming, or Pending / Maybe');
    }
    row.rsvp = rsvp;
    row.dietary = !row.dietary || ['na', 'n/a'].includes(key(row.dietary)) ? 'None' : DIETARY.find(v => key(v) === key(row.dietary)) || row.dietary;
    const dietaryValue = secureGuestSchema.shape.dietary.safeParse(row.dietary);
    if (!dietaryValue.success) fail('dietary', 'Dietary requirements must be 200 characters or fewer');
    else row.dietary = dietaryValue.data;
    const plus = key(row.allow_plus_one || 'Yes');
    if (!['yes', 'no', 'true', 'false', '1', '0', 'on', 'off'].includes(plus)) fail('allow_plus_one', 'Use Yes or No for + Guest permission');
    row.allow_plus_one = ['yes', 'true', '1', 'on'].includes(plus);
    const rawPartner = row.relation_partner || '';
    let partner = normalizePartner(rawPartner);
    if (!partner && rawPartner) {
      const named = [options.partner1Name, options.partner2Name].map(n => !!n && key(n) === key(rawPartner));
      if (named.filter(Boolean).length === 1) partner = named[0] ? 'partner_one' : 'partner_two';
    }
    const rawRole = row.relation_role || '';
    const role = normalizeRole(rawRole) || getAllRoleOptions(options.customRoles).find(r => key(r.value) === key(rawRole) || key(r.label) === key(rawRole))?.value;
    if (rawPartner || rawRole) {
      if (!partner) fail('relation_partner', 'Use Partner 1, Partner 2 or the matching event partner name');
      if (!role) fail('relation_role', 'Use a relationship role listed in the template Instructions sheet');
    }
    if (errors.length !== before) continue;
    names.add(name); if (table && seat !== null) seats.add(table.id + ':' + seat);
    Object.assign(row, { event_id: options.eventId, table_id: table!.id, table_no: table!.table_no ?? null, seat_no: seat, assigned: true,
      relation_partner: partner || '', relation_role: role || '', family_group: row.family_group || null,
      address_received: !![row.mailing_address, row.mailing_suburb, row.mailing_state, row.mailing_postcode].some(Boolean) });
    delete row.table_name;
    rows.push(row as GuestImportRow);
  }
  return { rows, errors, total: dataRows.length };
}
