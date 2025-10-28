import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileText, Printer, Plus, ClipboardList, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useRunningSheet } from '@/hooks/useRunningSheet';
import { useToast } from '@/hooks/use-toast';
import { VenueLogoUpload } from './VenueLogoUpload';
import { RunningSheetTable } from './RunningSheetTable';
import { exportRunningSheetToPdf } from '@/lib/runningSheetPdfExporter';
import { exportRunningSheetToDocx } from '@/lib/runningSheetDocxExporter';
import { format } from 'date-fns';
import runningSheetLogo from '@/assets/wedding-waitress-dietary-logo.png';

const PURPLE_ACCENT = '#6D28D9';

// Helper functions for date formatting
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
  const date = new Date(dateString);
  const day = date.getDate();
  const ordinal = getOrdinalSuffix(day);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${weekday}, ${day}${ordinal}, ${month} ${year}`;
};

const formatGeneratedTimestamp = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB');
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
  return `${dateStr} Time: ${timeStr}`;
};

export const RunningSheetPage: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const { events, loading: eventsLoading } = useEvents();
  const { sheet, items, loading: sheetLoading, createItem, deleteItem, updateSheet, debouncedSave, reorderItems } = useRunningSheet(selectedEventId);
  const { toast } = useToast();

  // Pagination
  const itemsPerPage = 15;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  // Load saved event selection from localStorage
  useEffect(() => {
    const savedEventId = localStorage.getItem('running-sheet-selected-event');
    if (savedEventId && events.some(e => e.id === savedEventId)) {
      setSelectedEventId(savedEventId);
    } else if (events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [events]);

  // Save event selection to localStorage
  useEffect(() => {
    if (selectedEventId) {
      localStorage.setItem('running-sheet-selected-event', selectedEventId);
    }
  }, [selectedEventId]);

  // Reset to page 1 when event changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEventId]);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const formatLastUpdated = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return '-';
    }
  };

  const handleAddRow = async () => {
    await createItem({
      time_text: '',
      description_rich: {},
      responsible: '',
      is_section_header: false,
    });
  };

  const handleAddSectionHeader = async () => {
    await createItem({
      time_text: '',
      description_rich: { text: '', formatting: {} },
      responsible: '',
      is_section_header: true,
    });
  };

  const handleDownloadPdf = async () => {
    if (!selectedEvent || !sheet) return;

    setIsExporting(true);
    try {
      await exportRunningSheetToPdf(selectedEvent, sheet, items);
      toast({
        title: '✓ Downloaded',
        description: 'PDF exported successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!selectedEvent || !sheet) return;

    setIsExporting(true);
    try {
      await exportRunningSheetToDocx(selectedEvent, sheet, items);
      toast({
        title: '✓ Downloaded',
        description: 'Word document exported successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Word export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export Word document',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (!selectedEvent || !sheet) return;
    
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 1000);
  };

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Events Found</h3>
            <p className="text-muted-foreground">
              Create an event first to start building your running sheet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Print Styles */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            background: white !important;
            width: 210mm;
            height: auto;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-page {
            position: relative;
            width: 210mm;
            height: 297mm;
            padding: 15mm 12mm;
            display: flex;
            flex-direction: column;
            background-color: white !important;
            box-sizing: border-box;
            page-break-after: always;
            overflow: visible;
          }
          
          .print-page:last-child {
            page-break-after: auto;
          }
          
          .print-header {
            margin-bottom: 4mm;
            break-inside: avoid;
          }
          
          .print-header h1 {
            font-size: 16pt !important;
            line-height: 1.1 !important;
            margin: 0 0 2mm 0 !important;
          }
          
          .print-header h2 {
            margin: 0 0 2mm 0 !important;
            line-height: 1.1 !important;
            font-size: 12pt !important;
          }
          
          .print-header .meta-line {
            font-size: 10pt !important;
            padding-bottom: 2mm !important;
            margin-bottom: 2mm !important;
          }
          
          .print-page .flex-1 { 
            padding-bottom: 12mm !important; 
            overflow: visible !important; 
          }
          
          .print-page .print-footer {
            position: absolute;
            bottom: 10mm;
            left: 12mm;
            right: 12mm;
            display: flex;
            justify-content: center;
            break-inside: avoid;
          }
          
          .print-page .print-footer img {
            height: 10.5mm;
            width: auto;
            object-fit: contain;
          }
          
          .running-sheet-row {
            page-break-inside: avoid;
            margin-bottom: 2mm;
          }
          
          .screen-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Hero Panel */}
      <Card className="border-2 border-primary/20 no-print">
        <CardContent className="p-6 space-y-4">
          {/* Row A: Title + Event Selector + Meta */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-3xl font-bold" style={{ color: PURPLE_ACCENT }}>
              Running Sheet for Weddings & Events
            </h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Select value={selectedEventId || undefined} onValueChange={setSelectedEventId}>
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Select an event..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} {event.date && `- ${format(new Date(event.date), 'dd/MM/yyyy')}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                Last updated by: {sheet?.updated_by_name || '-'} – {formatLastUpdated(sheet?.updated_at)}
              </div>
            </div>
          </div>

          {/* Row B: Logo + Upload Instructions */}
          <div className="flex items-center gap-6">
            <VenueLogoUpload
              logoUrl={sheet?.venue_logo_url || null}
              onUpload={(url) => updateSheet({ venue_logo_url: url })}
            />
            <div className="text-sm text-muted-foreground">
              Upload logo, Wedding Couple Photo or Event Image.
            </div>
          </div>

          {/* Row C: Separator */}
          <Separator />

          {/* Row D: Export/Print Controls */}
          {selectedEvent && sheet && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Export Controls */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Export Controls</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={handleDownloadPdf}
                    disabled={isExporting || isPrinting}
                    style={{ background: PURPLE_ACCENT }}
                    className="text-white"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    Download PDF
                  </Button>
                </div>
              </div>

              {/* Word Export */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Word Export</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={handleDownloadWord}
                    disabled={isExporting || isPrinting}
                    style={{ background: PURPLE_ACCENT }}
                    className="text-white"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    Download Word
                  </Button>
                </div>
              </div>

              {/* Print Controls */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Print Controls</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={handlePrint}
                    disabled={isExporting || isPrinting}
                    style={{ background: PURPLE_ACCENT }}
                    className="text-white"
                  >
                    {isPrinting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4 mr-2" />
                    )}
                    Print
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls Card */}
      {selectedEvent && sheet && (
        <Card className="no-print">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>Timeline Items</CardTitle>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={sheet.show_responsible}
                    onCheckedChange={(checked) => updateSheet({ show_responsible: checked })}
                  />
                  <Label>Show "Responsible" column</Label>
                </div>
                <Button onClick={handleAddRow} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Row
                </Button>
                <Button onClick={handleAddSectionHeader} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Section Header
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* A4 Page View - Screen Only */}
      {selectedEvent && sheet && (
        <>
          {sheetLoading ? (
            <div className="flex items-center justify-center py-12 screen-only">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 screen-only">
              <ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Start building your Running Sheet</h3>
              <p className="text-muted-foreground mb-4">Add your first timeline item to get started</p>
              <Button onClick={handleAddRow}>
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
            </div>
          ) : (
            <>
              {/* Page Navigation - Top */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mb-4 screen-only">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              {/* A4 Page Container */}
              <div className="flex justify-center screen-only">
                <div 
                  className="bg-white shadow-lg"
                  style={{
                    width: '210mm', 
                    height: '297mm',
                    minWidth: '210mm',
                    maxWidth: '210mm',
                    border: '2px solid #6D28D9'
                  }}
                >
                  <div style={{ padding: '5mm 12mm' }} className="h-full flex flex-col">
                    {/* Header - Two Column Layout */}
                    <div className="flex gap-3 mb-[4mm]">
                      {/* Left: Image Box */}
                      <div 
                        className="flex items-center justify-center flex-shrink-0"
                        style={{ 
                          width: '50mm', 
                          height: '30mm',
                          border: '0.5px solid #6D28D9',
                          borderRadius: '8px',
                          padding: '4px'
                        }}
                      >
                        {sheet.venue_logo_url ? (
                          <img 
                            src={sheet.venue_logo_url}
                            alt="Event Logo"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center text-xs text-muted-foreground">
                            No image uploaded
                          </div>
                        )}
                      </div>

                      {/* Right: Event Information Box */}
                      <div 
                        className="flex-1 flex flex-col items-center justify-center"
                        style={{ 
                          minHeight: '30mm',
                          border: '0.5px solid #6D28D9',
                          borderRadius: '8px',
                          padding: '8px'
                        }}
                      >
                        <h1 className="text-base font-bold mb-1" style={{ color: '#6D28D9' }}>
                          {selectedEvent.name}
                        </h1>
                        <h2 className="font-bold text-xs text-foreground mb-1">
                          Running Sheet - {formatDateWithOrdinal(selectedEvent.date)}
                        </h2>
                        <div className="text-xs text-foreground text-center">
                          {selectedEvent.venue && `${selectedEvent.venue} - `}
                          Total Items: {items.length}
                          {totalPages > 1 && ` - Page ${currentPage} of ${totalPages}`}
                          {` - Generated on: ${formatGeneratedTimestamp()}`}
                        </div>
                      </div>
                    </div>

                    {/* Running Sheet Content */}
                    <div className="flex-1 overflow-hidden mt-4">
                      <RunningSheetTable
                        items={paginatedItems}
                        showResponsible={sheet.show_responsible}
                        onUpdateItem={debouncedSave}
                        onDeleteItem={deleteItem}
                        onReorder={reorderItems}
                      />
                    </div>

                    {/* Footer with Logo */}
                    <div className="mt-auto pt-4 flex justify-center">
                      <img 
                        src={runningSheetLogo}
                        alt="Wedding Waitress" 
                        style={{ height: '10.5mm', width: 'auto', objectFit: 'contain' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Page Navigation - Bottom */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4 screen-only">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              {/* Print Version - Multiple A4 Pages */}
              <div id="running-sheet-print-content" className="hidden print:block">
                {Array.from({ length: totalPages }, (_, pageIndex) => {
                  const pageItems = items.slice(
                    pageIndex * itemsPerPage,
                    (pageIndex + 1) * itemsPerPage
                  );
                  
                  if (pageItems.length === 0) return null;
                  
                  return (
                    <div key={pageIndex} className="print-page">
                      {/* Header - Two Column Layout */}
                      <div className="print-header flex gap-3">
                        {/* Left: Image Box */}
                        <div 
                          className="flex items-center justify-center flex-shrink-0"
                          style={{ 
                            width: '50mm', 
                            height: '30mm',
                            border: '0.5px solid #6D28D9',
                            borderRadius: '8px',
                            padding: '4px'
                          }}
                        >
                          {sheet.venue_logo_url ? (
                            <img 
                              src={sheet.venue_logo_url}
                              alt="Event Logo"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-center text-xs text-muted-foreground">
                              No image uploaded
                            </div>
                          )}
                        </div>

                        {/* Right: Event Information Box */}
                        <div 
                          className="flex-1 flex flex-col items-center justify-center"
                          style={{ 
                            minHeight: '30mm',
                            border: '0.5px solid #6D28D9',
                            borderRadius: '8px',
                            padding: '8px'
                          }}
                        >
                          <h1 className="text-xl font-semibold mb-1" style={{ color: '#6D28D9' }}>
                            {selectedEvent.name}
                          </h1>
                          <h2 className="font-semibold text-foreground mb-1">
                            Running Sheet - {formatDateWithOrdinal(selectedEvent.date)}
                          </h2>
                          <div className="meta-line text-base text-foreground text-center">
                            {selectedEvent.venue && `${selectedEvent.venue} - `}
                            Total Items: {items.length}
                            {totalPages > 1 && ` - Page ${pageIndex + 1} of ${totalPages}`}
                            {` - Generated on: ${formatGeneratedTimestamp()}`}
                          </div>
                        </div>
                      </div>

                      {/* Running Sheet Content */}
                      <div className="flex-1 overflow-visible" style={{ paddingTop: '4mm', paddingBottom: '12mm' }}>
                        <RunningSheetTable
                          items={pageItems}
                          showResponsible={sheet.show_responsible}
                          onUpdateItem={debouncedSave}
                          onDeleteItem={deleteItem}
                          onReorder={reorderItems}
                        />
                      </div>

                      {/* Footer with Logo */}
                      <div className="print-footer">
                        <img 
                          src={runningSheetLogo}
                          alt="Wedding Waitress"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
