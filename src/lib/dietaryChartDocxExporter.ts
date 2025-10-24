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
  Footer,
} from 'docx';
import { saveAs } from 'file-saver';
import { computeRelationDisplay } from './relationUtils';

// Interface definitions
interface DietaryGuest {
  id: string;
  first_name: string;
  last_name: string;
  table_no: number | null;
  seat_no: number | null;
  dietary: string;
  relation_partner: string;
  relation_role: string;
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
  partner1_name?: string | null;
  partner2_name?: string | null;
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

// Helper to create TextRun with Inter font
const createTextRun = (options: {
  text: string;
  bold?: boolean;
  size?: number;
  color?: string;
}) => new TextRun({ font: 'Inter', ...options });

// Load dietary logo image
const loadDietaryLogo = async (): Promise<Uint8Array | null> => {
  try {
    const response = await fetch('/wedding-waitress-pdf-footer-logo.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('Failed to load dietary logo:', error);
    return null;
  }
};

// Get table column configuration based on settings with dynamic equal distribution
const getTableColumns = (settings: DietaryChartSettings) => {
  // Build array of active columns in order
  const columnHeaders: string[] = [
    'First Name',
    'Last Name',
    'Table',
  ];
  
  if (settings.showSeatNo) {
    columnHeaders.push('Seat');
  }
  
  columnHeaders.push('Dietary');
  
  if (settings.showMobile) {
    columnHeaders.push('Mobile');
  }
  
  if (settings.showRelation) {
    columnHeaders.push('Relation');
  }
  
  // Calculate equal widths
  const columnCount = columnHeaders.length;
  const baseWidth = Math.floor(100 / columnCount);
  const remainder = 100 - (baseWidth * columnCount);
  
  // Distribute widths evenly, adding remainder to first columns
  const columns = columnHeaders.map((header, index) => ({
    header,
    width: baseWidth + (index < remainder ? 1 : 0)
  }));
  
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
        createTextRun({
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
        createTextRun({
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
  event: Event,
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
            createTextRun({
              text: col.header,
              bold: true,
              size: fontSize,
            }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 20, after: 20 },
        }),
      ],
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.SINGLE, size: 16, color: '000000' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      width: { size: col.width, type: WidthType.PERCENTAGE },
    })
  );
  
  // Guest rows
  const guestRows = guests.map((guest, index) => {
    const cells: TableCell[] = [];
    let colIndex = 0;
    
    // First Name
    cells.push(
      new TableCell({
        children: [
          new Paragraph({
            children: [
              createTextRun({
                text: guest.first_name,
                bold: true,
                size: fontSize,
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
          }),
        ],
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB' },
          left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
        shading: { fill: index % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
        width: { size: columns[colIndex].width, type: WidthType.PERCENTAGE },
        margins: { top: 0, bottom: 0, left: 40, right: 40 },
      })
    );
    colIndex++;
    
    // Last Name
    cells.push(
      new TableCell({
        children: [
          new Paragraph({
            children: [
              createTextRun({
                text: guest.last_name || '-',
                bold: true,
                size: fontSize,
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
          }),
        ],
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB' },
          left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
        shading: { fill: index % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
        width: { size: columns[colIndex].width, type: WidthType.PERCENTAGE },
        margins: { top: 0, bottom: 0, left: 40, right: 40 },
      })
    );
    colIndex++;
    
    // Table
    cells.push(
      new TableCell({
        children: [
          new Paragraph({
            children: [
              createTextRun({
                text: guest.table_no ? String(guest.table_no) : '-',
                size: fontSize,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
          }),
        ],
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB' },
          left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
        shading: { fill: index % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
        width: { size: columns[colIndex].width, type: WidthType.PERCENTAGE },
        margins: { top: 0, bottom: 0, left: 40, right: 40 },
      })
    );
    colIndex++;
    
    // Seat (if enabled)
    if (settings.showSeatNo) {
      cells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [
                createTextRun({
                  text: guest.seat_no ? String(guest.seat_no) : '-',
                  size: fontSize,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
            }),
          ],
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB' },
            left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          },
          shading: { fill: index % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
          width: { size: columns[colIndex].width, type: WidthType.PERCENTAGE },
          margins: { top: 0, bottom: 0, left: 40, right: 40 },
        })
      );
      colIndex++;
    }
    
    // Dietary
    cells.push(
      new TableCell({
        children: [
          new Paragraph({
            children: [
              createTextRun({
                text: guest.dietary || '-',
                bold: true,
                size: fontSize,
                color: '6D28D9',
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
          }),
        ],
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB' },
          left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
        shading: { fill: index % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
        width: { size: columns[colIndex].width, type: WidthType.PERCENTAGE },
        margins: { top: 0, bottom: 0, left: 40, right: 40 },
      })
    );
    colIndex++;
    
    // Mobile (if enabled)
    if (settings.showMobile) {
      cells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [
                createTextRun({
                  text: guest.mobile || '-',
                  size: fontSize,
                }),
              ],
              alignment: AlignmentType.LEFT,
              spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
            }),
          ],
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB' },
            left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          },
          shading: { fill: index % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
          width: { size: columns[colIndex].width, type: WidthType.PERCENTAGE },
          margins: { top: 0, bottom: 0, left: 40, right: 40 },
        })
      );
      colIndex++;
    }
    
    // Relation (if enabled)
    if (settings.showRelation) {
      cells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [
                createTextRun({
                  text: computeRelationDisplay(
                    guest.relation_partner as any,
                    guest.relation_role as any,
                    event.partner1_name,
                    event.partner2_name,
                    []
                  ) || 'Guest',
                  size: fontSize,
                }),
              ],
              alignment: AlignmentType.LEFT,
              spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
            }),
          ],
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB' },
            left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          },
          shading: { fill: index % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
          width: { size: columns[colIndex].width, type: WidthType.PERCENTAGE },
          margins: { top: 0, bottom: 0, left: 40, right: 40 },
        })
      );
      colIndex++;
    }
    
    return new TableRow({ children: cells });
  });
  
  return new Table({
    rows: [
      new TableRow({ children: headerCells }),
      ...guestRows,
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
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
    const guestTable = createGuestTable(event, pageGuests, settings, fontSize);
    children.push(guestTable);
  }
  
  // Create footer with logo if enabled
  const footer = logoBuffer
    ? new Footer({
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: logoBuffer,
                transformation: {
                  height: 30,  // 10.5mm
                  width: 100,  // Maintain aspect ratio
                },
                type: 'png',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      })
    : undefined;

  // Create document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Inter',
          },
        },
      },
      paragraphStyles: [
        {
          id: 'eventName',
          name: 'Event Name',
          basedOn: 'Normal',
          run: {
            size: 32, // 16pt
            bold: true,
            color: '6D28D9',
            font: 'Inter',
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
        footers: footer ? { default: footer } : undefined,
        children,
      },
    ],
  });
  
  // Generate and save
  const blob = await Packer.toBlob(doc);
  const fileName = `kitchen-dietary-requirements-${event.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.docx`;
  saveAs(blob, fileName);
};
