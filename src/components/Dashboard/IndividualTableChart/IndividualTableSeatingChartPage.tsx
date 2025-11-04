/**
 * ⚠️ PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL ⚠️
 * 
 * This Individual Table Charts feature is COMPLETE and LOCKED.
 * All functionality has been thoroughly tested and approved.
 * 
 * DO NOT make changes unless explicitly requested by the project owner.
 * Any modifications could break the carefully calibrated A4 export system,
 * seat positioning algorithms, and multi-table PDF generation.
 * 
 * Last completed: 2025-10-04
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Users, FileText, Printer } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useTables } from '@/hooks/useTables';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { format } from 'date-fns';
import { IndividualTableChartPreview } from './IndividualTableChartPreview';
import { IndividualTableChartCustomizer } from './IndividualTableChartCustomizer';
import { exportIndividualTableChartToDocx, exportAllTablesChartToDocx } from '@/lib/individualTableChartDocxExporter';
import { generateIndividualTableChartPDF, generateAllTablesChartPDF } from '@/lib/individualTableChartEngine';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

// Print styles for clean browser printing
const printStyles = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 0;
    }
    
    body * {
      visibility: hidden;
    }
    
    #printA4-individual-table,
    #printA4-individual-table * {
      visibility: visible;
    }
    
    #printA4-individual-table {
      position: absolute;
      left: 0;
      top: 0;
      width: 210mm;
      height: 297mm;
    }
    
    /* Hide non-print elements */
    button,
    .no-print,
    header,
    nav {
      display: none !important;
    }
  }
`;

export interface IndividualChartSettings {
  tableShape: 'round' | 'square';
  fontSize: 'small' | 'medium' | 'large';
  includeNames: boolean;
  includeDietary: boolean;
  includeGuestList: boolean;
  showSeatNumbers: boolean;
  paperSize: 'A4';
  title: string;
  showLogo: boolean;
}

interface IndividualTableSeatingChartPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

const defaultSettings: IndividualChartSettings = {
  tableShape: 'round',
  fontSize: 'medium',
  includeNames: true,
  includeDietary: true,
  includeGuestList: true,
  showSeatNumbers: true,
  paperSize: 'A4',
  title: '',
  showLogo: true,
};

export const IndividualTableSeatingChartPage: React.FC<IndividualTableSeatingChartPageProps> = ({
  selectedEventId,
  onEventSelect,
}) => {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [settings, setSettings] = useState<IndividualChartSettings>(defaultSettings);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const { events, loading: eventsLoading } = useEvents();
  const { tables, loading: tablesLoading } = useTables(selectedEventId);
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);

  const selectedEvent = events.find(event => event.id === selectedEventId);

  // Inject print styles into document
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Format event date for display
  const eventDate = selectedEvent?.date ? format(new Date(selectedEvent.date), 'PPP') : '';

  // Update chart title when event or table changes
  useEffect(() => {
    if (selectedEvent && selectedTableId) {
      const selectedTable = tables.find(table => table.id === selectedTableId);
      if (selectedTable) {
        setSettings(prev => ({
          ...prev,
          title: `TABLE ${selectedTable.table_no || 'Unknown'}`
        }));
      }
    }
  }, [selectedEvent, selectedTableId, tables]);

  const handleSettingsChange = (newSettings: Partial<IndividualChartSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleDownloadWord = async () => {
    if (!selectedEvent || !selectedTableId) return;
    
    setIsExporting(true);
    try {
      toast.info('Generating Word document...');
      
      await exportIndividualTableChartToDocx(
        settings,
        selectedTable!,
        guests,
        selectedEvent
      );
      
      toast.success('Word document downloaded successfully!');
    } catch (error) {
      console.error('DOCX export error:', error);
      toast.error('Failed to generate Word document');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAllWord = async () => {
    if (!selectedEvent || tables.length === 0) return;
    
    setIsExportingAll(true);
    try {
      toast.info(`Generating Word document for ${tables.length} tables...`);
      
      await exportAllTablesChartToDocx(
        settings,
        tables,
        guests,
        selectedEvent
      );
      
      toast.success(`Successfully exported ${tables.length} tables to Word!`);
    } catch (error) {
      console.error('DOCX export all error:', error);
      toast.error('Failed to export all tables');
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedEvent || !selectedTableId) return;
    
    setIsExporting(true);
    try {
      toast.info('Generating PDF...');
      
      const pdfBlob = await generateIndividualTableChartPDF(
        settings,
        selectedTable!,
        guests,
        selectedEvent
      );
      
      const eventName = selectedEvent.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const date = new Date().toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).replace(/\//g, '-');
      const fileName = `${eventName}-Table-${selectedTable!.table_no}-Seating-Chart-${date}.pdf`;
      
      saveAs(pdfBlob, fileName);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAllPdf = async () => {
    if (!selectedEvent || tables.length === 0) return;
    
    setIsExportingAll(true);
    try {
      toast.info(`Generating PDF for ${tables.length} tables...`);
      
      const pdfBlob = await generateAllTablesChartPDF(
        settings,
        tables,
        guests,
        selectedEvent
      );
      
      const eventName = selectedEvent.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const date = new Date().toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).replace(/\//g, '-');
      const fileName = `${eventName}-All-Tables-Seating-Charts-${date}.pdf`;
      
      saveAs(pdfBlob, fileName);
      toast.success(`Successfully exported ${tables.length} tables to PDF!`);
    } catch (error) {
      console.error('PDF export all error:', error);
      toast.error('Failed to export all tables');
    } finally {
      setIsExportingAll(false);
    }
  };

  const handlePrint = () => {
    if (!selectedEvent || !selectedTableId) return;
    
    setIsPrinting(true);
    
    toast.info('Opening Print Dialog', {
      description: `Preparing Table ${selectedTable?.table_no} for printing...`,
    });
    
    // Small delay to show toast before print dialog
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const handlePrintAll = () => {
    if (!selectedEvent || tables.length === 0) return;
    
    toast.info('Print All Tables', {
      description: 'To print all tables, use "Download All PDF" for best results. This will print the current table only.',
    });
    
    handlePrint();
  };

  const selectedTable = tables.find(table => table.id === selectedTableId);
  const isDataReady = selectedEvent && selectedTable && !tablesLoading && !guestsLoading;

  return (
    <div className="space-y-6">
      {/* Event and Table Selection */}
      <Card className="ww-box">
        <CardHeader className="space-y-4">
          {/* Main Page Title */}
          <div>
              <h1 className="text-2xl font-medium text-[#7248e6] mb-2">
                Individual Table Seating Chart
              </h1>
            <p className="text-muted-foreground">
              Generate detailed seating charts for individual tables
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-8">
          <div className="flex items-center gap-8 flex-wrap">
            {/* Choose Event Section */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Choose Event:
              </label>
              <Select
                value={selectedEventId || 'no-event'} 
                onValueChange={(value) => {
                  if (value === 'no-event') return;
                  onEventSelect(value);
                }}
                disabled={eventsLoading}
              >
                <SelectTrigger className="w-[300px] border-primary focus:ring-primary font-bold text-[#7248e6]">
                  <SelectValue placeholder="Choose Event" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {events.length > 0 ? (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
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

            {/* Table Section */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Table:
              </label>
              <Select 
                value={selectedTableId || ''} 
                onValueChange={setSelectedTableId}
                disabled={!selectedEventId || tablesLoading}
              >
                <SelectTrigger className="w-[300px] border-primary focus:ring-primary">
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      Table {table.table_no} - {table.name} ({table.guest_count}/{table.limit_seats} guests)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

            {/* Action Buttons */}
            {isDataReady && (
              <div className="pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Export Controls Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Export Controls</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button 
                        variant="default"
                        size="xs"
                        onClick={handleDownloadPdf}
                        disabled={isExporting || isExportingAll || isPrinting}
                        className="rounded-full flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Download PDF
                      </Button>
                      <Button 
                        variant="default"
                        size="xs"
                        onClick={handleDownloadAllPdf}
                        disabled={isExporting || isExportingAll || isPrinting}
                        className="rounded-full flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        {isExportingAll ? `Exporting ${tables.length} tables...` : 'Download All PDF'}
                      </Button>
                    </div>
                  </div>

                  {/* Word Export Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Word Export</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button 
                        variant="default"
                        size="xs"
                        onClick={handleDownloadWord}
                        disabled={isExporting || isExportingAll || isPrinting}
                        className="rounded-full flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Download Word
                      </Button>
                      <Button 
                        variant="default"
                        size="xs"
                        onClick={handleDownloadAllWord}
                        disabled={isExporting || isExportingAll || isPrinting}
                        className="rounded-full flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        {isExportingAll ? `Exporting ${tables.length} tables...` : 'Download All Word'}
                      </Button>
                    </div>
                  </div>

                  {/* Print Controls Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Print Controls</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button 
                        variant="default"
                        size="xs"
                        onClick={handlePrint}
                        disabled={isExporting || isExportingAll || isPrinting}
                        className="rounded-full flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </Button>
                      <Button 
                        variant="default"
                        size="xs"
                        onClick={handlePrintAll}
                        disabled={isExporting || isExportingAll || isPrinting}
                        className="rounded-full flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Print All
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Main Content */}
      {!selectedEventId && (
        <Card className="ww-box p-8 text-center">
          <Users className="w-16 h-16 mx-auto text-primary mb-4" />
          <CardTitle className="mb-2">Select an Event</CardTitle>
          <CardDescription>
            Choose an event to start creating individual table seating charts
          </CardDescription>
        </Card>
      )}

      {selectedEventId && !selectedTableId && (
        <Card className="ww-box p-8 text-center">
          <Users className="w-16 h-16 mx-auto text-primary mb-4" />
          <CardTitle className="mb-2">Select a Table</CardTitle>
          <CardDescription>
            Choose a specific table to generate its seating chart
          </CardDescription>
        </Card>
      )}

      {isDataReady && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-transparent">
          {/* Customizer */}
          <div className="lg:col-span-1">
            <IndividualTableChartCustomizer
              settings={settings}
              onSettingsChange={handleSettingsChange}
            />
          </div>

          {/* Preview */}
          <div className="lg:col-span-3">
            <IndividualTableChartPreview
              settings={settings}
              table={selectedTable}
              guests={guests}
              event={selectedEvent}
              totalTables={tables.length}
              currentTableIndex={tables.findIndex(t => t.id === selectedTableId) + 1}
            />
          </div>
        </div>
      )}
    </div>
  );
};