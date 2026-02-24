/**
 * ============================================================================
 * 🔒 PRODUCTION LOCKED - DO NOT MODIFY 🔒
 * ============================================================================
 * 
 * ⚠️ THIS COMPONENT IS LOCKED FOR PRODUCTION USE ⚠️
 * 
 * ANY MODIFICATIONS TO THIS FILE REQUIRE EXPLICIT WRITTEN APPROVAL FROM OWNER
 * Unauthorized changes may break critical functionality and print layouts.
 * 
 * Main page component for Full Seating Chart feature. Handles event selection,
 * guest sorting, and coordinates between customizer, preview, and exporter.
 * 
 * CORE FUNCTIONALITY:
 * - Event selection and data loading
 * - Guest sorting (firstName, lastName, tableNo)
 * - Print functionality with helper toast
 * - PDF export coordination
 * - Settings management via custom hook
 * 
 * SORTING OPTIONS:
 * - firstName: Sort by "First Last" alphabetically
 * - lastName: Sort by "Last, First" alphabetically
 * - tableNo: Sort by table number, then first name
 * 
 * LAYOUT:
 * - 4-column grid: 1 col customizer, 3 cols preview
 * - Event selector in header
 * - Action buttons (Print, Download PDF)
 * - Loading states and empty states
 * 
 * Last locked: 2025-10-19
 * Status: PRODUCTION READY - NO CHANGES ALLOWED
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, Layout, Calendar, Share2 } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useFullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { useSeatingChartShare } from '@/hooks/useSeatingChartShare';
import { useToast } from '@/hooks/use-toast';
import { FullSeatingChartPreview } from './FullSeatingChartPreview';
import { FullSeatingChartCustomizer } from './FullSeatingChartCustomizer';
import { SeatingChartShareModal } from './SeatingChartShareModal';
import { exportFullSeatingChartToPdf } from '@/lib/fullSeatingChartPdfExporter';

interface FullSeatingChartPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export const FullSeatingChartPage: React.FC<FullSeatingChartPageProps> = ({
  selectedEventId,
  onEventSelect
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const { events, loading: eventsLoading } = useEvents();
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);
  const { settings, loading: settingsLoading, updateSettings } = useFullSeatingChartSettings(selectedEventId);
  const { shareTokens, fetchShareTokens, generateShareToken, deleteShareToken } = useSeatingChartShare(selectedEventId);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedEventId) fetchShareTokens();
  }, [selectedEventId, fetchShareTokens]);

  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;

  const handleEventSelect = (eventId: string) => {
    if (eventId === "no-event") return;
    onEventSelect(eventId);
  };

  /**
   * AUTOFIT CALCULATION - Dynamic guests per page based on font size and visible fields
   * Must match the calculation in FullSeatingChartPreview and fullSeatingChartPdfExporter
   */
  const guestsPerPage = React.useMemo(() => {
    const baseRowHeight: Record<string, number> = {
      'small': 5.5,
      'medium': 6,
      'large': 7
    };
    
    let rowHeight = baseRowHeight[settings.fontSize] || 6;
    
    // Add extra height if dietary or relation info is shown
    if (settings.showDietary) rowHeight += 2.5;
    if (settings.showRelation) rowHeight += 2.5;
    
    // Available height for guest rows - reduced to leave ~24mm gap above footer
    const availableHeight = 190; // mm for guest rows
    
    const calculatedGuestsPerColumn = Math.floor(availableHeight / rowHeight);
    // Clamp to minimum 1 guest per column
    const guestsPerColumn = Math.max(1, calculatedGuestsPerColumn);
    return guestsPerColumn * 2; // Two columns
  }, [settings.fontSize, settings.showDietary, settings.showRelation]);

  const handleDownloadPdf = async () => {
    if (!selectedEvent) return;
    
    setIsExporting(true);
    try {
      toast({
        title: 'Generating PDF',
        description: 'Creating your seating chart...',
      });

      // Calculate current page guests based on auto-fit
      const currentPageIndex = 0; // For single page download, we use first page logic
      const startIdx = currentPageIndex * guestsPerPage;
      const endIdx = Math.min(startIdx + guestsPerPage, sortedGuests.length);
      const currentPageGuests = sortedGuests.slice(startIdx, endIdx);

      await exportFullSeatingChartToPdf(selectedEvent, currentPageGuests, settings, 1, 1);

      toast({
        title: 'PDF Downloaded',
        description: 'Current page has been saved',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdfAll = async () => {
    if (!selectedEvent) return;
    
    setIsExporting(true);
    try {
      toast({
        title: 'Generating PDF',
        description: 'Creating your full seating chart...',
      });

      await exportFullSeatingChartToPdf(selectedEvent, sortedGuests, settings);

      toast({
        title: 'PDF Downloaded',
        description: 'Your complete seating chart has been saved',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
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
    <div className="space-y-6 full-seating-chart-dark-purple">
      {/* Header */}
      <Card className="ww-box print:hidden">
        <CardHeader className="space-y-4">
          {/* Event Selector */}
          <div className="flex items-center justify-between">
            {/* Header Icon & Info */}
            <div className="flex items-center gap-4">
              <FileText className="w-12 h-12 text-primary" />
              <div>
                <CardTitle className="text-left text-2xl font-medium text-[#7248e6]">Full Seating Chart</CardTitle>
                <CardDescription className="text-left">
                  Complete guest list with check-off boxes
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Choose Event:
              </label>
              <Select value={selectedEventId || "no-event"} onValueChange={handleEventSelect}>
                <SelectTrigger className="w-full sm:w-[300px] border-primary focus:ring-primary font-bold text-[#7248e6]">
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
          </div>

          {/* Event Details with Status & Actions */}
          {selectedEvent && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4">
                <span className="text-lg font-normal bg-gradient-to-r from-[#7C3AED] to-[#9333EA] bg-clip-text text-transparent">
                  Full Seating Chart for {selectedEvent.name}
                </span>
                <Badge 
                  variant="outline"
                  className="ml-4 bg-white border-primary text-primary rounded-full"
                >
                  <Users className="w-4 h-4 mr-1.5" />
                  {guestsLoading ? "Loading..." : `${guests.length} guests`}
                </Badge>
                <Badge 
                  variant="outline"
                  className="bg-white border-primary text-primary rounded-full"
                >
                  {isDataReady ? 'Ready to Generate' : 'Loading Data...'}
                </Badge>
              </div>

              {/* Export Controls */}
              {isDataReady && (
                <div className="border border-primary rounded-xl p-3 flex flex-col gap-3">
                  <div className="flex items-center">
                    <span className="font-bold text-sm">Export Controls</span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      Download the Full Seating Chart or share with your vendors.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      onClick={() => setShareModalOpen(true)}
                    >
                      <Share2 className="w-3 h-3" />
                      Share with...
                    </button>
                    <button
                      className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      onClick={handleDownloadPdf}
                      disabled={isExporting}
                    >
                      <FileText className="w-3 h-3" />
                      Download single page PDF
                    </button>
                    <button
                      className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      onClick={handleDownloadPdfAll}
                      disabled={isExporting}
                    >
                      <FileText className="w-3 h-3" />
                      Download all pages PDF
                    </button>
                  </div>
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

      {/* Share Modal */}
      <SeatingChartShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        shareTokens={shareTokens}
        onGenerateToken={generateShareToken}
        onDeleteToken={deleteShareToken}
      />
    </div>
  );
};