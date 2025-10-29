import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun, HeadingLevel, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { RunningSheet, RunningSheetItem } from '@/types/runningSheet';

export const exportRunningSheetToDocx = async (
  event: any,
  sheet: RunningSheet,
  items: RunningSheetItem[]
) => {
  const eventName = event.name || 'Event';
  const eventDate = event.date ? format(new Date(event.date), 'EEEE do MMMM yyyy') : '';
  const venueName = event.venue || 'Venue';
  const totalItems = items.length;
  const generatedDate = format(new Date(), 'dd/MM/yy');
  const generatedTime = format(new Date(), 'h:mm a');

  // Apply user settings for text sizing (convert pt to half-points for docx)
  const textSizeMap = { small: 24, medium: 28, large: 32 }; // 12pt, 14pt, 16pt
  const textSize = textSizeMap[sheet.all_text_size || 'medium'];
  const headerSize = textSizeMap[sheet.header_size || 'large'];
  const textFont = sheet.all_font || 'Inter';
  const headerFont = sheet.header_font || 'Inter';
  const textColor = sheet.all_text_color?.replace('#', '') || '000000';
  const headerColor = sheet.header_color?.replace('#', '') || '6D28D9';

  // Create header section
  const headerParagraphs = [
    new Paragraph({
      text: eventName,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: `Running Sheet – ${eventDate}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: `${venueName} – Total Items: ${totalItems} – Generated on: ${generatedDate} – Time: ${generatedTime}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];

  // Create table rows
  const tableRows: TableRow[] = [];
  let currentGroup = false;

  items.forEach((item, index) => {
    if (item.is_section_header) {
      currentGroup = true;
      
      // Section header row
      const text = typeof item.description_rich === 'object' && item.description_rich.text
        ? item.description_rich.text
        : item.description_rich || '';

      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: text,
                      bold: sheet.header_bold !== false,
                      italics: sheet.header_italic || false,
                      size: headerSize,
                      font: headerFont,
                      color: headerColor,
                    }),
                  ],
                }),
              ],
              columnSpan: sheet.show_responsible ? 3 : 2,
              shading: {
                fill: 'F4F4F5',
              },
              borders: {
                left: { style: BorderStyle.SINGLE, size: 6, color: headerColor },
                top: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
                bottom: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
                right: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
              },
            }),
          ],
        })
      );
    } else {
      // Regular row
      const rowShading = currentGroup ? 'FBFAFF' : (index % 2 === 0 ? 'FFFFFF' : 'FCFCFD');
      const indent = currentGroup ? 340 : 0;
      
      const descText = typeof item.description_rich === 'object' && item.description_rich.text
        ? item.description_rich.text
        : item.description_rich || '';

      const formatting = typeof item.description_rich === 'object' && item.description_rich.formatting
        ? item.description_rich.formatting
        : {};

      const cells = [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: item.time_text || '',
                  size: textSize,
                  font: textFont,
                  bold: sheet.all_bold || false,
                  italics: sheet.all_italic || false,
                  color: textColor,
                }),
              ],
              indent: { left: indent },
            }),
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: rowShading },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
            bottom: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
            left: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
            right: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
          },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: descText,
                  bold: formatting.bold || sheet.all_bold || false,
                  italics: formatting.italic || sheet.all_italic || false,
                  color: formatting.red ? 'D92D20' : textColor,
                  size: textSize,
                  font: textFont,
                }),
              ],
              indent: { left: indent },
            }),
          ],
          width: { size: 55, type: WidthType.PERCENTAGE },
          shading: { fill: rowShading },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
            bottom: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
            left: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
            right: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
          },
        }),
      ];

      if (sheet.show_responsible) {
        cells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: item.responsible || '',
                    size: textSize,
                    font: textFont,
                    bold: sheet.all_bold || false,
                    italics: sheet.all_italic || false,
                    color: textColor,
                  }),
                ],
                indent: { left: indent },
              }),
            ],
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: rowShading },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
              bottom: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
              left: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
              right: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
            },
          })
        );
      }

      tableRows.push(new TableRow({ children: cells }));
    }
    
    // Check if next item ends group
    const nextItem = items[index + 1];
    if (nextItem && nextItem.is_section_header) {
      currentGroup = false;
    }
  });

  // Create table
  const table = new Table({
    rows: tableRows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
      bottom: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
      left: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
      right: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1.5, color: 'EAEAEA' },
    },
  });

  // Create footer
  const footerParagraphs = [
    new Paragraph({
      text: '',
      spacing: { before: 400 },
    }),
    new Paragraph({
      text: 'Generated by Wedding Waitress',
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    }),
  ];

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 907, // 12mm
              bottom: 907, // 12mm
              left: 605, // 8mm
              right: 605, // 8mm
            },
          },
        },
        children: [...headerParagraphs, table, ...footerParagraphs],
      },
    ],
  });

  // Generate and save
  const blob = await Packer.toBlob(doc);
  const fileName = `${eventName}-Running-Sheet-${format(new Date(), 'yyyyMMdd')}.docx`;
  saveAs(blob, fileName);
};
