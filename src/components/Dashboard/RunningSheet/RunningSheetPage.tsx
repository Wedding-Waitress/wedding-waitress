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
import React, { lazy, Suspense, useState, useCallback } from 'react';
import {
  ClipboardList,
  LoaderCircle,
  FileDown,
  Share2,
  Printer,
  CalendarDays,
  HeartHandshake,
  PartyPopper,
  Clock3,
  MapPin,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StandardEventSelector } from '../StandardEventSelector';
import { RunningSheetSection } from './RunningSheetSection';
import { useRunningSheet } from '@/hooks/useRunningSheet';
import type { Event } from '@/hooks/useEvents';
import { useDJMCQuestionnaire } from '@/hooks/useDJMCQuestionnaire';
import { formatDJMCInsert } from '@/lib/djMCInsertFormatter';
import styles from './RunningSheetTheme.module.css';
const RunningSheetShareModal = lazy(() => import('./RunningSheetShareModal').then(module => ({ default: module.RunningSheetShareModal })));

interface RunningSheetPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  events: Event[];
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

export function RunningSheetPage({ selectedEventId, onEventSelect, events }: RunningSheetPageProps) {
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
      const { exportRunningSheetPDF } = await import('@/lib/runningSheetPdfExporter');
      await exportRunningSheetPDF(sheet.items, selectedEvent, sectionLabel, sectionNotes);
      toast({ title: 'PDF Downloaded', description: 'Your Run Sheet has been downloaded.' });
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
      const { exportRunningSheetSectionPDF } = await import('@/lib/runningSheetPdfExporter');
      await exportRunningSheetSectionPDF(sheet.items, selectedEvent, sectionLabel, sectionNotes);
      toast({ title: 'Section PDF Downloaded', description: `"${sectionLabel}" has been downloaded.` });
    } catch (error) {
      console.error('Failed to download section PDF:', error);
      toast({ title: 'Download Failed', description: 'There was an error generating the PDF.', variant: 'destructive' });
    }
  };

  return (
    <div className={`space-y-6 ${styles.page}`} data-running-sheet-page>
      {/* Header */}
      <div className={`flex items-center justify-between ${styles.pageHeader}`}>
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${styles.headingIcon}`}>
            <ClipboardList size={25} strokeWidth={1.8} className="text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Run Sheet</h1>
            <p className={`text-muted-foreground ${styles.supportingText}`}>
              Organise the perfect schedule for your wedding or event
            </p>
          </div>
        </div>
        {saving && (
          <div className={`flex items-center gap-2 text-muted-foreground ${styles.supportingText}`}>
            <LoaderCircle size={16} strokeWidth={1.8} className="animate-spin" aria-hidden="true" />
            Saving...
          </div>
        )}
      </div>

      {/* Event Selector */}
      <Card className={`${styles.glassCard} ${styles.topCard}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap max-sm:flex-col max-sm:items-stretch">
            <div className="flex-shrink-0 max-sm:w-full flex items-center gap-2">
              <CalendarDays size={17} strokeWidth={1.8} className="text-primary shrink-0" aria-hidden="true" />
              <StandardEventSelector events={events} selectedEventId={selectedEventId} onEventSelect={onEventSelect} menuClassName="ww-running-sheet-menu" />
            </div>

            {selectedEventId && sheet && (
              <div className={`border border-primary rounded-xl p-3 flex flex-col gap-3 max-sm:w-full ${styles.exportPanel}`}>
                <div className="text-sm">
                  <span className={`inline-flex items-center gap-1.5 align-middle ${styles.controlLabel}`}>
                    <Printer size={16} strokeWidth={1.8} aria-hidden="true" />
                    Export Controls
                  </span>
                  <span className={`text-muted-foreground ml-2 ${styles.supportingText}`}>Download your run sheet and share it with your DJ-MC or any of your vendors.</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap max-sm:flex-col max-sm:items-stretch">
                  <button
                    onClick={() => setShowShareModal(true)}
                    disabled={downloadingPDF}
                    aria-label="Share run sheet"
                    className={`inline-flex items-center justify-center gap-1.5 h-7 max-sm:h-11 px-2.5 rounded-full transition-all disabled:opacity-50 max-sm:w-full ${styles.greenAction}`}
                  >
                    <Share2 size={16} strokeWidth={1.8} aria-hidden="true" />
                    Share
                  </button>
                  <button
                    onClick={handleDownloadEntirePDF}
                    disabled={downloadingPDF}
                    aria-label="Download run sheet PDF"
                    className={`inline-flex items-center justify-center gap-1.5 h-7 max-sm:h-11 px-2.5 rounded-full transition-all disabled:opacity-50 max-sm:w-full ${styles.greenAction}`}
                  >
                    {downloadingPDF
                      ? <LoaderCircle size={16} strokeWidth={1.8} className="animate-spin" aria-hidden="true" />
                      : <FileDown size={16} strokeWidth={1.8} aria-hidden="true" />}
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
        <Card className={styles.glassCard}>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className={styles.supportingText}>Select an event to start planning your run sheet</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card className={styles.glassCard}>
          <CardContent className="py-12 text-center">
            <LoaderCircle size={32} strokeWidth={1.8} className="mx-auto animate-spin text-primary" aria-hidden="true" />
            <p className={`mt-4 text-muted-foreground ${styles.supportingText}`}>Loading run sheet...</p>
          </CardContent>
        </Card>
      ) : sheet ? (
        <div className="space-y-4">
          {/* Event header */}
          {selectedEvent && (
            <div className={`text-center py-4 px-4 space-y-3 ${styles.eventBanner}`}>
              <h2 className="text-xl font-semibold text-primary">{selectedEvent.name}</h2>
              <div className={`flex justify-center gap-8 flex-wrap ${
                selectedEvent.ceremony_enabled && selectedEvent.reception_enabled !== false ? '' : 'max-w-md mx-auto'
              }`}>
                {selectedEvent.ceremony_enabled && (
                  <div className="text-left min-w-[280px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <HeartHandshake size={16} strokeWidth={1.8} className="text-primary shrink-0" aria-hidden="true" />
                      <span className={`font-semibold text-primary ${styles.eventDetailLabel}`}>Ceremony:</span>
                      <CalendarDays size={15} strokeWidth={1.8} className="text-muted-foreground shrink-0" aria-hidden="true" />
                      <span className={`text-muted-foreground ${styles.eventDetailText}`}>{formatFullDate(selectedEvent.ceremony_date)}</span>
                    </div>
                    <div className={`text-muted-foreground mt-1 flex items-center gap-1.5 ${styles.eventDetailText}`}>
                      <Clock3 size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      <span>Start: {formatTimeDisplay(selectedEvent.ceremony_start_time)} — Finish: {formatTimeDisplay(selectedEvent.ceremony_finish_time)}</span>
                    </div>
                    {selectedEvent.ceremony_venue && (
                      <div className={`text-muted-foreground flex items-center gap-1.5 ${styles.eventDetailText}`}>
                        <MapPin size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                        <span>{selectedEvent.ceremony_venue}</span>
                      </div>
                    )}
                  </div>
                )}
                {selectedEvent.reception_enabled !== false && (
                  <div className="text-left min-w-[280px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <PartyPopper size={16} strokeWidth={1.8} className="text-primary shrink-0" aria-hidden="true" />
                      <span className={`font-semibold text-primary ${styles.eventDetailLabel}`}>Reception:</span>
                      <CalendarDays size={15} strokeWidth={1.8} className="text-muted-foreground shrink-0" aria-hidden="true" />
                      <span className={`text-muted-foreground ${styles.eventDetailText}`}>{formatFullDate(selectedEvent.date)}</span>
                    </div>
                    <div className={`text-muted-foreground mt-1 flex items-center gap-1.5 ${styles.eventDetailText}`}>
                      <Clock3 size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      <span>Start: {formatTimeDisplay(selectedEvent.start_time)} — Finish: {formatTimeDisplay(selectedEvent.finish_time)}</span>
                    </div>
                    {selectedEvent.venue && (
                      <div className={`text-muted-foreground flex items-center gap-1.5 ${styles.eventDetailText}`}>
                        <MapPin size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                        <span>{selectedEvent.venue}</span>
                      </div>
                    )}
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
      {showShareModal && <Suspense fallback={null}><RunningSheetShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        shareTokens={shareTokens}
        onGenerateToken={generateShareToken}
        onDeleteToken={deleteShareToken}
        onTokensUpdated={refreshShareTokens}
        eventSlug={selectedEvent?.slug ?? undefined}
      /></Suspense>}
    </div>
  );
}
