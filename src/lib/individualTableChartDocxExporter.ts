/**
 * Individual Table Chart Word (.docx) Exporter
 * 
 * Exports seating charts to Microsoft Word format with A4 narrow margins (1.27cm).
 * Supports single table and all tables export with embedded table visualizations.
 */

import { Document, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, WidthType, PageBreak, BorderStyle, Packer } from 'docx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { Guest } from '@/hooks/useGuests';
import { TableWithGuestCount } from '@/hooks/useTables';
import { IndividualChartSettings } from '@/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage';
import { generateIndividualTableSVG } from './individualTableChartEngine';

// Font size conversion (pt to half-points) - standardized to 10pt body
const getFontSize = (setting: 'small' | 'medium' | 'large'): number => {
  switch (setting) {
    case 'small': return 18;  // 9pt
    case 'medium': return 20; // 10pt
    case 'large': return 22;  // 11pt
  }
};

// Date formatting with ordinal suffix
const formatDateWithOrdinal = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate();
  const ordinalSuffix = getOrdinalSuffix(day);
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  const year = date.getFullYear();
  return `${weekday} ${day}${ordinalSuffix}, ${month} ${year}`;
};

const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// Timestamp formatting
const formatGeneratedTimestamp = (): string => {
  const now = new Date();
  const date = now.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: '2-digit' 
  });
  const time = now.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  });
  return `${date} Time: ${time}`;
};

// Load Wedding Waitress logo
const loadTableLogo = async (): Promise<Uint8Array | null> => {
  try {
    const response = await fetch('/wedding-waitress-new-logo.png');
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('Failed to load table logo:', error);
    return null;
  }
};

// Convert SVG to PNG for embedding in Word
const convertSvgToImage = async (svgString: string): Promise<Uint8Array> => {
  const container = document.createElement('div');
  container.innerHTML = svgString;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '794px';  // A4 width at 96 DPI
  container.style.height = '1123px'; // A4 height at 96 DPI
  document.body.appendChild(container);
  
  try {
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });
    
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    document.body.removeChild(container);
  }
};

// Generate guest list columns for Word document
const generateGuestListColumns = (
  sortedGuests: Guest[],
  settings: IndividualChartSettings,
  fontSize: number
): { leftColumn: Paragraph[], rightColumn: Paragraph[] } => {
  const leftColumn: Paragraph[] = [];
  const rightColumn: Paragraph[] = [];
  
  sortedGuests.forEach((guest, index) => {
    const guestNumber = `${index + 1}. `;
    const guestName = `${guest.first_name} ${guest.last_name}`;
    const dietaryText = settings.includeDietary && guest.dietary && guest.dietary !== 'NA' 
      ? ` - ${guest.dietary}` 
      : '';
    
    const textRuns: TextRun[] = [
      new TextRun({ text: guestNumber + guestName, bold: true, size: fontSize }),
    ];
    
    if (dietaryText) {
      textRuns.push(new TextRun({ 
        text: dietaryText, 
        bold: true, 
        color: '22c55e', 
        size: fontSize 
      }));
    }
    
    const paragraph = new Paragraph({
      children: textRuns,
      spacing: { before: 100, after: 100 },
    });
    
    if (index % 2 === 0) {
      leftColumn.push(paragraph);
    } else {
      rightColumn.push(paragraph);
    }
  });
  
  return { leftColumn, rightColumn };
};

// Create header section for a table chart
const createHeaderSection = (
  event: any,
  totalTables: number,
  currentTableIndex: number
): Paragraph[] => {
  const timestamp = formatGeneratedTimestamp();
  const formattedDate = event?.date ? formatDateWithOrdinal(event.date) : '';
  
  return [
    // Event Name (purple #6D28D9, bold, 16pt)
    new Paragraph({
      children: [
        new TextRun({
          text: event?.name || 'Event',
          bold: true,
          size: 32, // 16pt
          color: '6D28D9',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    
    // Title with Date (12pt, bold)
    new Paragraph({
      children: [
        new TextRun({
          text: `Table Seating Arrangements – ${formattedDate}`,
          bold: true,
          size: 24, // 12pt
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    
    // Venue and Stats (10pt)
    new Paragraph({
      children: [
        new TextRun({
          text: `${event?.venue || 'Venue'} – Total Tables: ${totalTables} – Page ${currentTableIndex} of ${totalTables} – Generated on: ${timestamp}`,
          size: 20, // 10pt
        }),
      ],
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
    }),
  ];
};

// Export single table to Word
export const exportIndividualTableChartToDocx = async (
  settings: IndividualChartSettings,
  table: TableWithGuestCount,
  guests: Guest[],
  event: any
): Promise<void> => {
  const fontSize = getFontSize(settings.fontSize);
  const tableGuests = guests.filter(guest => guest.table_id === table.id);
  const sortedGuests = tableGuests.sort((a, b) => (a.seat_no || 0) - (b.seat_no || 0));
  
  // Generate table settings with correct title
  const tableSettings = {
    ...settings,
    title: `TABLE ${table.table_no || 'Unknown'}`,
    totalTables: 1,
    currentTableIndex: 1
  };
  
  // Generate SVG and convert to image
  const svgContent = generateIndividualTableSVG(tableSettings, table, tableGuests, event);
  const imageBuffer = await convertSvgToImage(svgContent);
  
  // Load logo if needed
  let logoBuffer: Uint8Array | null = null;
  if (settings.showLogo) {
    logoBuffer = await loadTableLogo();
  }
  
  // Build document sections
  const sections: (Paragraph | Table)[] = [];
  
  // Add header
  sections.push(...createHeaderSection(event, 1, 1));
  
  // Add spacing
  sections.push(new Paragraph({ text: '', spacing: { after: 400 } }));
  
  // Add table visualization as image (500px × 450px)
  sections.push(
    new Paragraph({
      children: [
        new ImageRun({
          data: imageBuffer,
          transformation: {
            width: 472,  // 500px → ~472pt for Word
            height: 425, // 450px → ~425pt for Word
          },
          type: 'png',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );
  
  // Add guest list if enabled
  if (settings.includeGuestList && sortedGuests.length > 0) {
    // Section title
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Guests on this Table & Meal Selection',
            bold: true,
            size: 32, // 16pt
            underline: {},
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 300 },
      })
    );
    
    // Two-column guest list
    const { leftColumn, rightColumn } = generateGuestListColumns(sortedGuests, settings, fontSize);
    
    const guestListTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: leftColumn.length > 0 ? leftColumn : [new Paragraph({ text: '' })],
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
              },
            }),
            new TableCell({
              children: rightColumn.length > 0 ? rightColumn : [new Paragraph({ text: '' })],
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
              },
            }),
          ],
        }),
      ],
    });
    
    sections.push(guestListTable);
  }
  
  // Add logo if enabled
  if (settings.showLogo && logoBuffer) {
    sections.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: {
              width: 150,  // Auto-scale width to maintain aspect ratio
              height: 45,  // 12mm ≈ 45pt
            },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
      })
    );
  }
  
  // Create document
  const doc = new Document({
    sections: [{
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
      children: sections,
    }],
  });
  
  // Format event name: capitalize each word, single hyphen
  const formatEventNameForFile = (name: string): string => {
    return name
      .split(/[^a-zA-Z0-9]+/)
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('-');
  };
  
  // Generate and save
  const blob = await Packer.toBlob(doc);
  const eventName = formatEventNameForFile(event?.name || 'Event');
  const tableIdentifier = table.table_no ?? table.name;
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const fileName = `${eventName}-Table-${tableIdentifier}-Seating-Chart-${date}.docx`;
  saveAs(blob, fileName);
};

// Export all tables to Word
export const exportAllTablesChartToDocx = async (
  settings: IndividualChartSettings,
  tables: TableWithGuestCount[],
  guests: Guest[],
  event: any
): Promise<void> => {
  const fontSize = getFontSize(settings.fontSize);
  const totalTables = tables.length;
  
  // Load logo once if needed
  let logoBuffer: Uint8Array | null = null;
  if (settings.showLogo) {
    logoBuffer = await loadTableLogo();
  }
  
  // Build all sections (one per table)
  const allSections: (Paragraph | Table)[] = [];
  
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const tableGuests = guests.filter(guest => guest.table_id === table.id);
    const sortedGuests = tableGuests.sort((a, b) => (a.seat_no || 0) - (b.seat_no || 0));
    
    // Add page break if not first table
    if (i > 0) {
      allSections.push(new Paragraph({ children: [new PageBreak()] }));
    }
    
    // Generate table settings with correct title
    const tableSettings = {
      ...settings,
      title: `TABLE ${table.table_no || 'Unknown'}`,
      totalTables: totalTables,
      currentTableIndex: i + 1
    };
    
    // Generate SVG and convert to image
    const svgContent = generateIndividualTableSVG(tableSettings, table, tableGuests, event);
    const imageBuffer = await convertSvgToImage(svgContent);
    
    // Add header
    allSections.push(...createHeaderSection(event, totalTables, i + 1));
    
    // Add spacing
    allSections.push(new Paragraph({ text: '', spacing: { after: 400 } }));
    
    // Add table visualization as image (500px × 450px)
    allSections.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: imageBuffer,
            transformation: {
              width: 472,  // 500px → ~472pt for Word
              height: 425, // 450px → ~425pt for Word
            },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
    
    // Add guest list if enabled
    if (settings.includeGuestList && sortedGuests.length > 0) {
      // Section title
      allSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Guests on this Table & Meal Selection',
              bold: true,
              size: 32, // 16pt
              underline: {},
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 300 },
        })
      );
      
      // Two-column guest list
      const { leftColumn, rightColumn } = generateGuestListColumns(sortedGuests, settings, fontSize);
      
      const guestListTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: leftColumn.length > 0 ? leftColumn : [new Paragraph({ text: '' })],
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
              }),
              new TableCell({
                children: rightColumn.length > 0 ? rightColumn : [new Paragraph({ text: '' })],
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
              }),
            ],
          }),
        ],
      });
      
      allSections.push(guestListTable);
    }
    
    // Add logo if enabled
    if (settings.showLogo && logoBuffer) {
      allSections.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: {
                width: 150,  // Auto-scale width to maintain aspect ratio
                height: 45,  // 12mm ≈ 45pt
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
    sections: [{
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
      children: allSections,
    }],
  });
  
  // Format event name: capitalize each word, single hyphen
  const formatEventNameForFile = (name: string): string => {
    return name
      .split(/[^a-zA-Z0-9]+/)
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('-');
  };
  
  // Generate and save
  const blob = await Packer.toBlob(doc);
  const eventName = formatEventNameForFile(event?.name || 'Event');
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const fileName = `${eventName}-All-Tables-Seating-Charts-${date}.docx`;
  saveAs(blob, fileName);
};
