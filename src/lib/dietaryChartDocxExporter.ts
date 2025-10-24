import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  ImageRun,
  PageBreak,
  Packer,
} from 'docx';
import { saveAs } from 'file-saver';

// Interface definitions
interface DietaryGuest {
  id: string;
  first_name: string;
  last_name: string;
  table_no: number | null;
  seat_no: number | null;
  dietary: string;
  relation_display: string;
  mobile: string | null;
}

interface DietaryChartSettings {
  sortBy: 'firstName' | 'lastName' | 'tableNo';
  fontSize: 'small' | 'medium' | 'large';
  showMobile: boolean;
  showRelation: boolean;
  showSeatNo: boolean;
  showLogo: boolean;
  paperSize: 'A4' | 'A3' | 'A2' | 'A1';
}

interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
}

// Helper function to convert font size setting to half-points
const getFontSize = (setting: 'small' | 'medium' | 'large'): number => {
  switch (setting) {
    case 'small': return 21;  // 10.5pt
    case 'medium': return 24; // 12pt
    case 'large': return 27;  // 13.5pt
  }
};

// Helper function to get ordinal suffix for day
const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// Format date with ordinal (e.g., "Sunday, 23rd, November 2025")
const formatDateWithOrdinal = (dateString: string): string => {
  const date = new Date(dateString);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const ordinal = getOrdinalSuffix(day);
  
  return `${dayName}, ${day}${ordinal}, ${month} ${year}`;
};

// Format current timestamp (e.g., "24/10/2025 Time: 4:55 PM")
const formatGeneratedTimestamp = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${day}/${month}/${year} Time: ${displayHours}:${minutes} ${ampm}`;
};

// Load dietary logo image
const loadDietaryLogo = async (): Promise<Uint8Array | null> => {
  try {
    const response = await fetch('/wedding-waitress-dietary-logo.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('Failed to load dietary logo:', error);
    return null;
  }
};

// Get table column configuration based on settings
const getTableColumns = (settings: DietaryChartSettings) => {
  const columns: Array<{ header: string; width: number }> = [
    { header: 'First Name', width: 18 },
    { header: 'Last Name', width: 16 },
    { header: 'Table', width: settings.showSeatNo ? 8 : 10 },
  ];
  
  if (settings.showSeatNo) {
    columns.push({ header: 'Seat', width: 8 });
  }
  
  let dietaryWidth = 48;
  if (settings.showMobile && settings.showRelation) {
    dietaryWidth = 30;
  } else if (settings.showMobile || settings.showRelation) {
    dietaryWidth = 36;
  }
  
  columns.push({ header: 'Dietary', width: dietaryWidth });
  
  if (settings.showMobile) {
    columns.push({ header: 'Mobile', width: 12 });
  }
  
  if (settings.showRelation) {
    columns.push({ header: 'Relation', width: 14 });
  }
  
  return columns;
};

// Create header section for a page
const createHeaderSection = (
  event: Event,
  totalGuests: number,
  pageNum: number,
  totalPages: number,
  timestamp: string
): Paragraph[] => {
  const formattedDate = formatDateWithOrdinal(event.date);
  
  return [
    // Event name
    new Paragraph({
      text: event.name,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      style: 'eventName',
    }),
    
    // Chart title with date (12pt, bold)
    new Paragraph({
      children: [
        new TextRun({
          text: `Kitchen Dietary Requirements - ${formattedDate}`,
          bold: true,
          size: 24, // 12pt
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    
    // Venue and stats line (10pt)
    new Paragraph({
      children: [
        new TextRun({
          text: `${event.venue || 'No Venue Set'} - Total Dietary Guests: ${totalGuests} - Page ${pageNum} of ${totalPages} - Generated on: ${timestamp}`,
          size: 20, // 10pt
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      border: {
        bottom: {
          color: '000000',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    }),
  ];
};

// Create guest table rows
const createGuestTable = (
  guests: DietaryGuest[],
  settings: DietaryChartSettings,
  fontSize: number
): Table => {
  const columns = getTableColumns(settings);
  
  // Header row
  const headerCells = columns.map(col => 
    new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: col.header,
              bold: true,
              size: fontSize,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 20 },
        }),
      ],
      shading: { fill: 'F3F4F6' },
      width: { size: col.width, type: WidthType.PERCENTAGE },
    })
  );
  
  // Guest rows
  const guestRows = guests.map((guest, index) => {
    const cells: TableCell[] = [];
    
    // First Name
    cells.push(
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: guest.first_name,
                bold: true,
                size: fontSize,
              }),
            ],
            spacing: { before: 80, after: 80 },
          }),
        ],
        shading: { fill: index % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
      })
    );
    
    // Last Name
    cells.push(
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: guest.last_name,
                bold: true,
                size: fontSize,
              }),
            ],
            spacing: { before: 80, after: 80 },
          }),
        ],
        shading: { fill: index % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
      })
    );
    
    // Table
    cells.push(
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: guest.table_no ? String(guest.table_no) : '-',
                size: fontSize,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 80 },
          }),
        ],
        shading: { fill: index % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
      })
    );
    
    // Seat (if enabled)
    if (settings.showSeatNo) {
      cells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: guest.seat_no ? String(guest.seat_no) : '-',
                  size: fontSize,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
            }),
          ],
          shading: { fill: index % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
        })
      );
    }
    
    // Dietary
    cells.push(
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: guest.dietary || '-',
                bold: true,
                size: fontSize,
                color: '6D28D9',
              }),
            ],
            spacing: { before: 80, after: 80 },
          }),
        ],
        shading: { fill: index % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
      })
    );
    
    // Mobile (if enabled)
    if (settings.showMobile) {
      cells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: guest.mobile || '-',
                  size: fontSize,
                }),
              ],
              spacing: { before: 80, after: 80 },
            }),
          ],
          shading: { fill: index % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
        })
      );
    }
    
    // Relation (if enabled)
    if (settings.showRelation) {
      cells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: guest.relation_display || 'Guest',
                  size: fontSize,
                }),
              ],
              spacing: { before: 80, after: 80 },
            }),
          ],
          shading: { fill: index % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
        })
      );
    }
    
    return new TableRow({ children: cells });
  });
  
  return new Table({
    rows: [
      new TableRow({ children: headerCells }),
      ...guestRows,
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
};

// Main export function
export const exportDietaryChartToDocx = async (
  event: Event,
  guests: DietaryGuest[],
  settings: DietaryChartSettings
): Promise<void> => {
  const guestsPerPage = 20;
  const totalPages = Math.ceil(guests.length / guestsPerPage);
  const fontSize = getFontSize(settings.fontSize);
  const timestamp = formatGeneratedTimestamp();
  
  // Load logo if needed
  let logoBuffer: Uint8Array | null = null;
  if (settings.showLogo) {
    logoBuffer = await loadDietaryLogo();
  }
  
  const children: (Paragraph | Table)[] = [];
  
  // Create pages
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    // Add page break if not first page
    if (pageNum > 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
    
    const startIdx = (pageNum - 1) * guestsPerPage;
    const endIdx = Math.min(startIdx + guestsPerPage, guests.length);
    const pageGuests = guests.slice(startIdx, endIdx);
    
    // Add header
    const headerParagraphs = createHeaderSection(event, guests.length, pageNum, totalPages, timestamp);
    children.push(...headerParagraphs);
    
    // Add guest table
    const guestTable = createGuestTable(pageGuests, settings, fontSize);
    children.push(guestTable);
    
    // Add footer logo (if enabled and buffer loaded)
    if (logoBuffer) {
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: {
                height: 30, // 10.5mm in points (approximately)
                width: 90,  // Auto width to maintain aspect ratio
              },
              type: 'png',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
        })
      );
    }
  }
  
  // Create document
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'eventName',
          name: 'Event Name',
          basedOn: 'Normal',
          run: {
            size: 32, // 16pt
            bold: true,
            color: '6D28D9',
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,  // 210mm in twentieths of a point
              height: 16838, // 297mm in twentieths of a point
            },
            margin: {
              top: 482,    // 1.27cm in twentieths of a point
              right: 482,
              bottom: 482,
              left: 482,
            },
          },
        },
        children,
      },
    ],
  });
  
  // Generate and save
  const blob = await Packer.toBlob(doc);
  const fileName = `kitchen-dietary-requirements-${event.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.docx`;
  saveAs(blob, fileName);
};
