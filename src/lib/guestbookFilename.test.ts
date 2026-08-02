import { describe, it, expect } from 'vitest';
import { guestbookMessageFilename, guestbookCsvFilename, guestbookSeqLabel, guestbookMessageTxt } from './guestbookFilename';

describe('guestbook filenames', () => {
  it('pads sequence to five digits', () => {
    expect(guestbookSeqLabel(1)).toBe('00001');
    expect(guestbookSeqLabel(123)).toBe('00123');
    expect(guestbookSeqLabel(null)).toBe('');
  });

  it('builds txt filename with safe event name', () => {
    expect(guestbookMessageFilename(1, "Jason & Linda's Wedding")).toBe('00001-Jason-and-Lindas-Wedding-Guestbook.txt');
    expect(guestbookMessageFilename(3, 'Jason and Lindas Wedding')).toBe('00003-Jason-and-Lindas-Wedding-Guestbook.txt');
  });

  it('builds csv filename', () => {
    expect(guestbookCsvFilename("Jason & Linda's Wedding")).toBe('Guestbook-Jason-and-Lindas-Wedding.csv');
  });

  it('includes message details in txt body', () => {
    const txt = guestbookMessageTxt({ seq: 2, name: 'Ana', message: 'Congrats!', at: '2026-01-02T03:04:05Z', status: 'approved' }, 'My Event');
    expect(txt).toContain('Message Number: 00002');
    expect(txt).toContain('Guest Name: Ana');
    expect(txt).toContain('Congrats!');
    expect(txt).toContain('Status: Approved');
  });
});
