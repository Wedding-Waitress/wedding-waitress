import { Printer as ExportControlsPrinter } from 'lucide-react';
import { DJMCRowTextSize } from './DJMCRowTextSize';
/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This DJ-MC Questionnaire feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break questionnaire data, sharing, or PDF export
 *
 * Last locked: 2026-02-19
 */
import React, { lazy, Suspense, useState } from 'react';
import {
  Undo2, Music2, Mic2, Printer, Share2, FileDown, LoaderCircle,
  CalendarDays, HeartHandshake, PartyPopper, Clock3, MapPin,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StandardEventSelector } from '../StandardEventSelector';
import { DJMCQuestionnaireSection } from './DJMCQuestionnaireSection';
import { GuestSongRequestsSection } from './GuestSongRequestsSection';
import { useDJMCUndo } from '@/hooks/useDJMCUndo';
import { useDJMCQuestionnaire } from '@/hooks/useDJMCQuestionnaire';
import type { Event } from '@/hooks/useEvents';
import theme from './DJMCQuestionnaireTheme.module.css';
const DJMCShareModal = lazy(() => import('./DJMCShareModal').then(module => ({ default: module.DJMCShareModal })));
interface DJMCQuestionnairePageProps {
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
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return `${dayOfWeek}, ${day}${getOrdinalSuffix(day)} ${month} ${year}`;
};

// Format time as "3:00 PM"
const formatTimeDisplay = (time: string | null | undefined): string => {
  if (!time) return 'TBD';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

export function DJMCQuestionnairePage({ selectedEventId, onEventSelect, events }: DJMCQuestionnairePageProps) {
  const { toast } = useToast();
  const [rowTextSize, setRowTextSize] = useState<"standard"|"larger">("standard");
  const [showShareModal, setShowShareModal] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const {
    questionnaire,
    loading,
    saving,
    shareTokens,
    updateSection,
    updateItem,
    addItem,
    deleteItem,
    duplicateItem,
    reorderItems,
    resetSectionToDefault,
    duplicateSection,
    deleteSection,
    generateShareToken,
    deleteShareToken,
    refreshShareTokens,
    calculateProgress,
    prepareUndo,
    refetch,
  } = useDJMCQuestionnaire(selectedEventId);

  const undoHistory=useDJMCUndo({questionnaireId:questionnaire?.id,eventId:selectedEventId||undefined,
    sections:questionnaire?.sections||[],beforeRestore:prepareUndo,refresh:refetch});
  const selectedEvent = events.find(e => e.id === selectedEventId);
  const progress = calculateProgress();

  const handleDownloadEntirePDF = async () => {
    if (!questionnaire || !selectedEvent) return;

    setDownloadingPDF(true);
    try {
      const { exportEntireQuestionnairePDF } = await import('@/lib/djMCQuestionnairePdfExporter');
      await exportEntireQuestionnairePDF(questionnaire, selectedEvent, rowTextSize);
      toast({
        className: 'ww-djmc-toast',
        title: "PDF Downloaded",
        description: "Your DJ & MC Questionnaire has been downloaded.",
      });
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast({
        className: 'ww-djmc-toast',
        title: "Download Failed",
        description: "There was an error generating the PDF.",
        variant: "destructive",
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadSectionPDF = async (section: typeof questionnaire.sections[0]) => {
    if (!selectedEvent) return;

    try {
      const { exportSectionPDF } = await import('@/lib/djMCQuestionnairePdfExporter');
      await exportSectionPDF(section, selectedEvent, rowTextSize);
      toast({
        className: 'ww-djmc-toast',
        title: "Section PDF Downloaded",
        description: `"${section.section_label}" has been downloaded.`,
      });
    } catch (error) {
      console.error('Failed to download section PDF:', error);
      toast({
        className: 'ww-djmc-toast',
        title: "Download Failed",
        description: "There was an error generating the PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <div data-row-text-size={rowTextSize} className={`${theme.page} ww-djmc-dashboard-page space-y-6`}>
      {undoHistory.busy && <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-[#967a59] bg-[#fff4e5] px-5 py-3 text-[#2f1b14] shadow-lg">
        <LoaderCircle size={20} className="animate-spin" aria-hidden="true"/>
        {undoHistory.operation === 'restoring' ? 'Restoring questionnaire… Please keep this page open.' : 'Saving changes… Please wait.'}
      </div>}
      {/* Event Selector */}
      <Card className={theme.glassCard}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap max-lg:flex-col max-lg:items-stretch">
            <div className="flex flex-col gap-5 min-w-0 max-lg:w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className={theme.referenceHeadingRow}>
          <div className={theme.referenceHeadingIcon}>
            <Music2 size={25} strokeWidth={1.8} className="text-primary" aria-hidden="true" />
            <Mic2 size={18} strokeWidth={1.8} className="text-primary/70" aria-hidden="true" />
          </div>
          <div>
            <h1 className={theme.pageHeading}>DJ & MC Questionnaire</h1>
            <p className={`text-muted-foreground ${theme.supportingText}`}>
              Plan your music and entertainment details
            </p>
          </div>
        </div>

        <DJMCRowTextSize value={rowTextSize} onChange={setRowTextSize}/>
        <Button variant="ghost" className="gap-1.5 print:hidden" disabled={!undoHistory.canUndo||undoHistory.busy}
          onClick={undoHistory.undo} title="Restore the previous questionnaire while this page is open">
          {undoHistory.operation === 'restoring' ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true"/> : <Undo2 size={18} strokeWidth={1.8} aria-hidden="true"/>}
          {undoHistory.operation === 'restoring' ? 'Restoring…' : 'Undo'}
        </Button>
        {saving && (
          <div className={`flex items-center gap-2 text-muted-foreground ${theme.bodyText}`}>
            <LoaderCircle size={16} strokeWidth={1.8} className="animate-spin" />
            Saving...
          </div>
        )}
      </div>

            <div className="flex-shrink-0 max-lg:w-full flex items-center gap-2">
              <CalendarDays size={17} strokeWidth={1.8} className="text-primary shrink-0" aria-hidden="true" />
              <StandardEventSelector
                events={events}
                selectedEventId={selectedEventId}
                onEventSelect={onEventSelect}
                menuClassName="ww-djmc-portal"
              />
            </div>
            </div>

            {selectedEventId && questionnaire && (
              <div data-export-controls-panel className={`${theme.exportPanel} rounded-xl p-3 flex flex-col gap-3 max-lg:w-full`}>
                <div className="text-sm">
                  <span data-export-controls-heading><ExportControlsPrinter size={16} strokeWidth={2} aria-hidden="true" />Export Controls</span>

                </div>
                <div className="flex items-center gap-3 flex-wrap max-lg:gap-2 max-sm:flex-col max-sm:items-stretch">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className={`${theme.primaryAction} ${theme.exportButton} inline-flex items-center gap-1.5 h-10 px-4 text-sm font-semibold rounded-full transition-colors max-sm:h-10 max-sm:w-full max-sm:justify-center max-sm:text-sm`}
                  >
                    <Share2 size={16} strokeWidth={1.8} aria-hidden="true" />
                    Share with DJ/MC
                  </button>
                  <button
                    onClick={handleDownloadEntirePDF}
                    disabled={downloadingPDF}
                    aria-busy={downloadingPDF}
                    className={`${theme.primaryAction} ${theme.exportButton} inline-flex items-center gap-1.5 h-10 px-4 text-sm font-semibold rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none max-sm:h-10 max-sm:w-full max-sm:justify-center max-sm:text-sm`}
                  >
                    {downloadingPDF ? (
                      <LoaderCircle size={16} strokeWidth={1.8} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <FileDown size={16} strokeWidth={1.8} aria-hidden="true" />
                    )}
                    Download entire questionnaire PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {!selectedEventId ? (
        <Card className={theme.statusCard}>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Music2 size={48} strokeWidth={1.8} className="mx-auto mb-4 opacity-50" aria-hidden="true" />
            <p className={theme.bodyText}>Select an event to start planning your music and entertainment</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card className={theme.statusCard}>
          <CardContent className="py-12 text-center">
            <LoaderCircle size={32} strokeWidth={1.8} className="mx-auto animate-spin text-primary" aria-hidden="true" />
            <p className={`mt-4 text-muted-foreground ${theme.bodyText}`}>Loading questionnaire...</p>
          </CardContent>
        </Card>
      ) : questionnaire ? (
        <div className="space-y-4 max-lg:space-y-5 max-sm:space-y-6">
          {/* Event header */}
          {selectedEvent && (
            <div className={`${theme.eventBanner} text-center py-4 space-y-3`}>
              <h2 className="text-xl font-semibold text-primary">{selectedEvent.name}</h2>

              {/* Ceremony & Reception Details */}
              <div className={`flex justify-center gap-8 flex-wrap ${
                selectedEvent.ceremony_enabled && selectedEvent.reception_enabled !== false ? '' : 'max-w-md mx-auto'
              }`}>
                {/* Ceremony Section */}
                {selectedEvent.ceremony_enabled && (
                  <div className="text-left min-w-[280px] max-lg:min-w-0 max-lg:w-full max-sm:text-center">
                    <div className="flex items-center gap-1.5 max-sm:justify-center">
                      <HeartHandshake size={16} strokeWidth={1.8} className="text-primary shrink-0" aria-hidden="true" />
                      <span className={`font-semibold text-primary ${theme.eventDetailLabel}`}>Ceremony:</span>
                      <span className={`text-muted-foreground inline-flex items-center gap-1 ${theme.eventDetailText}`}>
                        <CalendarDays size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                        {formatFullDate(selectedEvent.ceremony_date)}
                      </span>
                    </div>
                    <div className={`text-muted-foreground mt-1 flex items-center gap-1.5 max-sm:justify-center ${theme.eventDetailText}`}>
                      <Clock3 size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      Start: {formatTimeDisplay(selectedEvent.ceremony_start_time)} — Finish: {formatTimeDisplay(selectedEvent.ceremony_finish_time)}
                    </div>
                    {selectedEvent.ceremony_venue && (
                      <div className={`text-muted-foreground flex items-center gap-1.5 max-sm:justify-center ${theme.eventDetailText}`}>
                        <MapPin size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                        {selectedEvent.ceremony_venue}
                      </div>
                    )}
                  </div>
                )}

                {/* Reception Section */}
                {selectedEvent.reception_enabled !== false && (
                  <div className="text-left min-w-[280px] max-lg:min-w-0 max-lg:w-full max-sm:text-center">
                    <div className="flex items-center gap-1.5 max-sm:justify-center">
                      <PartyPopper size={16} strokeWidth={1.8} className="text-primary shrink-0" aria-hidden="true" />
                      <span className={`font-semibold text-primary ${theme.eventDetailLabel}`}>Reception:</span>
                      <span className={`text-muted-foreground inline-flex items-center gap-1 ${theme.eventDetailText}`}>
                        <CalendarDays size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                        {formatFullDate(selectedEvent.date)}
                      </span>
                    </div>
                    <div className={`text-muted-foreground mt-1 flex items-center gap-1.5 max-sm:justify-center ${theme.eventDetailText}`}>
                      <Clock3 size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      Start: {formatTimeDisplay(selectedEvent.start_time)} — Finish: {formatTimeDisplay(selectedEvent.finish_time)}
                    </div>
                    {selectedEvent.venue && (
                      <div className={`text-muted-foreground flex items-center gap-1.5 max-sm:justify-center ${theme.eventDetailText}`}>
                        <MapPin size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                        {selectedEvent.venue}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sections */}
          {questionnaire.sections.map((section) => (
            <DJMCQuestionnaireSection
              key={section.id}
              section={section}
              disabled={undoHistory.busy}
              onRunUndoable={undoHistory.run}
              eventId={questionnaire.event_id}
              onUpdateSection={(updates) => undoHistory.record(() => updateSection(section.id, updates))}
              onUpdateItem={(itemId, updates) => undoHistory.record(() => updateItem(itemId, updates))}
              onAddItem={() => undoHistory.run(() => addItem(section.id))}
              onDeleteItem={(itemId) => undoHistory.run(() => deleteItem(itemId))}
              onDuplicateItem={(item) => undoHistory.run(() => duplicateItem(item))}
              onReorderItems={(items) => undoHistory.run(() => reorderItems(section.id, items))}
              onResetToDefault={() => undoHistory.run(() => resetSectionToDefault(section.id))}
              onDuplicateSection={() => undoHistory.run(() => duplicateSection(section.id))}
              onDeleteSection={() => undoHistory.run(() => deleteSection(section.id))}
              onDownloadSectionPDF={() => handleDownloadSectionPDF(section)}
            />
          ))}

          {/* Guest Song Requests (synthetic appended section) */}
          <GuestSongRequestsSection
            key={`${selectedEventId}:${undoHistory.revision}`}
            disabled={undoHistory.busy}
            onRunUndoable={(action,rows)=>undoHistory.run(action,false,rows)}
            eventId={selectedEvent?.id ?? null}
            eventName={selectedEvent?.name ?? null}
            eventDate={selectedEvent?.date ?? null}
          />
        </div>
      ) : null}

      {/* Share Modal */}
      {showShareModal && <Suspense fallback={null}><DJMCShareModal
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
