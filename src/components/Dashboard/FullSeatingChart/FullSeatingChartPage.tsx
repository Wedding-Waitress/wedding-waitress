import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, FileText, Users, Layout } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useFullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { useToast } from '@/hooks/use-toast';
import { FullSeatingChartCustomizer } from "./FullSeatingChartCustomizer";
import { FullSeatingChartPreview } from "./FullSeatingChartPreview";
import { FullSeatingChartExporter } from "./FullSeatingChartExporter";
import { normalizeRsvp } from '@/lib/rsvp';
import jsPDF from 'jspdf';

interface FullSeatingChartPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export const FullSeatingChartPage: React.FC<FullSeatingChartPageProps> = ({
  selectedEventId,
  onEventSelect
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showExporter, setShowExporter] = useState(false);
  const { events, loading: eventsLoading } = useEvents();
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);
  const { settings, loading: settingsLoading, updateSettings } = useFullSeatingChartSettings(selectedEventId);
  const { toast } = useToast();

  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;

  const handleEventSelect = (eventId: string) => {
    if (eventId === "no-event") return;
    onEventSelect(eventId);
  };

  const handlePrintFullSeating = async () => {
    if (!selectedEvent || !sortedGuests.length) return;

    try {
      // Generate PDF using same logic as exporter
      const paperFormats: Record<'A4' | 'A3' | 'A2' | 'A1', [number, number]> = {
        'A4': [210, 297],
        'A3': [297, 420],
        'A2': [420, 594],
        'A1': [594, 841]
      };

      const [pageWidth, pageHeight] = paperFormats[settings.paperSize];
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: settings.paperSize.toLowerCase() as 'a4' | 'a3' | 'a2' | 'a1'
      });

      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      const columnGap = 10;
      const columnWidth = contentWidth / 2 - columnGap / 2;
      const footerReserved = 38;

      const midPoint = Math.ceil(sortedGuests.length / 2);
      const leftColumn = sortedGuests.slice(0, midPoint);
      const rightColumn = sortedGuests.slice(midPoint);

      const formatGuestName = (guest: any) => {
        if (settings.sortBy === 'lastName') {
          return `${guest.last_name || ''}, ${guest.first_name}`.trim();
        }
        return `${guest.first_name} ${guest.last_name || ''}`.trim();
      };

      const formatDateWithOrdinal = (dateString: string) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          const day = date.getDate();
          const getOrdinalSuffix = (d: number) => {
            if (d > 3 && d < 21) return 'th';
            switch (d % 10) {
              case 1: return 'st';
              case 2: return 'nd';
              case 3: return 'rd';
              default: return 'th';
            }
          };
          const ordinal = getOrdinalSuffix(day);
          const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
          const month = date.toLocaleDateString('en-US', { month: 'long' });
          const year = date.getFullYear();
          return `${weekday} ${day}${ordinal}, ${month} ${year}`;
        } catch {
          return dateString;
        }
      };

      const drawHeader = () => {
        let y = margin + 2;
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(139, 92, 246);
        pdf.text(selectedEvent.name, pageWidth / 2, y, { align: 'center' });
        y += 6;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        let subtitle = '';
        if (selectedEvent.date) subtitle += formatDateWithOrdinal(selectedEvent.date);
        if (selectedEvent.venue) subtitle += (subtitle ? ' - ' : '') + selectedEvent.venue;
        subtitle += (subtitle ? ' - ' : '') + 'Full Seating Chart';
        pdf.text(subtitle, pageWidth / 2, y, { align: 'center' });
        y += 6;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`GUESTS 1-${leftColumn.length}`, margin, y);
        pdf.text(`GUESTS ${leftColumn.length + 1}-${sortedGuests.length}`, margin + columnWidth + columnGap, y);
        y += 8;

        pdf.setLineWidth(0.3);
        pdf.line(margin, y - 2, margin + columnWidth, y - 2);
        pdf.line(margin + columnWidth + columnGap, y - 2, margin + columnWidth + columnGap + columnWidth, y - 2);
        y += 3;
        return y;
      };

      const drawFooter = () => {
        const footerY = pageHeight - margin - 8;
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(102, 102, 102);
        pdf.setLineWidth(0.3);
        pdf.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
        const footerText = `Total Guests: ${sortedGuests.length}`;
        pdf.text(footerText, pageWidth / 2, footerY, { align: 'center' });
      };

      let yPosition = drawHeader();

      const fontSizes = {
        small: { name: 10.5, details: 9.5 },
        medium: { name: 12, details: 11 },
        large: { name: 13.5, details: 12.5 }
      };
      const currentFontSize = fontSizes[settings.fontSize];
      const baseLineHeight = currentFontSize.name * 0.352778;

      let linesPerGuest = 1;
      if (settings.showDietary) linesPerGuest += 1;
      if (settings.showRsvp) linesPerGuest += 1;
      if (settings.showRelation) linesPerGuest += 1;
      const blockHeight = baseLineHeight * linesPerGuest + 2;

      for (let i = 0; i < Math.max(leftColumn.length, rightColumn.length); i++) {
        if (yPosition + blockHeight > pageHeight - footerReserved) {
          drawFooter();
          pdf.addPage();
          yPosition = drawHeader();
        }

        const startY = yPosition;

        if (i < leftColumn.length) {
          const guest = leftColumn[i];
          const guestName = formatGuestName(guest);
          const tableInfo = guest.table_no ? `Table ${guest.table_no}` : 'Unassigned';
          let currentY = startY;

          pdf.rect(margin, currentY - 2, 3, 3);
          pdf.setFontSize(currentFontSize.name);
          pdf.setFont('helvetica', 'bold');
          pdf.text(guestName, margin + 6, currentY);
          pdf.setFont('helvetica', 'normal');
          pdf.text(tableInfo, margin + columnWidth - 2, currentY, { align: 'right' });
          currentY += baseLineHeight;

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

        if (i < rightColumn.length) {
          const guest = rightColumn[i];
          const guestName = formatGuestName(guest);
          const tableInfo = guest.table_no ? `Table ${guest.table_no}` : 'Unassigned';
          const rightX = margin + columnWidth + columnGap;
          let currentY = startY;

          pdf.rect(rightX, currentY - 2, 3, 3);
          pdf.setFontSize(currentFontSize.name);
          pdf.setFont('helvetica', 'bold');
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

      drawFooter();

      // Open in new tab instead of downloading
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, '_blank');

      if (!printWindow) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups and try again, or use Export PDF instead.",
          variant: "destructive",
        });
        URL.revokeObjectURL(pdfUrl);
        return;
      }

      printWindow.onload = () => {
        URL.revokeObjectURL(pdfUrl);
      };

      toast({
        title: "Print-Ready PDF Opened",
        description: "The PDF opened in a new tab without browser headers. Print it from there.",
      });
    } catch (error) {
      console.error('Error generating print PDF:', error);
      toast({
        title: "Print Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    setShowExporter(true);
  };

  // Sort guests based on selected sort option from settings
  const sortedGuests = React.useMemo(() => {
    return [...guests].sort((a, b) => {
      if (settings.sortBy === 'firstName') {
        const nameA = `${a.first_name} ${a.last_name || ''}`.trim();
        const nameB = `${b.first_name} ${b.last_name || ''}`.trim();
        return nameA.localeCompare(nameB);
      } else if (settings.sortBy === 'lastName') {
        const lastNameA = a.last_name || '';
        const lastNameB = b.last_name || '';
        if (lastNameA === lastNameB) {
          return a.first_name.localeCompare(b.first_name);
        }
        return lastNameA.localeCompare(lastNameB);
      } else {
        // sortBy === 'tableNo'
        const tableA = a.table_no || Number.MAX_SAFE_INTEGER;
        const tableB = b.table_no || Number.MAX_SAFE_INTEGER;
        if (tableA === tableB) {
          return a.first_name.localeCompare(b.first_name);
        }
        return tableA - tableB;
      }
    });
  }, [guests, settings.sortBy]);

  const isDataReady = selectedEventId && !guestsLoading && guests.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="ww-box print:hidden">
        <CardHeader className="space-y-4">
          {/* Event Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-foreground">
                Choose Event:
              </label>
              <Select value={selectedEventId || "no-event"} onValueChange={handleEventSelect}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
                </SelectTrigger>
                <SelectContent>
                  {events.length > 0 ? (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center space-x-2">
                          <span>{event.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-events" disabled>
                      {eventsLoading ? "Loading events..." : "No events found"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Header Icon & Info */}
            <div className="flex items-center gap-4">
              <FileText className="w-12 h-12 text-primary" />
              <div>
                <CardTitle className="text-right">Full Seating Chart</CardTitle>
                <CardDescription className="text-right">
                  Complete guest list with check-off boxes
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Event Details with Status & Actions */}
          {selectedEvent && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4">
                <span className="text-lg font-medium text-foreground">Full Seating Chart for</span>
                <span className="text-lg font-bold text-primary">{selectedEvent.name}</span>
                <div className="flex items-center gap-2 ml-4">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {guestsLoading ? "Loading..." : `${guests.length} guests`}
                  </span>
                </div>
                <Badge 
                  variant={isDataReady ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isDataReady ? 'Ready to Generate' : 'Loading Data...'}
                </Badge>
              </div>

              {/* Action Buttons */}
              {isDataReady && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintFullSeating}
                  >
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Main Content */}
      {selectedEventId ? (
        isDataReady ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Customization Panel */}
            <div className="lg:col-span-1">
              <FullSeatingChartCustomizer
                settings={settings}
                onSettingsChange={updateSettings}
              />
            </div>

            {/* Preview */}
            <div className="lg:col-span-3">
              <FullSeatingChartPreview 
                event={selectedEvent!} 
                guests={sortedGuests}
                settings={settings}
              />
            </div>
          </div>
        ) : (
          <Card className="ww-box print:hidden">
            <CardContent className="p-8 text-center">
              <Layout className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">Loading Event Data</CardTitle>
              <CardDescription>
                {guestsLoading 
                  ? "Please wait while we load your guest information."
                  : "Add some guests to generate your seating chart."
                }
              </CardDescription>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="ww-box print:hidden">
          <CardContent className="p-8 text-center">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">Select an Event</CardTitle>
            <CardDescription>
              Choose an event from the dropdown above to generate your full seating chart
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Export Modal */}
      {showExporter && selectedEvent && (
        <FullSeatingChartExporter
          event={selectedEvent}
          guests={sortedGuests}
          settings={settings}
          onClose={() => setShowExporter(false)}
          onExportStart={() => setIsExporting(true)}
          onExportEnd={() => setIsExporting(false)}
        />
      )}
    </div>
  );
};