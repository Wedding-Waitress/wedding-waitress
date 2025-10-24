/**
 * Place Cards Word (.docx) Exporter
 * 
 * Generates Microsoft Word documents for place cards with:
 * - A4 paper size (210mm × 297mm)
 * - Narrow margins (1.27cm) using docx library
 * - Native docx rendering (no image conversion)
 * - 2×3 grid layout (6 cards per page)
 * - Standard 105mm × 99mm foldable place cards
 */

import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak } from 'docx';
import { saveAs } from 'file-saver';
import { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { Guest } from '@/hooks/useGuests';

/**
 * Convert hex color to RGB object
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Generate a single place card as table cells
 */
const createPlaceCardCell = (
  guest: Guest,
  settings: PlaceCardSettings
): TableCell => {
  const tableInfo = guest.table_no && guest.seat_no
    ? `Table ${guest.table_no}, Seat ${guest.seat_no}`
    : `Table —, Seat —`;

  const individualMessage = settings.individual_messages?.[guest.id];
  const message = individualMessage || settings.mass_message || '';

  // Convert font sizes from pt to half-points
  const guestNameSize = (settings.guest_name_font_size || 24) * 2;
  const infoSize = (settings.info_font_size || 12) * 2;

  // Guest name paragraph
  const guestNameParagraph = new Paragraph({
    children: [
      new TextRun({
        text: `${guest.first_name} ${guest.last_name}`,
        font: settings.guest_font_family || 'Inter',
        size: guestNameSize,
        bold: settings.guest_name_bold || false,
        italics: settings.guest_name_italic || false,
        underline: settings.guest_name_underline ? {} : undefined,
        color: settings.font_color?.replace('#', '') || '000000',
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: (settings.name_spacing || 4) * 28.35 }, // mm to DXA
  });

  // Table/seat info paragraph
  const tableInfoParagraph = new Paragraph({
    children: [
      new TextRun({
        text: tableInfo,
        font: settings.info_font_family || 'Inter',
        size: infoSize,
        color: settings.font_color?.replace('#', '') || '000000',
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 100 },
  });

  // Message paragraph (if exists) - will appear upside down when card is folded
  const messageParagraph = message ? new Paragraph({
    children: [
      new TextRun({
        text: message,
        font: settings.info_font_family || 'Inter',
        size: 22, // 11pt
        color: settings.font_color?.replace('#', '') || '000000',
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
  }) : undefined;

  // Build cell children
  const cellChildren: Paragraph[] = [];
  
  if (messageParagraph) {
    cellChildren.push(messageParagraph);
  }
  
  // Add spacing for fold line
  cellChildren.push(
    new Paragraph({ text: '', spacing: { before: 400, after: 400 } })
  );
  
  cellChildren.push(guestNameParagraph);
  cellChildren.push(tableInfoParagraph);

  return new TableCell({
    children: cellChildren,
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: {
      fill: settings.background_color?.replace('#', '') || 'FFFFFF',
    },
    verticalAlign: 'center' as any,
    margins: {
      top: 283, // 8mm in DXA
      bottom: 283,
      left: 283,
      right: 283,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    },
  });
};

/**
 * Create empty placeholder cell
 */
const createEmptyCell = (): TableCell => {
  return new TableCell({
    children: [new Paragraph({ text: '' })],
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: { fill: 'FFFFFF' },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
  });
};

/**
 * Export a single place cards page to Word document
 */
export const exportPlaceCardPageToDocx = async (
  settings: PlaceCardSettings | null,
  guests: Guest[],
  event: any,
  pageIndex: number
): Promise<void> => {
  const currentSettings = settings || {
    event_id: '',
    user_id: '',
    font_family: 'Inter',
    font_color: '#000000',
    background_color: '#ffffff',
    background_image_url: null,
    background_image_type: 'none' as const,
    mass_message: '',
    individual_messages: {},
    guest_font_family: 'Inter',
    info_font_family: 'Inter',
    guest_name_bold: false,
    guest_name_italic: false,
    guest_name_underline: false,
    guest_name_font_size: 24,
    info_font_size: 12,
    name_spacing: 4
  };

  // Sort guests by table and seat number
  const sortedGuests = [...guests].sort((a, b) => {
    const tableA = a.table_no || 0;
    const tableB = b.table_no || 0;
    if (tableA !== tableB) return tableA - tableB;
    const seatA = a.seat_no || 0;
    const seatB = b.seat_no || 0;
    return seatA - seatB;
  });

  // Get 6 guests for this page
  const startIndex = pageIndex * 6;
  const pageGuests = sortedGuests.slice(startIndex, startIndex + 6);

  // Create 3 rows × 2 columns table
  const rows: TableRow[] = [];
  
  for (let row = 0; row < 3; row++) {
    const leftIndex = row * 2;
    const rightIndex = row * 2 + 1;
    
    const leftGuest = pageGuests[leftIndex];
    const rightGuest = pageGuests[rightIndex];
    
    rows.push(
      new TableRow({
        children: [
          leftGuest ? createPlaceCardCell(leftGuest, currentSettings) : createEmptyCell(),
          rightGuest ? createPlaceCardCell(rightGuest, currentSettings) : createEmptyCell(),
        ],
        height: { value: 3732, rule: 'exact' }, // 99mm in DXA
      })
    );
  }

  const cardsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });

  // Create document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: 11906,  // 210mm
            height: 16838, // 297mm
          },
          margin: {
            top: 482,    // 1.27cm
            right: 482,
            bottom: 482,
            left: 482,
          },
        },
      },
      children: [cardsTable],
    }],
  });

  // Generate and save
  const blob = await Packer.toBlob(doc);
  const sanitizedName = event.name.replace(/[^a-z0-9]/gi, '-');
  const fileName = `${sanitizedName}-Place-Cards-Page-${pageIndex + 1}.docx`;
  saveAs(blob, fileName);
};

/**
 * Export all place cards pages to a single multi-page Word document
 */
export const exportAllPlaceCardsToDocx = async (
  settings: PlaceCardSettings | null,
  guests: Guest[],
  event: any,
  totalPages: number
): Promise<void> => {
  const currentSettings = settings || {
    event_id: '',
    user_id: '',
    font_family: 'Inter',
    font_color: '#000000',
    background_color: '#ffffff',
    background_image_url: null,
    background_image_type: 'none' as const,
    mass_message: '',
    individual_messages: {},
    guest_font_family: 'Inter',
    info_font_family: 'Inter',
    guest_name_bold: false,
    guest_name_italic: false,
    guest_name_underline: false,
    guest_name_font_size: 24,
    info_font_size: 12,
    name_spacing: 4
  };

  // Sort guests
  const sortedGuests = [...guests].sort((a, b) => {
    const tableA = a.table_no || 0;
    const tableB = b.table_no || 0;
    if (tableA !== tableB) return tableA - tableB;
    const seatA = a.seat_no || 0;
    const seatB = b.seat_no || 0;
    return seatA - seatB;
  });

  const allChildren: (Table | Paragraph)[] = [];

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    // Add page break if not first page
    if (pageIndex > 0) {
      allChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // Get 6 guests for this page
    const startIndex = pageIndex * 6;
    const pageGuests = sortedGuests.slice(startIndex, startIndex + 6);

    // Create 3 rows × 2 columns table
    const rows: TableRow[] = [];
    
    for (let row = 0; row < 3; row++) {
      const leftIndex = row * 2;
      const rightIndex = row * 2 + 1;
      
      const leftGuest = pageGuests[leftIndex];
      const rightGuest = pageGuests[rightIndex];
      
      rows.push(
        new TableRow({
          children: [
            leftGuest ? createPlaceCardCell(leftGuest, currentSettings) : createEmptyCell(),
            rightGuest ? createPlaceCardCell(rightGuest, currentSettings) : createEmptyCell(),
          ],
          height: { value: 3732, rule: 'exact' }, // 99mm in DXA
        })
      );
    }

    allChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows,
      })
    );
  }

  // Create document with all pages
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: 11906,
            height: 16838,
          },
          margin: {
            top: 482,
            right: 482,
            bottom: 482,
            left: 482,
          },
        },
      },
      children: allChildren,
    }],
  });

  // Generate and save
  const blob = await Packer.toBlob(doc);
  const sanitizedName = event.name.replace(/[^a-z0-9]/gi, '-');
  const fileName = `${sanitizedName}-Place-Cards-All.docx`;
  saveAs(blob, fileName);
};
