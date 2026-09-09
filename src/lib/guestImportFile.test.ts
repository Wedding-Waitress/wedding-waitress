import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx-js-style';
import { readGuestImportFile } from './guestImportFile';

describe('guest import files', () => {
  it('reads quoted commas, escaped quotes and multiline notes without splitting guests', async () => {
    const csv = 'First Name,Last Name,Mobile,Notes\r\nTest,Guest,0411569505,"Hello, ""guest""\nsecond line"\r\n';
    expect(await readGuestImportFile(new TextEncoder().encode(csv).buffer, 'guests.csv')).toEqual([
      ['First Name', 'Last Name', 'Mobile', 'Notes'],
      ['Test', 'Guest', '0411569505', 'Hello, "guest"\nsecond line'],
    ]);
  });

  it('reads the Excel template format with numeric seats and text phone numbers', async () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['First Name', 'Last Name', 'Seat No', 'Mobile'],
      ['Test', 'Guest', 2, '0411569505'],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Template');
    expect(await readGuestImportFile(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }), 'guests.xlsx'))
      .toEqual([['First Name', 'Last Name', 'Seat No', 'Mobile'], ['Test', 'Guest', '2', '0411569505']]);
  });

  it('ignores empty rows', async () => {
    expect(await readGuestImportFile(new TextEncoder().encode('First Name,Last Name\n\nTest,Guest\n').buffer, 'guests.csv'))
      .toEqual([['First Name', 'Last Name'], ['Test', 'Guest']]);
  });
});
