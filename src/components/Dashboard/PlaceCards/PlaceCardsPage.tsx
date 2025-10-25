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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useEvents } from '@/hooks/useEvents';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { Guest } from '@/hooks/useGuests';
import { usePlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { PlaceCardCustomizer } from './PlaceCardCustomizer';
import { PlaceCardPreview } from './PlaceCardPreview';
import { PlaceCardExporter } from './PlaceCardExporter';
import { Loader2, Users, Settings, FileText } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { exportPlaceCardPageToPdf, exportAllPlaceCardsToPdf } from '@/lib/placeCardsPdfExporter';
import { exportPlaceCardPageToDocx, exportAllPlaceCardsToDocx } from '@/lib/placeCardsDocxExporter';

export const PlaceCardsPage: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [focusedPage, setFocusedPage] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPage, setSelectedPage] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { events, loading: eventsLoading } = useEvents();
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);
  const { settings, loading: settingsLoading, updateSettings } = usePlaceCardSettings(selectedEventId);
  const { toast } = useToast();

  const selectedEvent = events.find(event => event.id === selectedEventId);
  const assignedGuests = guests.filter(guest => guest.assigned && guest.table_no && guest.seat_no);
  const totalPages = Math.ceil(assignedGuests.length / 6);

  // Load saved event selection from localStorage
  React.useEffect(() => {
    const savedEventId = localStorage.getItem('place_cards_event_id');
    if (savedEventId && !selectedEventId && events.length > 0) {
      const eventExists = events.find(e => e.id === savedEventId);
      if (eventExists) {
        setSelectedEventId(savedEventId);
      }
    }
  }, [events, selectedEventId]);

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    localStorage.setItem('place_cards_event_id', eventId);
  };

  const handleDownloadPdfPage = async () => {
    setIsProcessing(true);
    setIsExporting(true);
    
    try {
      toast({
        title: 'Generating PDF',
        description: `Creating place cards for page ${selectedPage + 1}...`,
      });

      await exportPlaceCardPageToPdf(settings, assignedGuests, selectedEvent, selectedPage);

      toast({
        title: 'PDF Downloaded',
        description: `Page ${selectedPage + 1} has been saved`,
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
        description: `Creating place cards for page ${selectedPage + 1}...`,
      });

      await exportPlaceCardPageToDocx(settings, assignedGuests, selectedEvent, selectedPage);

      toast({
        title: 'Word Document Downloaded',
        description: `Page ${selectedPage + 1} has been saved`,
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
    <div className="space-y-6">
      {/* Combined Header Box */}
      <Card className="ww-box">
        <CardContent className="space-y-6 pt-6">
          {/* LINE 1: Event Selection & Title */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Left: Event Selection */}
            <div className="flex-1 max-w-md">
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Event Selection
              </label>
              <Select value={selectedEventId || ""} onValueChange={handleEventChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} - {event.date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Right: Title & Subtitle */}
            <div className="text-right">
              <h1 className="text-2xl font-bold gradient-text">Table Name Place Cards</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Create professional foldable place cards for your guests
              </p>
            </div>
          </div>

          {/* LINE 2: Statistics & Information */}
          {selectedEvent && assignedGuests.length > 0 && (
            <div className="text-sm space-y-2 py-4 border-y border-border">
              {/* Main stats line */}
              <p className="font-medium">
                {assignedGuests.length} assigned guests - {assignedGuests.length} place cards ready for export. {totalPages} A4 page{totalPages !== 1 ? 's' : ''} (6 cards per page). Standard 105mm × 99mm foldable place cards.
              </p>
              
              {/* Quality information */}
              <div className="text-muted-foreground space-y-1 mt-3">
                <p>• All exports are 300 DPI for professional quality</p>
                <p>• PDF exports maintain exact A4 dimensions (210×297mm)</p>
                <p>• Image exports are 2480×3508 pixels (A4 @ 300 DPI)</p>
                <p>• We have made it easy for you to print & cut at home or get it done at your local printer</p>
              </div>
            </div>
          )}

          {/* LINE 3: Export Controls (after separator) */}
          {selectedEventId && selectedEvent && assignedGuests.length > 0 && (
            <>
              {(guestsLoading || settingsLoading) ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading export options...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Page Selection */}
                  <div className="space-y-2">
                    <Label>Page Selection</Label>
                    <Select 
                      value={selectedPage.toString()} 
                      onValueChange={(value) => setSelectedPage(parseInt(value))}
                      disabled={totalPages === 1}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: totalPages }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            Page {i + 1} of {totalPages}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Export Controls */}
                  <div className="space-y-2">
                    <Label>Export Controls</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadPdfPage}
                        disabled={isProcessing}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadPdfAll}
                        disabled={isProcessing}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Download All PDF
                      </Button>
                    </div>
                  </div>

                  {/* Word Export */}
                  <div className="space-y-2">
                    <Label>Word Export</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadWordPage}
                        disabled={isProcessing}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Download Word
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadWordAll}
                        disabled={isProcessing}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Download All Word
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bottom Section - Resizable Layout */}
      {selectedEventId && selectedEvent && assignedGuests.length > 0 && !guestsLoading && !settingsLoading && (
        <ResizablePanelGroup direction="horizontal" className="min-h-[800px] rounded-lg border">
          {/* Left Panel - Customizer */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <div className="h-full overflow-auto p-4">
              <PlaceCardCustomizer
                settings={settings}
                onSettingsChange={updateSettings}
                guests={assignedGuests}
              />
            </div>
          </ResizablePanel>

          {/* Resize Handle */}
          <ResizableHandle withHandle />

          {/* Right Panel - Preview */}
          <ResizablePanel defaultSize={70} minSize={60} maxSize={75}>
            <div className="h-full overflow-auto p-4">
              <PlaceCardPreview
                settings={settings}
                guests={assignedGuests}
                event={selectedEvent}
                isExporting={isExporting}
                focusedPage={focusedPage}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
};