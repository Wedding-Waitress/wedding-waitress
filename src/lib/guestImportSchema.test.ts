import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx-js-style';
import { GUEST_FILE_COLUMNS, GUEST_TEMPLATE_COLUMNS, prepareGuestImport } from './guestImportSchema';
import { createGuestImportWorkbook } from './guestImportWorkbook';
import { readGuestImportFile } from './guestImportFile';
const table = { id: 'table', name: 'Garden Room', table_no: 3, limit_seats: 8 };
const options = { eventId: 'event', tables: [table], existing: [], partner1Name: 'Carla', partner2Name: 'Kallum', customRoles: ['Friend'] };
const headers = GUEST_FILE_COLUMNS.map(([label]) => label);
const guest = (overrides: Record<string, string> = {}) => {
  const row: Record<string, string> = { first_name: 'Alex', last_name: 'Smith', mobile: '+61412345678', email: 'alex@example.com', mailing_address: '1 Example St', mailing_suburb: 'Sydney', mailing_state: 'NSW', mailing_postcode: '0200', allow_plus_one: 'No', rsvp: 'Attending', table_name: table.name, seat_no: '2', relation_partner: 'Carla', relation_role: 'Friend', dietary: 'Vegan', family_group: 'Smith Family', notes: 'Hello, "friend"\nSecond line', ...overrides };
  return GUEST_FILE_COLUMNS.map(([, field]) => row[field] || '');
};
describe('guest template and importer contract', () => {
  it('round trips a filled downloaded Excel template including every editable field', async () => {
    const workbook = await createGuestImportWorkbook(options.tables);
    expect(workbook.SheetNames).toEqual(['Template', 'Instructions']);
    expect(await readGuestImportFile(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }), 'blank-template.xlsx')).toEqual([GUEST_TEMPLATE_COLUMNS.map(([label]) => label)]);
    expect(GUEST_TEMPLATE_COLUMNS.map(([label]) => label)).not.toContain('+ Guest');
    expect(GUEST_TEMPLATE_COLUMNS.map(([label]) => label)).toEqual(['First Name', 'Last Name', 'Mobile', 'Email', 'Address', 'Suburb', 'State', 'Postcode', 'Table Name', 'Seat No']);
    const fullRow = guest();
    const templateRow = GUEST_TEMPLATE_COLUMNS.map(([, field]) => fullRow[GUEST_FILE_COLUMNS.findIndex(([, f]) => f === field)]);
    XLSX.utils.sheet_add_aoa(workbook.Sheets.Template, [templateRow], { origin: 'A2' });
    const lines = await readGuestImportFile(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }), 'filled-template.xlsx');
    const result = prepareGuestImport(lines, options);
    expect(result.errors).toEqual([]); expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ event_id: 'event', table_id: 'table', table_no: 3, seat_no: 2, assigned: true, mailing_postcode: '0200', address_received: true, allow_plus_one: true, rsvp: 'Pending', family_group: null, relation_partner: '', relation_role: '', dietary: 'None' });
    expect(result.rows[0]).not.toHaveProperty('table_name');
  });
  it('imports the same filled template saved as CSV with commas and multiline notes', async () => {
    const sheet = XLSX.utils.aoa_to_sheet([headers, guest()]);
    const csv = XLSX.utils.sheet_to_csv(sheet);
    const lines = await readGuestImportFile(new TextEncoder().encode(csv).buffer, 'guests.csv');
    const result = prepareGuestImport(lines, options);
    expect(result.errors).toEqual([]); expect(result.rows[0].mailing_postcode).toBe('0200');
    expect(result.rows[0].notes).toContain('\nSecond line');
  });
  it('accepts old template headers and legacy choices', () => {
    const result = prepareGuestImport([['First Name', 'Last Name', 'Table Name', 'Seat No', 'RSVP', 'Dietary', 'Relation Partner', 'Relation Role'], ['Alex', 'Smith', 'Garden Room', '1', 'Pending', 'NA', 'partner_one', 'father']], options);
    expect(result.errors).toEqual([]); expect(result.rows[0]).toMatchObject({ dietary: 'None', relation_role: 'father', allow_plus_one: true });
  });
  it('accepts case, spacing, internal fields and dashboard Table No aliases', () => {
    const result = prepareGuestImport([[' first_name ', ' LAST NAME ', 'Table No', 'RSVP Status'], ['Alex', 'Smith', '3', 'attending']], options);
    expect(result.errors).toEqual([]); expect(result.rows[0]).toMatchObject({ table_id: 'table', rsvp: 'Attending', address_received: false });
  });
  it('lists actual event tables and omits placeholder guests from the download', async () => {
    const workbook = await createGuestImportWorkbook([table]);
    const guide = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets.Instructions, { header: 1 });
    expect(guide.some(row => row[0] === 'Garden Room')).toBe(true);
    const reopened = XLSX.read(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }), { type: 'array', cellNF: true });
    expect(reopened.Sheets.Template.C2.z).toBe('@'); expect(reopened.Sheets.Template.H2.z).toBe('@');
  });
  it('reports unknown tables and invalid seats instead of creating unusable seating', () => {
    expect(prepareGuestImport([headers, guest({ table_name: 'Missing' })], options).errors.some(e => e.field === 'table_name')).toBe(true);
    for (const seat of ['0', '1.5', '9', 'abc']) expect(prepareGuestImport([headers, guest({ seat_no: seat })], options).rows).toEqual([]);
  });
  it('rejects occupied seats and duplicate seats inside the same upload', () => {
    const occupied = prepareGuestImport([headers, guest()], { ...options, existing: [{ first_name: 'Other', last_name: 'Person', table_id: 'table', seat_no: 2 }] });
    expect(occupied.errors.some(e => e.field === 'seat_no')).toBe(true);
    const repeated = prepareGuestImport([headers, guest(), guest({ first_name: 'Jane' })], options);
    expect(repeated.rows).toHaveLength(1); expect(repeated.errors[0].rowIndex).toBe(3);
  });
  it('rejects existing guests and duplicates without overwriting any data', () => {
    expect(prepareGuestImport([headers, guest()], { ...options, existing: [{ first_name: 'Alex', last_name: 'Smith' }] }).rows).toHaveLength(0);
    expect(prepareGuestImport([headers, guest(), guest({ seat_no: '3' })], options).rows).toHaveLength(1);
  });
  it('accepts blank optional fields with the documented defaults', () => {
    const result = prepareGuestImport([['First Name', 'Last Name', 'Table Name'], ['Alex', 'Smith', table.name]], options);
    expect(result.errors).toEqual([]); expect(result.rows[0]).toMatchObject({ seat_no: null, rsvp: 'Pending', dietary: 'None', allow_plus_one: true, family_group: null });
  });
  it.each([{ allow_plus_one: 'maybe' }, { email: 'bad' }, { relation_partner: '' }, { rsvp: 'unknown' }, { dietary: 'x'.repeat(201) }, { mobile: 'abc' }])('reports invalid input: %j', override => {
    const result = prepareGuestImport([headers, guest(override)], options);
    expect(result.rows).toEqual([]); expect(result.errors.length).toBeGreaterThan(0);
  });
  it('rejects missing and duplicate column mappings with a clear error', () => {
    expect(() => prepareGuestImport([['First Name']], options)).toThrow('Last Name');
    expect(() => prepareGuestImport([['First Name', 'Last Name', 'Table Name', 'Table No']], options)).toThrow('Two columns');
  });
});

it.each([
  ['Coming', 'Attending'], [' YES ', 'Attending'], ['going', 'Attending'], ['Confirmed', 'Attending'],
  ['Not Coming', 'Not Attending'], ['No', 'Not Attending'], ["can't come", 'Not Attending'],
  ['Not Going', 'Not Attending'], ['Declined', 'Not Attending'], ['Maybe', 'Pending'], ['Unsure', 'Pending'], ['', 'Pending'],
])('imports RSVP %s as %s', (input, expected) => {
  const result = prepareGuestImport([headers, guest({ rsvp: input })], options);
  expect(result.errors).toEqual([]); expect(result.rows[0].rsvp).toBe(expected);
});

it.each([
  { first_name: 'Existing', last_name: null },
  { first_name: null, last_name: 'Existing' },
  { first_name: null, last_name: null },
])('imports alongside legacy guest records with nullable names: %j', existing => {
  const result = prepareGuestImport([headers, guest()], { ...options, existing: [existing] });
  expect(result.errors).toEqual([]); expect(result.rows).toHaveLength(1);
});

it('retains custom dietary wording when an exported guest file is imported', () => {
  const result = prepareGuestImport([headers, guest({ dietary: 'Mushroom allergy — no mushrooms' })], options);
  expect(result.errors).toEqual([]); expect(result.rows[0].dietary).toBe('Mushroom allergy — no mushrooms');
});
