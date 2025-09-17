import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, ChefHat, AlertCircle } from 'lucide-react';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useEvents } from '@/hooks/useEvents';
import { useTables } from '@/hooks/useTables';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface KitchenDietaryChartProps {
  eventId: string;
}

interface DietaryGuest {
  id: string;
  first_name: string;
  last_name: string;
  table_no: number | null;
  dietary: string;
  who_is_display: string;
}

export const KitchenDietaryChart: React.FC<KitchenDietaryChartProps> = ({ eventId }) => {
  const { guests, loading: guestsLoading } = useRealtimeGuests(eventId);
  const { events, loading: eventsLoading } = useEvents();
  const { tables, loading: tablesLoading } = useTables(eventId);
  const [isExporting, setIsExporting] = useState(false);

  const currentEvent = events.find(event => event.id === eventId);

  // Filter guests with dietary requirements (not 'NA', not empty, and not null)
  const dietaryGuests = useMemo(() => {
    return guests
      .filter(guest => 
        guest.dietary && 
        guest.dietary.trim() !== '' && 
        guest.dietary.toLowerCase() !== 'na' &&
        guest.dietary.toLowerCase() !== 'none'
      )
      .map(guest => ({
        id: guest.id,
        first_name: guest.first_name,
        last_name: guest.last_name,
        table_no: guest.table_no,
        dietary: guest.dietary,
        who_is_display: guest.who_is_display
      }))
      .sort((a, b) => {
        // Sort by table number first, then by name
        if (a.table_no !== b.table_no) {
          return (a.table_no || 999) - (b.table_no || 999);
        }
        return a.first_name.localeCompare(b.first_name);
      });
  }, [guests]);

  const handleExportPDF = async () => {
    if (!currentEvent || dietaryGuests.length === 0) return;

    setIsExporting(true);
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Kitchen Dietary Requirements', pageWidth / 2, 20, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(currentEvent.name, pageWidth / 2, 30, { align: 'center' });
      
      if (currentEvent.date) {
        const eventDate = format(new Date(currentEvent.date), 'EEEE, MMMM do, yyyy');
        pdf.text(eventDate, pageWidth / 2, 40, { align: 'center' });
      }

      // Table headers
      let yPosition = 60;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      
      const colWidths = [40, 25, 60, 60]; // Name, Table, Dietary, Who Is
      const colPositions = [10, 50, 75, 135];
      
      pdf.text('Guest Name', colPositions[0], yPosition);
      pdf.text('Table', colPositions[1], yPosition);
      pdf.text('Dietary Requirements', colPositions[2], yPosition);
      pdf.text('Relation', colPositions[3], yPosition);
      
      // Draw line under headers
      yPosition += 5;
      pdf.line(10, yPosition, pageWidth - 10, yPosition);
      yPosition += 10;

      // Guest data
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      dietaryGuests.forEach((guest, index) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        const fullName = `${guest.first_name} ${guest.last_name || ''}`.trim();
        const tableText = guest.table_no ? `Table ${guest.table_no}` : 'Unassigned';
        
        pdf.text(fullName, colPositions[0], yPosition);
        pdf.text(tableText, colPositions[1], yPosition);
        
        // Handle long dietary text with wrapping
        const dietaryLines = pdf.splitTextToSize(guest.dietary, colWidths[2]);
        pdf.text(dietaryLines, colPositions[2], yPosition);
        
        // Handle long who_is text with wrapping
        const whoIsLines = pdf.splitTextToSize(guest.who_is_display || 'Guest', colWidths[3]);
        pdf.text(whoIsLines, colPositions[3], yPosition);
        
        const maxLines = Math.max(dietaryLines.length, whoIsLines.length);
        yPosition += maxLines * 5 + 3;

        // Add separator line every few entries
        if ((index + 1) % 5 === 0) {
          pdf.setDrawColor(200, 200, 200);
          pdf.line(10, yPosition, pageWidth - 10, yPosition);
          yPosition += 5;
        }
      });

      // Footer
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(
          `Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      pdf.save(`kitchen-dietary-requirements-${currentEvent.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (guestsLoading || eventsLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading dietary requirements...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-primary/20 bg-gradient-subtle">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ChefHat className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl gradient-text">Kitchen Dietary Requirements</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Staff reference sheet for guests with dietary requirements and allergies
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting || dietaryGuests.length === 0}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Event Info */}
      {currentEvent && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{currentEvent.name}</h3>
                {currentEvent.date && (
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(currentEvent.date), 'EEEE, MMMM do, yyyy')}
                  </p>
                )}
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="mb-1">
                  {dietaryGuests.length} Guest{dietaryGuests.length !== 1 ? 's' : ''}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  with dietary requirements
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dietary Requirements List */}
      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-6">
          {dietaryGuests.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Dietary Requirements</h3>
              <p className="text-muted-foreground">
                No guests have specified dietary requirements or allergies for this event.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Headers */}
              <div className="grid grid-cols-12 gap-4 pb-3 border-b font-semibold text-sm text-muted-foreground">
                <div className="col-span-3">Guest Name</div>
                <div className="col-span-1">Table</div>
                <div className="col-span-4">Dietary Requirements</div>
                <div className="col-span-4">Relation</div>
              </div>
              
              {/* Guest Rows */}
              {dietaryGuests.map((guest, index) => (
                <div key={guest.id}>
                  <div className="grid grid-cols-12 gap-4 py-3 text-sm hover:bg-muted/30 rounded-lg px-2 transition-colors">
                    <div className="col-span-3 font-medium">
                      {guest.first_name} {guest.last_name}
                    </div>
                    <div className="col-span-1">
                      {guest.table_no ? (
                        <Badge variant="outline" className="text-xs">
                          {guest.table_no}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Unassigned</span>
                      )}
                    </div>
                    <div className="col-span-4">
                      <span className="bg-warning/10 text-warning-foreground px-2 py-1 rounded text-xs font-medium">
                        {guest.dietary}
                      </span>
                    </div>
                    <div className="col-span-4 text-muted-foreground">
                      {guest.who_is_display || 'Guest'}
                    </div>
                  </div>
                  {index < dietaryGuests.length - 1 && (
                    <Separator className="my-1 opacity-30" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions for Kitchen Staff */}
      <Card className="bg-muted/30 print:hidden">
        <CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-2">Instructions for Kitchen Staff</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Please ensure all dietary requirements are carefully noted for each guest</li>
            <li>• Cross-reference table numbers during service</li>
            <li>• Contact event coordinator if any requirements are unclear</li>
            <li>• Keep this sheet accessible throughout food preparation and service</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};