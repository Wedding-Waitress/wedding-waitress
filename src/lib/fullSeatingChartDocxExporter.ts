import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Packer,
  ImageRun,
  BorderStyle,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign,
} from 'docx';
import { saveAs } from 'file-saver';

interface Guest {
  id: string;
  first_name: string;
  last_name: string | null;
  table_no: number | null;
  dietary: string | null;
  relation_display: string | null;
}

interface FullSeatingChartSettings {
  sortBy: 'firstName' | 'lastName' | 'tableNo';
  fontSize: 'small' | 'medium' | 'large';
  showDietary: boolean;
  showRsvp: boolean;
  showRelation: boolean;
  showLogo: boolean;
  paperSize: 'A4' | 'A3' | 'A2' | 'A1';
}

interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
}

// Convert font size setting to points (standardized to 10pt body text)
const getFontSize = (setting: 'small' | 'medium' | 'large'): number => {
  switch (setting) {
    case 'small': return 21; // 10.5pt (matches preview)
    case 'medium': return 24; // 12pt (matches preview)
    case 'large': return 27; // 13.5pt (matches preview)
  }
};

// Format date with ordinal suffix
const formatDateWithOrdinal = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate();
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  return `${dayName} ${ordinal(day)}, ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

// Format current timestamp
const formatGeneratedTimestamp = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// Format guest name based on sort setting
const formatGuestName = (guest: Guest, sortBy: 'firstName' | 'lastName' | 'tableNo'): string => {
  if (sortBy === 'lastName') {
    return `${guest.last_name || ''}, ${guest.first_name}`.trim();
  }
  return `${guest.first_name} ${guest.last_name || ''}`.trim();
};

// Format table assignment
const formatTableAssignment = (tableNo: number | null): string => {
  if (!tableNo) return 'Unassigned';
  return `Table ${tableNo}`;
};

// Load logo image as buffer
const loadLogoImage = async (): Promise<Uint8Array | null> => {
  try {
    const response = await fetch('/jpeg-2.jpg');
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('Failed to load logo:', error);
    return null;
  }
};

export const exportFullSeatingChartToDocx = async (
  event: Event,
  guests: Guest[],
  settings: FullSeatingChartSettings
): Promise<void> => {
  const guestsPerColumn = 10;
  const guestsPerPage = 20;
  const totalPages = Math.ceil(guests.length / guestsPerPage);
  const fontSize = getFontSize(settings.fontSize);
  const timestamp = formatGeneratedTimestamp();

  // Load logo if needed
  let logoBuffer: Uint8Array | null = null;
  if (settings.showLogo) {
    logoBuffer = await loadLogoImage();
  }

  const sections: (Paragraph | Table)[] = [];

  // Create pages
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const startIdx = (pageNum - 1) * guestsPerPage;
    const endIdx = Math.min(startIdx + guestsPerPage, guests.length);
    const pageGuests = guests.slice(startIdx, endIdx);

    // Split into two columns
    const col1Guests = pageGuests.slice(0, guestsPerColumn);
    const col2Guests = pageGuests.slice(guestsPerColumn);

    // Header - Event Name (16pt, bold, purple #6D28D9)
    sections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: event.name,
            bold: true,
            size: 32, // 16pt
            color: '6D28D9',
          }),
        ],
      })
    );

    // Header - Chart Title + Date (12pt, bold)
    sections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `Full Seating Chart - ${formatDateWithOrdinal(event.date)}`,
            bold: true,
            size: 24, // 12pt
          }),
        ],
      })
    );

    // Header - Venue/Stats Line (10pt)
    sections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        border: {
          bottom: {
            color: '000000',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
        children: [
          new TextRun({
            text: `${event.venue} - Total Guests: ${guests.length} - Page ${pageNum} of ${totalPages} - Generated on: ${timestamp}`,
            size: 20, // 10pt
          }),
        ],
      })
    );

    // Calculate guest ranges for column headers
    const col1Start = startIdx + 1;
    const col1End = startIdx + col1Guests.length;
    const col2Start = startIdx + col1Guests.length + 1;
    const col2End = endIdx;

    // Create table for two-column guest list
    const guestTableRows: TableRow[] = [];

    // Header row with column titles
    guestTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { after: 280 },
                children: [
                  new TextRun({
                    text: `GUESTS ${col1Start}-${col1End}`,
                    bold: true,
                    size: 22, // 11pt
                  }),
                ],
              }),
            ],
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
          }),
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { after: 280 },
                children: [
                  new TextRun({
                    text: col2Guests.length > 0 ? `GUESTS ${col2Start}-${col2End}` : '',
                    bold: true,
                    size: 22, // 11pt
                  }),
                ],
              }),
            ],
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
          }),
        ],
      })
    );

    // Helper function to build guest paragraphs with stacked layout
    const buildGuestParagraphs = (guest: Guest | undefined): Paragraph[] => {
      if (!guest) return [new Paragraph({ text: '' })];
      
      const paragraphs: Paragraph[] = [];
      const hasDietary = settings.showDietary && guest.dietary && guest.dietary !== 'NA';
      const hasRelation = settings.showRelation && guest.relation_display;
      
      // Main row: checkbox + name + table
      paragraphs.push(
        new Paragraph({
          spacing: { after: hasDietary || hasRelation ? 60 : 160 },
          children: [
            new TextRun({ text: '◯ ', size: fontSize, color: '6D28D9' }),
            new TextRun({ text: formatGuestName(guest, settings.sortBy), size: fontSize, bold: true }),
            new TextRun({ text: '    ', size: fontSize }),
            new TextRun({ text: formatTableAssignment(guest.table_no), bold: true, size: fontSize })
          ]
        })
      );
      
      // Dietary row (if enabled and exists)
      if (hasDietary) {
        paragraphs.push(
          new Paragraph({
            spacing: { after: hasRelation ? 60 : 160 },
            indent: { left: 360 },
            children: [
              new TextRun({ 
                text: `Dietary: ${guest.dietary}`, 
                size: fontSize - 4, 
                color: '666666' 
              })
            ]
          })
        );
      }
      
      // Relation row (if enabled and exists)
      if (hasRelation) {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 160 },
            indent: { left: 360 },
            children: [
              new TextRun({ 
                text: guest.relation_display, 
                size: fontSize - 4, 
                color: '666666' 
              })
            ]
          })
        );
      }
      
      return paragraphs;
    };

    // Guest data rows
    const maxRows = Math.max(col1Guests.length, col2Guests.length);
    for (let i = 0; i < maxRows; i++) {
      const guest1 = col1Guests[i];
      const guest2 = col2Guests[i];

      // Build paragraphs for both columns
      const leftParagraphs = buildGuestParagraphs(guest1);
      const rightParagraphs = buildGuestParagraphs(guest2);

      guestTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 48, type: WidthType.PERCENTAGE },
              children: leftParagraphs,
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
              },
              verticalAlign: VerticalAlign.TOP,
            }),
            new TableCell({
              width: { size: 48, type: WidthType.PERCENTAGE },
              children: rightParagraphs,
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
              },
              verticalAlign: VerticalAlign.TOP,
            }),
          ],
        })
      );
    }

    // Add the table to sections
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: guestTableRows,
        columnWidths: [4800, 4800], // Equal column widths
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
        },
      })
    );

    // Footer - Logo (if enabled)
    if (settings.showLogo && logoBuffer) {
      sections.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [
            new ImageRun({
              type: 'jpg',
              data: logoBuffer,
              transformation: {
                width: 132, // 35mm ≈ 132 points
                height: 40,  // 10.5mm ≈ 40 points
              },
            }),
          ],
        })
      );
    }

    // Page break (except on last page)
    if (pageNum < totalPages) {
      sections.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }
  }

  // Create document with A4 narrow margins (1.27cm = 482 DXA units)
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 482,    // 1.27cm
              right: 482,  // 1.27cm
              bottom: 482, // 1.27cm
              left: 482,   // 1.27cm
              header: 482, // 1.27cm
              footer: 482, // 1.27cm
            },
          },
        },
        children: sections,
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const fileName = `${event.name.replace(/[^a-zA-Z0-9]/g, '_')}-Full-Seating-Chart-${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, fileName);
};
