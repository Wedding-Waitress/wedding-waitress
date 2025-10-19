/**
 * ============================================================================
 * FINALIZED COMPONENT - DO NOT MODIFY WITHOUT OWNER APPROVAL
 * ============================================================================
 * 
 * This component generates PDF exports for Full Seating Charts with exact
 * measurements and spacing that have been carefully calibrated.
 * 
 * CRITICAL MEASUREMENTS (DO NOT CHANGE):
 * - Logo size: 35mm × 10.5mm
 * - Logo position: margin - 2mm
 * - Gap after logo: 22mm
 * - Gap after header line: 9mm
 * - Gap after guest count header: 10mm (increased from 5mm)
 * - Guests per column: 10
 * - Guests per page: 20 (2 columns)
 * - Page margins: 12mm
 * 
 * FONT SIZE MAPPINGS:
 * - small: 10.5pt (guest names), 9pt (details)
 * - medium: 12pt (guest names), 10.5pt (details)
 * - large: 13.5pt (guest names), 12pt (details)
 * 
 * LAYOUT FEATURES:
 * - Multi-page support with automatic pagination
 * - Professional header on each page
 * - Two-column layout with proper spacing
 * - Optional dietary and relationship information
 * - Dynamic filename with event name and date
 * 
 * Last modified: 2025-10-08
 * Owner approval required for any changes
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Progress } from '@/components/ui/progress';
import { Download, FileText, Loader2 } from 'lucide-react';
import { Guest } from '@/hooks/useGuests';
import { FullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { normalizeRsvp } from '@/lib/rsvp';
import jsPDF from 'jspdf';

interface FullSeatingChartExporterProps {
  event: any;
  guests: Guest[];
  settings: FullSeatingChartSettings;
  onClose: () => void;
  onExportStart: () => void;
  onExportEnd: () => void;
}

export const FullSeatingChartExporter: React.FC<FullSeatingChartExporterProps> = ({
  event,
  guests,
  settings,
  onClose,
  onExportStart,
  onExportEnd
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const formatGuestName = (guest: Guest) => {
    if (settings.sortBy === 'lastName') {
      return `${guest.last_name || ''}, ${guest.first_name}`.trim();
    }
    return `${guest.first_name} ${guest.last_name || ''}`.trim();
  };

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const formatDateWithOrdinal = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const ordinal = getOrdinalSuffix(day);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const year = date.getFullYear();
      return `${weekday} ${day}${ordinal}, ${month} ${year}`;
    } catch {
      return dateString;
    }
  };

  const exportToPDF = async () => {
    try {
      setIsExporting(true);
      onExportStart();
      setProgress(10);

      // Get paper dimensions based on settings
      const paperFormats: Record<'A4' | 'A3' | 'A2' | 'A1', [number, number]> = {
        'A4': [210, 297],
        'A3': [297, 420],
        'A2': [420, 594],
        'A1': [594, 841]
      };

      const [pageWidth, pageHeight] = paperFormats[settings.paperSize];

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: settings.paperSize.toLowerCase() as 'a4' | 'a3' | 'a2' | 'a1'
      });
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      const columnGap = 10;
      const columnWidth = contentWidth / 2 - columnGap / 2; // gap between columns
      const footerReserved = 80; // space reserved for footer + bottom margin (mm)

      setProgress(25);

      // Fixed pagination: 10 guests per column (20 per page)
      const GUESTS_PER_COLUMN = 10;
      const GUESTS_PER_PAGE = GUESTS_PER_COLUMN * 2; // 20 total
      
      // Split guests into pages
      const pages: { leftColumn: Guest[], rightColumn: Guest[], pageNum: number, totalPages: number }[] = [];
      const totalPages = Math.ceil(guests.length / GUESTS_PER_PAGE);
      
      for (let i = 0; i < guests.length; i += GUESTS_PER_PAGE) {
        const pageGuests = guests.slice(i, i + GUESTS_PER_PAGE);
        const col1Count = Math.min(GUESTS_PER_COLUMN, pageGuests.length);
        pages.push({
          leftColumn: pageGuests.slice(0, col1Count),
          rightColumn: pageGuests.slice(col1Count),
          pageNum: pages.length + 1,
          totalPages
        });
      }

      // Helpers
      const drawHeader = (pageInfo: { leftColumn: Guest[], rightColumn: Guest[], pageNum: number, totalPages: number }, startGuestNum: number) => {
        // Start content positioning (reduced top margin: 8mm instead of 12mm)
        let y = 8;
        
        // Event name
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(139, 92, 246); // Purple color
        pdf.text(event.name, pageWidth / 2, y, { align: 'center' });
        y += 6;

        // Date with "Full Seating Chart -" prefix
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        if (event.date) {
          pdf.text(`Full Seating Chart - ${formatDateWithOrdinal(event.date)}`, pageWidth / 2, y, { align: 'center' });
          y += 6;
        }
        
        // Venue + Stats + Page + Generated on one line (with black line below)
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        const statsLine = `${event.venue || ''} - Total Guests: ${guests.length} - Page ${pageInfo.pageNum} of ${pageInfo.totalPages} - Generated on: ${new Date().toLocaleDateString('en-GB')}`;
        pdf.text(statsLine, pageWidth / 2, y, { align: 'center' });
        y += 3;
        
        // Black separator line
        pdf.setLineWidth(0.3);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 4; // Spacing after the line before guest numbers

        return y;
      };


      setProgress(50);

      // Get font sizes based on settings - aligned with print for true-to-size
      const fontSizes = {
        small: { name: 10.5, details: 9.5 },
        medium: { name: 12, details: 11 },
        large: { name: 13.5, details: 12.5 }
      };
      const currentFontSize = fontSizes[settings.fontSize];
      const baseLineHeight = currentFontSize.name * 0.352778; // pt -> mm

      // Calculate lines per guest block
      let linesPerGuest = 1; // name line
      if (settings.showDietary) linesPerGuest += 1;
      if (settings.showRsvp) linesPerGuest += 1;
      if (settings.showRelation) linesPerGuest += 1;
      const blockHeight = baseLineHeight * linesPerGuest + 2;

      setProgress(75);

      // Iterate through pages
      let startGuestNum = 1;
      pages.forEach((pageInfo, pageIndex) => {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        // Draw header for this page
        let yPosition = drawHeader(pageInfo, startGuestNum);
        
        // Draw column headers
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        const leftEndNum = startGuestNum + pageInfo.leftColumn.length - 1;
        const rightEndNum = startGuestNum + pageInfo.leftColumn.length + pageInfo.rightColumn.length - 1;
        pdf.text(`GUESTS ${startGuestNum}-${leftEndNum}`, margin, yPosition);
        if (pageInfo.rightColumn.length > 0) {
          pdf.text(`GUESTS ${startGuestNum + pageInfo.leftColumn.length}-${rightEndNum}`, margin + columnWidth + columnGap, yPosition);
        }
        yPosition += 10;

        // Draw guests
        for (let i = 0; i < Math.max(pageInfo.leftColumn.length, pageInfo.rightColumn.length); i++) {
          const startY = yPosition;

          // Left column guest
          if (i < pageInfo.leftColumn.length) {
            const guest = pageInfo.leftColumn[i];
            const guestName = formatGuestName(guest);
            const tableInfo = guest.table_no ? `Table ${guest.table_no}` : 'Unassigned';
            let currentY = startY;

            // Checkbox
            pdf.rect(margin, currentY - 2, 3, 3);

            // Name
            pdf.setFontSize(currentFontSize.name);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text(guestName, margin + 6, currentY);

            // Table (right aligned)
            pdf.setFont('helvetica', 'normal');
            pdf.text(tableInfo, margin + columnWidth - 2, currentY, { align: 'right' });
            currentY += baseLineHeight;

            // Details with colors
            pdf.setFontSize(currentFontSize.details);
            pdf.setFont('helvetica', 'normal');
            if (settings.showDietary && guest.dietary) {
              pdf.setTextColor(37, 99, 235);
              pdf.text(`Dietary: ${guest.dietary}`, margin + 6, currentY);
              currentY += baseLineHeight;
            }
            if (settings.showRsvp) {
              const rsvpStatus = normalizeRsvp(guest.rsvp);
              if (rsvpStatus === 'Attending') pdf.setTextColor(34, 197, 94);
              else if (rsvpStatus === 'Not Attending') pdf.setTextColor(239, 68, 68);
              else pdf.setTextColor(245, 158, 11);
              pdf.text(`RSVP: ${rsvpStatus}`, margin + 6, currentY);
              currentY += baseLineHeight;
            }
            if (settings.showRelation && guest.relation_display) {
              pdf.setTextColor(139, 92, 246);
              pdf.text(`Relation: ${guest.relation_display}`, margin + 6, currentY);
              currentY += baseLineHeight;
            }
            pdf.setTextColor(0, 0, 0);
          }

          // Right column guest
          if (i < pageInfo.rightColumn.length) {
            const guest = pageInfo.rightColumn[i];
            const guestName = formatGuestName(guest);
            const tableInfo = guest.table_no ? `Table ${guest.table_no}` : 'Unassigned';
            const rightX = margin + columnWidth + columnGap;
            let currentY = startY;

            pdf.rect(rightX, currentY - 2, 3, 3);
            pdf.setFontSize(currentFontSize.name);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text(guestName, rightX + 6, currentY);
            pdf.setFont('helvetica', 'normal');
            pdf.text(tableInfo, rightX + columnWidth - 2, currentY, { align: 'right' });
            currentY += baseLineHeight;

            pdf.setFontSize(currentFontSize.details);
            pdf.setFont('helvetica', 'normal');
            if (settings.showDietary && guest.dietary) {
              pdf.setTextColor(37, 99, 235);
              pdf.text(`Dietary: ${guest.dietary}`, rightX + 6, currentY);
              currentY += baseLineHeight;
            }
            if (settings.showRsvp) {
              const rsvpStatus = normalizeRsvp(guest.rsvp);
              if (rsvpStatus === 'Attending') pdf.setTextColor(34, 197, 94);
              else if (rsvpStatus === 'Not Attending') pdf.setTextColor(239, 68, 68);
              else pdf.setTextColor(245, 158, 11);
              pdf.text(`RSVP: ${rsvpStatus}`, rightX + 6, currentY);
              currentY += baseLineHeight;
            }
            if (settings.showRelation && guest.relation_display) {
              pdf.setTextColor(139, 92, 246);
              pdf.text(`Relation: ${guest.relation_display}`, rightX + 6, currentY);
              currentY += baseLineHeight;
            }
            pdf.setTextColor(0, 0, 0);
          }

          yPosition += blockHeight;
        }

        startGuestNum += pageInfo.leftColumn.length + pageInfo.rightColumn.length;
      });

      // Add footer logo to all pages
      if (settings.showLogo) {
        const totalPagesCount = pdf.getNumberOfPages();
        for (let pageNum = 1; pageNum <= totalPagesCount; pageNum++) {
          pdf.setPage(pageNum);
          try {
            const logoUrl = '/jpeg-2.jpg';
            const logoHeight = 12; // mm
            const logoWidth = 35; // mm
            const footerY = pageHeight - 20 - logoHeight; // 20mm from bottom
            pdf.addImage(logoUrl, 'JPEG', (pageWidth - logoWidth) / 2, footerY, logoWidth, logoHeight);
          } catch (error) {
            console.log('Could not add footer logo to PDF:', error);
          }
        }
      }

      setProgress(90);

      setProgress(100);

      // Save PDF
      const fileName = `${event.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_seating_chart.pdf`;
      pdf.save(fileName);

      // Complete
      setTimeout(() => {
        setIsExporting(false);
        onExportEnd();
        onClose();
      }, 500);

    } catch (error) {
      console.error('Error generating PDF:', error);
      setIsExporting(false);
      onExportEnd();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export Seating Chart
          </DialogTitle>
          <DialogDescription>
            Generate a PDF of your complete guest list with check-off boxes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Export Details */}
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Event:</span>
              <span className="font-medium">{event.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Guests:</span>
              <span className="font-medium">{guests.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Format:</span>
              <span className="font-medium">PDF ({settings.paperSize})</span>
            </div>
          </div>

          {/* Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating PDF...
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isExporting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={exportToPDF}
              disabled={isExporting}
              className="flex-1"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};