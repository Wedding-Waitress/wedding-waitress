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
import jsPDF from 'jspdf';

interface FullSeatingChartExporterProps {
  event: any;
  guests: Guest[];
  sortBy: 'firstName' | 'lastName' | 'tableNo';
  onClose: () => void;
  onExportStart: () => void;
  onExportEnd: () => void;
}

export const FullSeatingChartExporter: React.FC<FullSeatingChartExporterProps> = ({
  event,
  guests,
  sortBy,
  onClose,
  onExportStart,
  onExportEnd
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const formatGuestName = (guest: Guest) => {
    if (sortBy === 'lastName') {
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

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
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

      // Guest lists
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      const lineHeight = 6;
      const maxGuestsPerPage = Math.floor((pageHeight - yPosition - 20) / lineHeight);

      for (let i = 0; i < Math.max(leftColumn.length, rightColumn.length); i++) {
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin + 10;
        }

        // Left column guest
        if (i < leftColumn.length) {
          const guest = leftColumn[i];
          const guestName = formatGuestName(guest);
          const tableInfo = guest.table_no ? `Table ${guest.table_no}` : 'Unassigned';
          
          // Checkbox
          pdf.rect(margin, yPosition - 2, 3, 3);
          
          // Guest name
          pdf.text(guestName, margin + 6, yPosition);
          
          // Table number (right-aligned in column)
          pdf.text(tableInfo, margin + columnWidth - 2, yPosition, { align: 'right' });
        }

        // Right column guest
        if (i < rightColumn.length) {
          const guest = rightColumn[i];
          const guestName = formatGuestName(guest);
          const tableInfo = guest.table_no ? `Table ${guest.table_no}` : 'Unassigned';
          
          const rightColumnStart = margin + columnWidth + 10;
          
          // Checkbox
          pdf.rect(rightColumnStart, yPosition - 2, 3, 3);
          
          // Guest name
          pdf.text(guestName, rightColumnStart + 6, yPosition);
          
          // Table number (right-aligned in column)
          pdf.text(tableInfo, rightColumnStart + columnWidth - 2, yPosition, { align: 'right' });
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
              <span className="font-medium">PDF (A4)</span>
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