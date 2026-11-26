import { GUEST_TEMPLATE_COLUMNS, type GuestImportTable } from './guestImportSchema';
export async function createGuestImportWorkbook(tables: GuestImportTable[]) {
  const XLSX = await import('xlsx-js-style');
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([GUEST_TEMPLATE_COLUMNS.map(([label]) => label)]);
  sheet['!cols'] = GUEST_TEMPLATE_COLUMNS.map(([label]) => ({ wch: Math.max(18, label.length + 3) }));
  GUEST_TEMPLATE_COLUMNS.forEach(([label, field], column) => {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: column })];
    cell.s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '38261C' } }, alignment: { wrapText: true } };
    if (field === 'mobile' || field === 'mailing_postcode') {
      for (let row = 1; row <= 500; row++) sheet[XLSX.utils.encode_cell({ r: row, c: column })] = { t: 's', v: '', z: '@' };
    }
  });
  // Include preformatted phone/postcode cells in the saved Excel range.
  sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 500, c: GUEST_TEMPLATE_COLUMNS.length - 1 } });
  sheet['!rows'] = [{ hpt: 32 }];
  XLSX.utils.book_append_sheet(workbook, sheet, 'Template');
  const instructions = [
    ['Guest List Import', 'How to fill in the Template sheet'],
    ['Getting started', 'One row per guest. Fill in the first sheet; save as Excel (.xlsx) or CSV. Do not upload this Instructions sheet.'],
    ['Required fields', 'First Name, Last Name and Table Name. All other fields are optional.'],
    ['Table Name', 'Use an existing table from the list below. Create tables in the dashboard before importing.'],
    ['Seat No', 'Optional whole number within table capacity. Leave blank if not allocated; do not reuse an occupied seat.'],
    ['Mobile', 'Use an international number including + and country code, for example +61412345678. Keep this column as text.'],
    ['Address', 'Enter the mailing street address, suburb, state and postcode in their separate columns. Postcode is text.'],
    ['App-managed fields', 'Set relationships, dietary requirements, family groups, notes, + Guest permission and RSVP Status in the dashboard after import. New imports start with Pending RSVP and additional guests allowed. Actions and invitation delivery stay in the app. Importing does not send invitations.'],
    ['Existing guests', 'Import adds guests; it does not overwrite existing names. Duplicate names and occupied seats are reported for review.'],
    [], ['Available Table Name', 'Seat capacity'], ...tables.map(t => [t.name, t.limit_seats]),
  ];
  const guide = XLSX.utils.aoa_to_sheet(instructions);
  guide['!cols'] = [{ wch: 26 }, { wch: 100 }];
  guide['!rows'] = instructions.map(row => ({ hpt: Math.max(24, Math.ceil(String(row[1] || '').length / 90) * 18) }));
  for (const address of Object.keys(guide).filter(key => !key.startsWith('!'))) guide[address].s = { font: { name: 'Calibri', sz: 11, bold: address.startsWith('A') }, alignment: { wrapText: true, vertical: 'top' } };
  XLSX.utils.book_append_sheet(workbook, guide, 'Instructions');
  return workbook;
}
