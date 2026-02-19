import React, { useState } from 'react';
import { ClipboardList, Loader2, FileText, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportRunningSheetPDF, exportRunningSheetSectionPDF } from '@/lib/runningSheetPdfExporter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StandardEventSelector } from '../StandardEventSelector';
import { RunningSheetSection } from './RunningSheetSection';
import { RunningSheetShareModal } from './RunningSheetShareModal';
import { useRunningSheet } from '@/hooks/useRunningSheet';
import { useEvents } from '@/hooks/useEvents';

interface RunningSheetPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

// Format date as "Saturday, 5th December 2026"
const formatFullDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; }
  };
  return `${dayOfWeek}, ${day}${getOrdinalSuffix(day)} ${month} ${year}`;
};

const formatTimeDisplay = (time: string | null | undefined): string => {
  if (!time) return 'TBD';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

export function RunningSheetPage({ selectedEventId, onEventSelect }: RunningSheetPageProps) {
  const { events } = useEvents();
  const { toast } = useToast();
  const [showShareModal, setShowShareModal] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const {
    sheet,
    loading,
    saving,
    sectionLabel,
    setSectionLabel,
    sectionNotes,
    setSectionNotes,
    shareTokens,
    updateItem,
    addItem,
    deleteItem,
    duplicateItem,
    reorderItems,
    resetToDefault,
    generateShareToken,
    deleteShareToken,
  } = useRunningSheet(selectedEventId);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const handleDownloadEntirePDF = async () => {
    if (!sheet || !selectedEvent) return;
    setDownloadingPDF(true);
    try {
      await exportRunningSheetPDF(sheet.items, selectedEvent, sectionLabel, sectionNotes);
      toast({ title: 'PDF Downloaded', description: 'Your Running Sheet has been downloaded.' });
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast({ title: 'Download Failed', description: 'There was an error generating the PDF.', variant: 'destructive' });
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadSectionPDF = async () => {
    if (!selectedEvent || !sheet) return;
    try {
      await exportRunningSheetSectionPDF(sheet.items, selectedEvent, sectionLabel, sectionNotes);
      toast({ title: 'Section PDF Downloaded', description: `"${sectionLabel}" has been downloaded.` });
    } catch (error) {
      console.error('Failed to download section PDF:', error);
      toast({ title: 'Download Failed', description: 'There was an error generating the PDF.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Running Sheet</h1>
            <p className="text-sm text-muted-foreground">
              Organise the perfect schedule for your wedding or event
            </p>
          </div>
        </div>
        {saving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </div>
        )}
      </div>

      {/* Event Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-shrink-0">
              <StandardEventSelector events={events} selectedEventId={selectedEventId} onEventSelect={onEventSelect} />
            </div>

            {selectedEventId && sheet && (
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)} className="rounded-full flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Share with...
                </Button>

                <div className="border border-primary rounded-xl p-3 flex items-center gap-4">
                  <div className="text-sm">
                    <span className="font-medium">Export Controls</span>
                    <span className="text-muted-foreground ml-2">Download your running sheet and share it with your DJ-MC or wedding venue.</span>
                  </div>
                  <Button variant="default" size="sm" onClick={handleDownloadEntirePDF} disabled={downloadingPDF} className="rounded-full flex items-center gap-2">
                    {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Download entire running sheet PDF
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {!selectedEventId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select an event to start planning your running sheet</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading running sheet...</p>
          </CardContent>
        </Card>
      ) : sheet ? (
        <div className="space-y-4">
          {/* Event header */}
          {selectedEvent && (
            <div className="text-center py-4 border-b border-border space-y-3">
              <h2 className="text-xl font-semibold text-primary">{selectedEvent.name}</h2>
              <div className={`flex justify-center gap-8 flex-wrap ${
                selectedEvent.ceremony_enabled && selectedEvent.reception_enabled !== false ? '' : 'max-w-md mx-auto'
              }`}>
                {selectedEvent.ceremony_enabled && (
                  <div className="text-left min-w-[280px]">
                    <div>
                      <span className="font-semibold text-primary">Ceremony:</span>
                      <span className="ml-2 text-muted-foreground">{formatFullDate(selectedEvent.ceremony_date)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Start: {formatTimeDisplay(selectedEvent.ceremony_start_time)} — Finish: {formatTimeDisplay(selectedEvent.ceremony_finish_time)}
                    </div>
                    {selectedEvent.ceremony_venue && <div className="text-sm text-muted-foreground">{selectedEvent.ceremony_venue}</div>}
                  </div>
                )}
                {selectedEvent.reception_enabled !== false && (
                  <div className="text-left min-w-[280px]">
                    <div>
                      <span className="font-semibold text-primary">Reception:</span>
                      <span className="ml-2 text-muted-foreground">{formatFullDate(selectedEvent.date)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Start: {formatTimeDisplay(selectedEvent.start_time)} — Finish: {formatTimeDisplay(selectedEvent.finish_time)}
                    </div>
                    {selectedEvent.venue && <div className="text-sm text-muted-foreground">{selectedEvent.venue}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section */}
          <RunningSheetSection
            label={sectionLabel}
            onLabelChange={setSectionLabel}
            notes={sectionNotes}
            onNotesChange={setSectionNotes}
            items={sheet.items}
            onUpdateItem={updateItem}
            onAddItem={addItem}
            onDeleteItem={deleteItem}
            onDuplicateItem={duplicateItem}
            onReorderItems={reorderItems}
            onResetToDefault={resetToDefault}
            onDownloadSectionPDF={handleDownloadSectionPDF}
          />
        </div>
      ) : null}

      {/* Share Modal */}
      <RunningSheetShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        shareTokens={shareTokens}
        onGenerateToken={generateShareToken}
        onDeleteToken={deleteShareToken}
      />
    </div>
  );
}
