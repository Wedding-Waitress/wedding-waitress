/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This Running Sheet feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break running sheet data, sharing, PDF export, or caching
 *
 * Last locked: 2026-04-02
 */
import React, { useState, useCallback } from 'react';
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
import { useDJMCQuestionnaire } from '@/hooks/useDJMCQuestionnaire';
import { formatDJMCInsert } from '@/lib/djMCInsertFormatter';

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
    refreshShareTokens,
  } = useRunningSheet(selectedEventId);

  const { questionnaire } = useDJMCQuestionnaire(selectedEventId);
  const hasDJMCData = !!(questionnaire && questionnaire.sections.length > 0);

  const handleInsertFromDJMC = useCallback((itemId: string, type: 'ceremony' | 'introductions' | 'speeches', includeSongs: boolean) => {
    if (!questionnaire) {
      toast({ title: 'No DJ-MC data found', description: 'Please fill in the DJ-MC Questionnaire first.', variant: 'destructive' });
      return;
    }

    const formatted = formatDJMCInsert(questionnaire.sections, type, includeSongs);
    if (!formatted) {
      toast({ title: 'No data found', description: `No ${type} data found in the DJ-MC Questionnaire.`, variant: 'destructive' });
      return;
    }

    const currentItem = sheet?.items.find(i => i.id === itemId);
    if (!currentItem) return;

    const existingText = typeof currentItem.description_rich === 'string'
      ? currentItem.description_rich
      : currentItem.description_rich?.text || '';

    const newText = existingText.trim()
      ? `${existingText.trim()}\n${formatted}`
      : formatted;

    updateItem(itemId, { description_rich: { text: newText } });
    toast({ title: 'Inserted', description: `${type.charAt(0).toUpperCase() + type.slice(1)} data inserted from DJ-MC Questionnaire.` });
  }, [questionnaire, sheet, updateItem, toast]);

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
      <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-shrink-0">
              <StandardEventSelector events={events} selectedEventId={selectedEventId} onEventSelect={onEventSelect} />
            </div>

            {selectedEventId && sheet && (
              <div className="border border-primary rounded-xl p-3 flex flex-col gap-3">
                <div className="text-sm">
                  <span className="font-medium">Export Controls</span>
                  <span className="text-muted-foreground ml-2">Download your running sheet and share it with your DJ-MC or any of your vendors.</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors"
                  >
                    <Share2 className="h-3 w-3" />
                    Share
                  </button>
                  <button
                    onClick={handleDownloadEntirePDF}
                    disabled={downloadingPDF}
                    className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50"
                  >
                    {downloadingPDF ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                    Download PDF
                  </button>
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
            onDownloadSectionPDF={handleDownloadEntirePDF}
            onInsertFromDJMC={handleInsertFromDJMC}
            hasDJMCData={hasDJMCData}
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
        eventSlug={selectedEvent?.slug ?? undefined}
      />
    </div>
  );
}
