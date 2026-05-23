import jsPDF from 'jspdf';
import type { GuestSongRequestRow, SongRequestStatus } from '@/hooks/useGuestSongRequests';

interface ExportOptions {
  rows: GuestSongRequestRow[];
  eventName: string;
  eventDate: string | null;
}

const STATUS_COLOR: Record<SongRequestStatus, [number, number, number]> = {
  pending: [180, 130, 30],
  approved: [40, 130, 60],
  rejected: [180, 50, 50],
};

const STATUS_LABEL: Record<SongRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const exportGuestSongRequestsToPDF = async ({ rows, eventName, eventDate }: ExportOptions) => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  let y = margin;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(40, 40, 40);
  pdf.text('Guest Song Requests', margin, y);
  y += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(90, 90, 90);
  pdf.text(eventName, margin, y);
  y += 5;
  if (eventDate) {
    pdf.text(`Event date: ${eventDate}`, margin, y);
    y += 5;
  }
  pdf.text(`Total requests: ${rows.length}`, margin, y);
  y += 8;

  pdf.setDrawColor(150, 122, 89);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  if (rows.length === 0) {
    pdf.setFontSize(11);
    pdf.setTextColor(120, 120, 120);
    pdf.text('No guest song requests have been submitted yet.', margin, y);
  }

  rows.forEach((r, idx) => {
    ensureSpace(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(30, 30, 30);
    const title = r.song_title || 'Untitled song';
    const artist = r.artist_name ? `  —  ${r.artist_name}` : '';
    const titleLines = pdf.splitTextToSize(`${idx + 1}. ${title}${artist}`, pageWidth - 2 * margin - 35);
    pdf.text(titleLines, margin, y);

    const [sr, sg, sb] = STATUS_COLOR[r.status];
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(sr, sg, sb);
    pdf.text(STATUS_LABEL[r.status].toUpperCase(), pageWidth - margin, y, { align: 'right' });

    y += titleLines.length * 5 + 1;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(110, 110, 110);
    pdf.text(`Requested by ${r.guest_name || 'Guest'}  ·  ${new Date(r.created_at).toLocaleString()}`, margin, y);
    y += 4;

    if (r.music_link) {
      ensureSpace(6);
      pdf.setTextColor(60, 90, 160);
      const linkLines = pdf.splitTextToSize(`Link: ${r.music_link}`, pageWidth - 2 * margin);
      pdf.text(linkLines, margin, y);
      y += linkLines.length * 4;
    }

    if (r.note) {
      ensureSpace(6);
      pdf.setTextColor(70, 70, 70);
      pdf.setFont('helvetica', 'italic');
      const noteLines = pdf.splitTextToSize(`Note: ${r.note}`, pageWidth - 2 * margin);
      pdf.text(noteLines, margin, y);
      y += noteLines.length * 4;
      pdf.setFont('helvetica', 'normal');
    }

    y += 3;
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 4;
  });

  const safeName = (eventName || 'event').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60);
  pdf.save(`Guest_Song_Requests_${safeName}.pdf`);
};
