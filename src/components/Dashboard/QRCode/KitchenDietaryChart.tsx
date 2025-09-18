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
import weddingWaitressLogo from '@/assets/wedding-waitress-logo.png';

interface KitchenDietaryChartProps {
  eventId: string;
}

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
        seat_no: guest.seat_no,
        dietary: guest.dietary,
        relation_display: guest.relation_display,
        mobile: guest.mobile
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
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(currentEvent.name, pageWidth / 2, 20, { align: 'center' });
      
      if (currentEvent.date) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        const eventDate = format(new Date(currentEvent.date), 'EEEE, MMMM do, yyyy');
        pdf.text(eventDate, pageWidth / 2, 30, { align: 'center' });
      }

      // Table headers
      let yPosition = 50;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      
      const colWidths = [30, 15, 15, 40, 30, 40]; // Name, Table, Seat, Dietary, Mobile, Relation
      const colPositions = [10, 40, 55, 70, 110, 140];
      
      pdf.text('Guest Name', colPositions[0], yPosition);
      pdf.text('Table', colPositions[1], yPosition);
      pdf.text('Seat', colPositions[2], yPosition);
      pdf.text('Dietary Requirements', colPositions[3], yPosition);
      pdf.text('Mobile', colPositions[4], yPosition);
      pdf.text('Relation', colPositions[5], yPosition);
      
      // Draw line under headers
      yPosition += 5;
      pdf.line(10, yPosition, pageWidth - 10, yPosition);
      yPosition += 10;

      // Guest data
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);

      dietaryGuests.forEach((guest, index) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }

        const fullName = `${guest.first_name} ${guest.last_name || ''}`.trim();
        const tableText = guest.table_no ? guest.table_no.toString() : '-';
        const seatText = guest.seat_no ? guest.seat_no.toString() : '-';
        const mobileText = guest.mobile || '-';
        
        pdf.text(fullName, colPositions[0], yPosition);
        pdf.text(tableText, colPositions[1], yPosition);
        pdf.text(seatText, colPositions[2], yPosition);
        
        // Handle long dietary text with wrapping
        const dietaryLines = pdf.splitTextToSize(guest.dietary, colWidths[3]);
        pdf.text(dietaryLines, colPositions[3], yPosition);
        
        // Handle mobile text
        const mobileLines = pdf.splitTextToSize(mobileText, colWidths[4]);
        pdf.text(mobileLines, colPositions[4], yPosition);
        
        // Handle long who_is text with wrapping
        const relationLines = pdf.splitTextToSize(guest.relation_display || 'Guest', colWidths[5]);
        pdf.text(relationLines, colPositions[5], yPosition);
        
        const maxLines = Math.max(dietaryLines.length, mobileLines.length, relationLines.length);
        yPosition += maxLines * 6 + 4;

        // Add separator line every few entries
        if ((index + 1) % 3 === 0) {
          pdf.setDrawColor(220, 220, 220);
          pdf.line(10, yPosition, pageWidth - 10, yPosition);
          yPosition += 3;
        }
      });

      // Footer with logo
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        // Wedding Waitress logo
        try {
          pdf.addImage(weddingWaitressLogo, 'PNG', pageWidth / 2 - 10, pageHeight - 25, 20, 10);
        } catch (error) {
          console.warn('Could not add logo to PDF:', error);
        }
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(
          `Kitchen Dietary Requirements | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 5,
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
    <>
      <style>{`
        @media print {
          /* Hide everything by default */
          * { visibility: hidden !important; }
          
          /* Show only the specific Kitchen Dietary Chart content */
          .kitchen-dietary-chart, 
          .kitchen-dietary-chart *,
          .kitchen-dietary-print,
          .kitchen-dietary-print * { 
            visibility: visible !important; 
          }
          
          /* Global print setup */
          body { 
            -webkit-print-color-adjust: exact !important; 
            color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          @page { 
            size: A4; 
            margin: 0.8in; 
          }
          
          /* Hide all dashboard elements */
          .dashboard-sidebar,
          .dashboard-header,
          .dashboard-nav,
          .stats-bar,
          nav,
          aside,
          header:not(.kitchen-dietary-print header),
          .sidebar,
          .navigation,
          .tabs,
          .breadcrumb,
          .print-hide { 
            display: none !important; 
            visibility: hidden !important;
          }
          
          /* Show only Kitchen Dietary content */
          .print-show { 
            display: block !important; 
            visibility: visible !important;
          }
          
          /* Position the kitchen dietary chart at the root */
          .kitchen-dietary-chart {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          .kitchen-dietary-print {
            font-size: 16px !important;
            line-height: 1.5 !important;
            color: black !important;
            background: white !important;
            width: 100% !important;
          }
          
          .kitchen-dietary-print h1 {
            font-size: 28px !important;
            margin-bottom: 10px !important;
            text-align: center !important;
            color: black !important;
            font-weight: bold !important;
          }
          
          .kitchen-dietary-print h2 {
            font-size: 20px !important;
            margin-bottom: 25px !important;
            text-align: center !important;
            color: black !important;
            font-weight: normal !important;
          }
          
          .kitchen-dietary-print table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 25px !important;
            background: white !important;
          }
          
          .kitchen-dietary-print th,
          .kitchen-dietary-print td {
            border: 2px solid #333 !important;
            padding: 14px 10px !important;
            text-align: left !important;
            font-size: 15px !important;
            font-weight: 500 !important;
            color: black !important;
            background: white !important;
          }
          
          .kitchen-dietary-print th {
            background-color: #f0f0f0 !important;
            font-weight: bold !important;
            font-size: 16px !important;
            color: black !important;
          }
          
          .kitchen-dietary-print .dietary-cell {
            background-color: #f5f5f5 !important;
            color: #333 !important;
            font-weight: 700 !important;
          }
          
          .kitchen-dietary-print .logo-footer {
            position: fixed !important;
            bottom: 0.5in !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            text-align: center !important;
            visibility: visible !important;
          }
          
          .kitchen-dietary-print .logo-footer img {
            max-width: 150px !important;
            height: auto !important;
            opacity: 0.8 !important;
          }
        }
      `}</style>
      
      <div className="space-y-6 kitchen-dietary-chart">
        {/* Header Card */}
        <Card className="border-primary/20 bg-gradient-subtle print-hide">
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
          <Card className="print-hide">
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

        {/* Print Header */}
        <div className="hidden print-show kitchen-dietary-print">
          {currentEvent && (
            <>
              <h1>{currentEvent.name}</h1>
              {currentEvent.date && (
                <h2>{format(new Date(currentEvent.date), 'EEEE, MMMM do, yyyy')}</h2>
              )}
            </>
          )}
        </div>

        {/* Dietary Requirements List */}
        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-6 print:p-0">
            {dietaryGuests.length === 0 ? (
              <div className="text-center py-8 print-hide">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Dietary Requirements</h3>
                <p className="text-muted-foreground">
                  No guests have specified dietary requirements or allergies for this event.
                </p>
              </div>
            ) : (
              <>
                {/* Screen View */}
                <div className="space-y-1 print-hide">
                  {/* Headers */}
                  <div className="grid grid-cols-12 gap-4 pb-3 border-b font-semibold text-sm text-muted-foreground">
                    <div className="col-span-3">Guest Name</div>
                    <div className="col-span-1">Table</div>
                    <div className="col-span-1">Seat</div>
                    <div className="col-span-3">Dietary Requirements</div>
                    <div className="col-span-2">Mobile</div>
                    <div className="col-span-2">Relation</div>
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
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                        <div className="col-span-1">
                          {guest.seat_no ? (
                            <Badge variant="outline" className="text-xs">
                              {guest.seat_no}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                        <div className="col-span-3">
                          <span className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded-full text-xs font-medium">
                            {guest.dietary}
                          </span>
                        </div>
                        <div className="col-span-2 text-muted-foreground text-xs">
                          {guest.mobile || '-'}
                        </div>
                        <div className="col-span-2 text-muted-foreground text-xs">
                          {guest.relation_display || 'Guest'}
                        </div>
                      </div>
                      {index < dietaryGuests.length - 1 && (
                        <Separator className="my-1 opacity-30" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Print View */}
                <div className="hidden print-show kitchen-dietary-print">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '18%' }}>Guest Name</th>
                        <th style={{ width: '8%' }}>Table</th>
                        <th style={{ width: '8%' }}>Seat</th>
                        <th style={{ width: '25%' }}>Dietary Requirements</th>
                        <th style={{ width: '18%' }}>Mobile</th>
                        <th style={{ width: '23%' }}>Relation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dietaryGuests.map((guest) => (
                        <tr key={guest.id}>
                          <td style={{ fontWeight: '600' }}>
                            {guest.first_name} {guest.last_name}
                          </td>
                          <td>{guest.table_no || '-'}</td>
                          <td>{guest.seat_no || '-'}</td>
                          <td className="dietary-cell">{guest.dietary}</td>
                          <td>{guest.mobile || '-'}</td>
                          <td>{guest.relation_display || 'Guest'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Instructions for Kitchen Staff */}
        <Card className="bg-muted/30 print-hide">
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

        {/* Print Footer */}
        <div className="hidden print-show logo-footer">
          <img src={weddingWaitressLogo} alt="Wedding Waitress" />
        </div>
      </div>
    </>
  );
};