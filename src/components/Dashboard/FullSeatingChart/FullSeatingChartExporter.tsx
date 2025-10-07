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
      const contentWidth = pageWidth - (margin * 2);
      const columnWidth = contentWidth / 2 - 5; // 5mm gap between columns

      setProgress(25);

      // Header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(139, 92, 246); // Purple color
      let yPosition = margin + 10;
      
      // Event name (Line 1)
      pdf.text(event.name, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      // Combined subtitle (Line 2)
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0); // Black
      
      let subtitle = '';
      if (event.date) {
        subtitle += formatDateWithOrdinal(event.date);
      }
      if (event.venue) {
        subtitle += (subtitle ? ' - ' : '') + event.venue;
      }
      subtitle += (subtitle ? ' - ' : '') + 'Full Seating Chart';
      
      pdf.text(subtitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      setProgress(50);

      // Split guests into two columns
      const midPoint = Math.ceil(guests.length / 2);
      const leftColumn = guests.slice(0, midPoint);
      const rightColumn = guests.slice(midPoint);

      // Column headers
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      
      // Left column header
      pdf.text(`GUESTS 1-${leftColumn.length}`, margin, yPosition);
      // Right column header
      pdf.text(`GUESTS ${leftColumn.length + 1}-${guests.length}`, margin + columnWidth + 10, yPosition);
      
      yPosition += 8;

      // Draw underlines for headers
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPosition - 2, margin + columnWidth, yPosition - 2);
      pdf.line(margin + columnWidth + 10, yPosition - 2, margin + columnWidth + 10 + columnWidth, yPosition - 2);

      yPosition += 3;

      setProgress(75);

      // Get font sizes based on settings - aligned with print for true-to-size
      const fontSizes = {
        small: { name: 10.5, details: 9.5 },
        medium: { name: 12, details: 11 },
        large: { name: 13.5, details: 12.5 }
      };
      const currentFontSize = fontSizes[settings.fontSize];

      // Calculate line height based on what's being shown
      let linesPerGuest = 1; // Name + table always shown
      if (settings.showDietary) linesPerGuest += 1;
      if (settings.showRsvp) linesPerGuest += 1;
      if (settings.showRelation) linesPerGuest += 1;
      
      const baseLineHeight = currentFontSize.name * 0.352778; // Proper pt to mm conversion
      const lineHeight = baseLineHeight * linesPerGuest + 2; // Add spacing between guests
      const maxGuestsPerPage = Math.floor((pageHeight - yPosition - 20) / lineHeight);

      for (let i = 0; i < Math.max(leftColumn.length, rightColumn.length); i++) {
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin + 10;
        }

        const startYPosition = yPosition;

        // Left column guest
        if (i < leftColumn.length) {
          const guest = leftColumn[i];
          const guestName = formatGuestName(guest);
          const tableInfo = guest.table_no ? `Table ${guest.table_no}` : 'Unassigned';
          
          let currentY = startYPosition;
          
          // Checkbox
          pdf.rect(margin, currentY - 2, 3, 3);
          
          // Guest name
          pdf.setFontSize(currentFontSize.name);
          pdf.setFont('helvetica', 'bold');
          pdf.text(guestName, margin + 6, currentY);
          
          // Table number (right-aligned in column)
          pdf.setFont('helvetica', 'normal');
          pdf.text(tableInfo, margin + columnWidth - 2, currentY, { align: 'right' });
          
          currentY += baseLineHeight;
          
          // Additional details with color
          pdf.setFontSize(currentFontSize.details);
          pdf.setFont('helvetica', 'normal');
          
          if (settings.showDietary && guest.dietary) {
            pdf.setTextColor(37, 99, 235); // Blue for dietary
            pdf.text(`Dietary: ${guest.dietary}`, margin + 6, currentY);
            currentY += baseLineHeight;
          }
          
          if (settings.showRsvp) {
            const rsvpStatus = normalizeRsvp(guest.rsvp);
            // Color based on RSVP status
            if (rsvpStatus === 'Attending') {
              pdf.setTextColor(34, 197, 94); // Green
            } else if (rsvpStatus === 'Not Attending') {
              pdf.setTextColor(239, 68, 68); // Red
            } else {
              pdf.setTextColor(245, 158, 11); // Orange/Amber for Pending
            }
            pdf.text(`RSVP: ${rsvpStatus}`, margin + 6, currentY);
            currentY += baseLineHeight;
          }
          
          if (settings.showRelation && guest.relation_display) {
            pdf.setTextColor(139, 92, 246); // Purple for relation
            pdf.text(`Relation: ${guest.relation_display}`, margin + 6, currentY);
            currentY += baseLineHeight;
          }
          
          pdf.setTextColor(0, 0, 0); // Reset to black
        }

        // Right column guest
        if (i < rightColumn.length) {
          const guest = rightColumn[i];
          const guestName = formatGuestName(guest);
          const tableInfo = guest.table_no ? `Table ${guest.table_no}` : 'Unassigned';
          
          const rightColumnStart = margin + columnWidth + 10;
          let currentY = startYPosition;
          
          // Checkbox
          pdf.rect(rightColumnStart, currentY - 2, 3, 3);
          
          // Guest name
          pdf.setFontSize(currentFontSize.name);
          pdf.setFont('helvetica', 'bold');
          pdf.text(guestName, rightColumnStart + 6, currentY);
          
          // Table number (right-aligned in column)
          pdf.setFont('helvetica', 'normal');
          pdf.text(tableInfo, rightColumnStart + columnWidth - 2, currentY, { align: 'right' });
          
          currentY += baseLineHeight;
          
          // Additional details with color
          pdf.setFontSize(currentFontSize.details);
          pdf.setFont('helvetica', 'normal');
          
          if (settings.showDietary && guest.dietary) {
            pdf.setTextColor(37, 99, 235); // Blue for dietary
            pdf.text(`Dietary: ${guest.dietary}`, rightColumnStart + 6, currentY);
            currentY += baseLineHeight;
          }
          
          if (settings.showRsvp) {
            const rsvpStatus = normalizeRsvp(guest.rsvp);
            // Color based on RSVP status
            if (rsvpStatus === 'Attending') {
              pdf.setTextColor(34, 197, 94); // Green
            } else if (rsvpStatus === 'Not Attending') {
              pdf.setTextColor(239, 68, 68); // Red
            } else {
              pdf.setTextColor(245, 158, 11); // Orange/Amber for Pending
            }
            pdf.text(`RSVP: ${rsvpStatus}`, rightColumnStart + 6, currentY);
            currentY += baseLineHeight;
          }
          
          if (settings.showRelation && guest.relation_display) {
            pdf.setTextColor(139, 92, 246); // Purple for relation
            pdf.text(`Relation: ${guest.relation_display}`, rightColumnStart + 6, currentY);
            currentY += baseLineHeight;
          }
          
          pdf.setTextColor(0, 0, 0); // Reset to black
        }

        yPosition += lineHeight;
      }

      setProgress(90);

      // Footer
      yPosition = Math.max(yPosition + 10, pageHeight - 30);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(102, 102, 102); // Gray
      
      // Draw line
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
      
      // Combined footer stats (Line 1)
      const footerText = `Total Guests: ${guests.length} - Generated on: ${new Date().toLocaleDateString()}`;
      pdf.text(footerText, pageWidth / 2, yPosition, { align: 'center' });
      
      // Add logo (Line 2)
      yPosition += 6;
      try {
        // Load and add the Wedding Waitress logo
        const logoUrl = '/wedding-waitress-new-logo.png';
        const logoHeight = 12; // mm
        const logoWidth = 40; // mm (approximate)
        pdf.addImage(logoUrl, 'PNG', (pageWidth - logoWidth) / 2, yPosition, logoWidth, logoHeight);
      } catch (error) {
        console.log('Could not add logo to PDF:', error);
      }

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