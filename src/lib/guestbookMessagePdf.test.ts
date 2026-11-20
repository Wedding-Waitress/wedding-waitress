import { describe, expect, it } from 'vitest';
import { wrapGuestbookText, guestbookEventDate } from './guestbookMessagePdf';
import { guestbookPdfFilename, guestbookCsvFilename, guestbookSeqLabel } from './guestbookFilename';

describe('individual guestbook PDF content', () => {
  it('uses simple PDF numbering and includes the event date without changing CSV', () => {
    expect(guestbookPdfFilename(5, "Matt & Emma's Wedding", '2026-11-20')).toBe('05-Matt-and-Emmas-Wedding-20-11-2026-Guestbook.pdf');
    expect(guestbookPdfFilename(123, 'Wedding', '2026-11-20')).toMatch(/^123-/);
    expect(guestbookPdfFilename(null, 'Wedding')).toBe('Wedding-Date-not-set-Guestbook.pdf');
    expect(guestbookSeqLabel(5)).toBe('00005');
    expect(guestbookCsvFilename('Wedding')).toBe('Guestbook-Wedding.csv');
  });
  it('preserves paragraphs and splits unbroken strings without losing emoji graphemes', () => {
    const measure = (s: string) => Array.from(s).length;
    const text = 'Congratulations José! 👩🏽‍❤️‍👨🏻\n\n' + 'abcdefghij'.repeat(100) + ' END';
    const lines = wrapGuestbookText(text, 30, measure);
    expect(lines.join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''));
    expect(lines).toContain('');
    expect(lines.some(line => line.includes('👩🏽‍❤️‍👨🏻'))).toBe(true);
    expect(lines.every(line => measure(line) <= 30)).toBe(true);
    expect(lines.at(-1)).toContain('END');
  });
  it('formats date-only events locally and handles missing or invalid dates', () => {
    expect(guestbookEventDate('2026-11-20')).toBe('20 November 2026');
    expect(guestbookEventDate('not-a-date')).toBe('');
    expect(guestbookEventDate(null)).toBe('');
  });
});
