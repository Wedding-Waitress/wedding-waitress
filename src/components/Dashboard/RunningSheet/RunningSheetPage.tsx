import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileText, Printer, Plus, ClipboardList, Loader2 } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useRunningSheet } from '@/hooks/useRunningSheet';
import { useToast } from '@/hooks/use-toast';
import { VenueLogoUpload } from './VenueLogoUpload';
import { RunningSheetTable } from './RunningSheetTable';
import { exportRunningSheetToPdf } from '@/lib/runningSheetPdfExporter';
import { exportRunningSheetToDocx } from '@/lib/runningSheetDocxExporter';
import { format } from 'date-fns';

const PURPLE_ACCENT = '#6D28D9';

export const RunningSheetPage: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const { events, loading: eventsLoading } = useEvents();
  const { sheet, items, loading: sheetLoading, createItem, deleteItem, updateSheet, debouncedSave, reorderItems } = useRunningSheet(selectedEventId);
  const { toast } = useToast();

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
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm 12mm;
          }
          
          .no-print {
            display: none !important;
          }
          
          .running-sheet-row {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Top Hero Panel */}
      <Card className="border-2 border-primary/20 no-print">
        <CardContent className="p-6 space-y-4">
          {/* Row A: Logo + Last Updated */}
          <div className="flex items-center gap-6">
            <VenueLogoUpload
              logoUrl={sheet?.venue_logo_url || null}
              onUpload={(url) => updateSheet({ venue_logo_url: url })}
            />
            <div className="text-sm text-muted-foreground">
              Last updated by: {sheet?.updated_by_name || '-'} – Last updated Date: {formatLastUpdated(sheet?.updated_at)}
            </div>
          </div>

          {/* Row B: Title + Event Selector + Meta */}
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

      {/* Main Table Editor */}
      {selectedEvent && sheet && (
        <Card>
          <CardHeader className="no-print">
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
          <CardContent>
            {sheetLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Start building your Running Sheet</h3>
                <p className="text-muted-foreground mb-4">Add your first timeline item to get started</p>
                <Button onClick={handleAddRow}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Row
                </Button>
              </div>
            ) : (
              <RunningSheetTable
                items={items}
                showResponsible={sheet.show_responsible}
                onUpdateItem={debouncedSave}
                onDeleteItem={deleteItem}
                onReorder={reorderItems}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
