/** Read the existing CSV/Excel import formats without losing quoted fields or phone zeroes. */
export async function readGuestImportFile(data: ArrayBuffer, filename: string): Promise<string[][]> {
  const XLSX = await import('xlsx-js-style');
  const workbook = /\.csv$/i.test(filename)
    ? XLSX.read(new TextDecoder().decode(data), { type: 'string', raw: true })
    : XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1, raw: false, defval: '', blankrows: false,
  }).map(row => row.map(value => String(value ?? '').trim()));
}
