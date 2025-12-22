/**
 * ⚠️ PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL ⚠️
 * 
 * This Place Cards feature is COMPLETE and LOCKED.
 * All functionality has been thoroughly tested and approved.
 * 
 * DO NOT make changes unless explicitly requested by the project owner.
 * Any modifications could break the carefully calibrated 300 DPI export system.
 * 
 * Last completed: 2025-10-04
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useEvents } from '@/hooks/useEvents';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useTables } from '@/hooks/useTables';
import { Guest } from '@/hooks/useGuests';
import { usePlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { PlaceCardCustomizer } from './PlaceCardCustomizer';
import { PlaceCardPreview } from './PlaceCardPreview';
import { PlaceCardExporter } from './PlaceCardExporter';
import { Loader2, Users, Settings, FileText, Printer, Calendar } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { exportPlaceCardPageToPdf, exportAllPlaceCardsToPdf } from '@/lib/placeCardsPdfExporter';
import { exportPlaceCardPageToDocx, exportAllPlaceCardsToDocx } from '@/lib/placeCardsDocxExporter';

interface PlaceCardsPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export const PlaceCardsPage: React.FC<PlaceCardsPageProps> = ({
  selectedEventId,
  onEventSelect
}) => {
  const [focusedPage, setFocusedPage] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPage, setSelectedPage] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  const { events, loading: eventsLoading } = useEvents();
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);
  const { tables, loading: tablesLoading } = useTables(selectedEventId);
  const { settings, loading: settingsLoading, updateSettings } = usePlaceCardSettings(selectedEventId);
  const { toast } = useToast();

  const selectedEvent = events.find(event => event.id === selectedEventId);
  const selectedTable = tables.find(table => table.id === selectedTableId);
  
  // Filter guests by assigned status - require table selection to show guests
  const assignedGuests = selectedTableId 
    ? guests.filter(guest => 
        guest.assigned && 
        guest.table_id === selectedTableId
      )
    : [];
  const totalPages = Math.ceil(assignedGuests.length / 6);

  const handleEventChange = (eventId: string) => {
    if (eventId === "no-event") return;
    onEventSelect(eventId);
    setSelectedTableId(null); // Reset table selection when event changes
  };

  const handleDownloadPdfPage = async () => {
    setIsProcessing(true);
    setIsExporting(true);
    
    try {
      toast({
        title: 'Generating PDF',
        description: `Creating place cards for page 1...`,
      });

      await exportPlaceCardPageToPdf(settings, assignedGuests, selectedEvent, 0);

      toast({
        title: 'PDF Downloaded',
        description: `Page 1 has been saved`,
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setIsExporting(false);
    }
  };

  const handleDownloadPdfAll = async () => {
    setIsProcessing(true);
    setIsExporting(true);
    
    try {
      toast({
        title: 'Generating PDF',
        description: `Creating place cards for all ${totalPages} pages...`,
      });

      await exportAllPlaceCardsToPdf(settings, assignedGuests, selectedEvent, totalPages);

      toast({
        title: 'PDF Downloaded',
        description: `All ${totalPages} pages have been saved`,
      });
    } catch (error) {
      console.error('PDF export all error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export all pages',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setIsExporting(false);
    }
  };

  const handleDownloadWordPage = async () => {
    setIsProcessing(true);
    setIsExporting(true);
    
    try {
      toast({
        title: 'Generating Word Document',
        description: `Creating place cards for page 1...`,
      });

      await exportPlaceCardPageToDocx(settings, assignedGuests, selectedEvent, 0);

      toast({
        title: 'Word Document Downloaded',
        description: `Page 1 has been saved`,
      });
    } catch (error) {
      console.error('DOCX export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate Word document',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setIsExporting(false);
    }
  };

  const handleDownloadWordAll = async () => {
    setIsProcessing(true);
    setIsExporting(true);
    
    try {
      toast({
        title: 'Generating Word Document',
        description: `Creating place cards for all ${totalPages} pages...`,
      });

      await exportAllPlaceCardsToDocx(settings, assignedGuests, selectedEvent, totalPages);

      toast({
        title: 'Word Document Downloaded',
        description: `All ${totalPages} pages have been saved`,
      });
    } catch (error) {
      console.error('DOCX export all error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export all pages',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (!selectedEvent || assignedGuests.length === 0) return;
    
    toast({
      title: 'Opening Print Dialog',
      description: 'Preparing place cards for printing...',
    });
    
    // Small delay to show toast before print dialog
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handlePrintAll = () => {
    // Same as handlePrint - the print version already renders all pages
    handlePrint();
  };

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading events...</span>
      </div>
    );
  }

  if (!events.length) {
    return (
      <Card className="ww-box">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Events Found</h3>
            <p className="text-sm text-muted-foreground">Create an event first to generate place cards.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 place-cards-page">
      {/* Combined Header Box */}
      <Card className="ww-box">
        <CardContent className="space-y-4 pt-6">
          {/* TOP ROW: Title (left) + Export Controls Box (right) */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Left: Title & Subtitle */}
            <div className="text-left">
              <h1 className="text-2xl font-medium text-primary">Table Name Place Cards</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Create professional foldable place cards for your guests
              </p>
            </div>

            {/* Right: Export Controls Box (only when event selected and guests exist) */}
            {selectedEvent && assignedGuests.length > 0 && !guestsLoading && !settingsLoading && (
              <div className="border border-primary rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-medium">Export Controls</h3>
                <p className="text-muted-foreground text-sm">
                  Download your place cards as PDF.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    variant="default"
                    size="xs"
                    onClick={handleDownloadPdfPage}
                    disabled={isProcessing}
                    className="rounded-full flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Download PDF
                  </Button>
                  <Button 
                    variant="default"
                    size="xs"
                    onClick={handleDownloadPdfAll}
                    disabled={isProcessing}
                    className="rounded-full flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Download All PDF
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* SEPARATOR */}
          <div className="border-b border-border" />

          {/* STATISTICS & INFORMATION */}
          {selectedEvent && assignedGuests.length > 0 && (
            <div className="text-sm space-y-2">
              {/* Main stats line */}
              <p className="font-medium">
                {selectedTable ? `Table ${selectedTable.table_no} - ` : ''}
                {assignedGuests.length} assigned guests - {assignedGuests.length} place cards ready for export. {totalPages} A4 page{totalPages !== 1 ? 's' : ''} (6 cards per page). Standard 105mm × 99mm foldable place cards.
              </p>
              
              {/* Quality information */}
              <div className="text-muted-foreground space-y-1 mt-3">
                <p>• All exports are 300 DPI for professional quality</p>
                <p>• PDF exports maintain exact A4 dimensions (210×297mm)</p>
                <p>• Image exports are 2480×3508 pixels (A4 @ 300 DPI)</p>
                <p>• We have made it easy for you to print & cut at home or get it done at your local printer</p>
                <p>• Background images must be smaller than 5MB</p>
              </div>
            </div>
          )}

          {/* CHOOSE EVENT & TABLE DROPDOWNS */}
          <div className="flex items-center gap-8 flex-wrap pt-2">
            {/* Choose Event */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Choose Event:
              </label>
              <Select value={selectedEventId || "no-event"} onValueChange={handleEventChange}>
                <SelectTrigger className="w-[300px] border-primary focus:ring-primary font-bold text-primary">
                  <SelectValue placeholder="Choose Event" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {events.length > 0 ? (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
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

            {/* Table Selection (only when event is selected) */}
            {selectedEventId && (
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
                    {[...tables].sort((a, b) => (a.table_no || 0) - (b.table_no || 0)).map((table) => {
                      // Display table name, or "Table {number}" if name is just a number
                      const displayName = table.table_no && table.name === String(table.table_no)
                        ? `Table ${table.table_no}`
                        : table.name || `Table ${table.table_no}`;
                      
                      return (
                        <SelectItem key={table.id} value={table.id}>
                          {displayName} ({table.guest_count} of {table.limit_seats} guests)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Placeholder when no event selected */}
      {!selectedEventId && (
        <Card className="ww-box p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="text-xl mb-2 text-muted-foreground">Select an Event</CardTitle>
          <CardDescription className="text-base">
            Choose an event above to start creating place cards
          </CardDescription>
        </Card>
      )}

      {/* Placeholder when event selected but no table selected */}
      {selectedEventId && !selectedTableId && (
        <Card className="ww-box p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="text-xl mb-2 text-muted-foreground">Select a Table</CardTitle>
          <CardDescription className="text-base">
            Choose a table above to view and create place cards for guests at that table
          </CardDescription>
        </Card>
      )}

      {/* Bottom Section - Grid Layout */}
      {selectedEventId && selectedTableId && selectedEvent && assignedGuests.length > 0 && !guestsLoading && !settingsLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Customizer */}
          <div className="lg:col-span-1">
            <PlaceCardCustomizer
              settings={settings}
              onSettingsChange={updateSettings}
              guests={assignedGuests}
            />
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-3">
            <PlaceCardPreview
              settings={settings}
              guests={assignedGuests}
              event={selectedEvent}
              isExporting={isExporting}
              focusedPage={focusedPage}
            />
          </div>
        </div>
      )}
    </div>
  );
};