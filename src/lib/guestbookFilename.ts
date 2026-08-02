// Digital Guestbook download naming.
// Written guestbook messages download as: 00001-Event-Name-Guestbook.txt
// Combined CSV export is named:            Guestbook-Event-Name.csv
// Independent from shared photo/video sequences and from Audio Guestbook recordings.
import { safeEventName } from './sharedPhotoFilename';

export function guestbookSeqLabel(seq: number | null | undefined): string {
  if (typeof seq !== 'number' || !Number.isFinite(seq) || seq <= 0) return '';
  return String(Math.floor(seq)).padStart(5, '0');
}

export function guestbookMessageFilename(
  seq: number | null | undefined,
  eventName: string | null | undefined,
): string {
  const num = guestbookSeqLabel(seq) || '00000';
  return `${num}-${safeEventName(eventName)}-Guestbook.txt`;
}

export function guestbookCsvFilename(eventName: string | null | undefined): string {
  return `Guestbook-${safeEventName(eventName)}.csv`;
}

export interface GuestbookTxtSource {
  seq?: number | null;
  name?: string | null;
  message: string;
  at?: string | null;
  status?: string | null;
  hasRecording?: boolean;
}

export function guestbookMessageTxt(
  r: GuestbookTxtSource,
  eventName: string | null | undefined,
): string {
  const d = r.at ? new Date(r.at) : null;
  const lines = [
    `Message Number: ${guestbookSeqLabel(r.seq) || '—'}`,
    `Event: ${eventName || '—'}`,
    `Guest Name: ${r.name || 'Anonymous guest'}`,
    `Date: ${d ? d.toLocaleDateString() : '—'}`,
    `Time: ${d ? d.toLocaleTimeString() : '—'}`,
    `Status: ${r.status === 'hidden' ? 'Hidden' : 'Approved'}`,
    `Attached Recording: ${r.hasRecording ? 'Yes' : 'No'}`,
    '',
    'Message:',
    r.message,
    '',
  ];
  return lines.join('\r\n');
}
