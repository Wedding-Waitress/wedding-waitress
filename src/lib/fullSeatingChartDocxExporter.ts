import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Packer,
  ImageRun,
  BorderStyle,
  PageBreak,
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

// Convert font size setting to points
const getFontSize = (setting: 'small' | 'medium' | 'large'): number => {
  switch (setting) {
    case 'small': return 21; // 10.5pt = 21 half-points
    case 'medium': return 24; // 12pt = 24 half-points
    case 'large': return 27; // 13.5pt = 27 half-points
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

  const sections: Paragraph[] = [];

  // Create pages
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const startIdx = (pageNum - 1) * guestsPerPage;
    const endIdx = Math.min(startIdx + guestsPerPage, guests.length);
    const pageGuests = guests.slice(startIdx, endIdx);

    // Split into two columns
    const col1Guests = pageGuests.slice(0, guestsPerColumn);
    const col2Guests = pageGuests.slice(guestsPerColumn);

    // Header - Event Name (24pt, bold, purple)
    sections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: event.name,
            bold: true,
            size: 48, // 24pt
            color: '7C3AED',
          }),
        ],
      })
    );

    // Header - Chart Title + Date (16pt, bold)
    sections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: `Full Seating Chart - ${formatDateWithOrdinal(event.date)}`,
            bold: true,
            size: 32, // 16pt
          }),
        ],
      })
    );

    // Header - Venue/Stats Line (11pt)
    sections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
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
            size: 22, // 11pt
          }),
        ],
      })
    );

    // Column Headers
    const col1Start = startIdx + 1;
    const col1End = startIdx + col1Guests.length;
    const col2Start = startIdx + col1Guests.length + 1;
    const col2End = endIdx;

    sections.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `GUESTS ${col1Start}-${col1End}`,
            bold: true,
            size: 22, // 11pt
          }),
          new TextRun({
            text: '                              ', // Spacing between columns
          }),
          new TextRun({
            text: col2Guests.length > 0 ? `GUESTS ${col2Start}-${col2End}` : '',
            bold: true,
            size: 22, // 11pt
          }),
        ],
      })
    );

    // Guest rows (side by side)
    const maxRows = Math.max(col1Guests.length, col2Guests.length);
    for (let i = 0; i < maxRows; i++) {
      const guest1 = col1Guests[i];
      const guest2 = col2Guests[i];

      // Build left column content
      const leftContent: TextRun[] = [];
      if (guest1) {
        leftContent.push(
          new TextRun({
            text: '☐ ',
            size: fontSize,
          }),
          new TextRun({
            text: formatGuestName(guest1, settings.sortBy),
            size: fontSize,
          }),
          new TextRun({
            text: ' ',
            size: fontSize,
          }),
          new TextRun({
            text: formatTableAssignment(guest1.table_no),
            bold: true,
            size: fontSize - 2,
          })
        );

        if (settings.showDietary && guest1.dietary) {
          leftContent.push(
            new TextRun({
              text: ` | ${guest1.dietary}`,
              size: fontSize - 4,
              color: '666666',
            })
          );
        }

        if (settings.showRelation && guest1.relation_display) {
          leftContent.push(
            new TextRun({
              text: ` | ${guest1.relation_display}`,
              size: fontSize - 4,
              color: '666666',
            })
          );
        }
      }

      // Add spacing between columns
      leftContent.push(new TextRun({ text: '          ' }));

      // Build right column content
      const rightContent: TextRun[] = [];
      if (guest2) {
        rightContent.push(
          new TextRun({
            text: '☐ ',
            size: fontSize,
          }),
          new TextRun({
            text: formatGuestName(guest2, settings.sortBy),
            size: fontSize,
          }),
          new TextRun({
            text: ' ',
            size: fontSize,
          }),
          new TextRun({
            text: formatTableAssignment(guest2.table_no),
            bold: true,
            size: fontSize - 2,
          })
        );

        if (settings.showDietary && guest2.dietary) {
          rightContent.push(
            new TextRun({
              text: ` | ${guest2.dietary}`,
              size: fontSize - 4,
              color: '666666',
            })
          );
        }

        if (settings.showRelation && guest2.relation_display) {
          rightContent.push(
            new TextRun({
              text: ` | ${guest2.relation_display}`,
              size: fontSize - 4,
              color: '666666',
            })
          );
        }
      }

      sections.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [...leftContent, ...rightContent],
        })
      );
    }

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
