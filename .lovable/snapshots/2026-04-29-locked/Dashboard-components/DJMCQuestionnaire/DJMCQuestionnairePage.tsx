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
import React, { useState } from 'react';
import { Music, Download, Loader2, FileText, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportEntireQuestionnairePDF, exportSectionPDF } from '@/lib/djMCQuestionnairePdfExporter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StandardEventSelector } from '../StandardEventSelector';
import { DJMCQuestionnaireSection } from './DJMCQuestionnaireSection';
import { DJMCShareModal } from './DJMCShareModal';
import { useDJMCQuestionnaire } from '@/hooks/useDJMCQuestionnaire';
import { useEvents } from '@/hooks/useEvents';

interface DJMCQuestionnairePageProps {
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

export function DJMCQuestionnairePage({ selectedEventId, onEventSelect }: DJMCQuestionnairePageProps) {
  const { events } = useEvents();
  const { toast } = useToast();
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
  } = useDJMCQuestionnaire(selectedEventId);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const progress = calculateProgress();

  const handleDownloadEntirePDF = async () => {
    if (!questionnaire || !selectedEvent) return;
    
    setDownloadingPDF(true);
    try {
      await exportEntireQuestionnairePDF(questionnaire, selectedEvent);
      toast({
        title: "PDF Downloaded",
        description: "Your DJ & MC Questionnaire has been downloaded.",
      });
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast({
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
      await exportSectionPDF(section, selectedEvent);
      toast({
        title: "Section PDF Downloaded",
        description: `"${section.section_label}" has been downloaded.`,
      });
    } catch (error) {
      console.error('Failed to download section PDF:', error);
      toast({
        title: "Download Failed",
        description: "There was an error generating the PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Music className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">DJ & MC Questionnaire</h1>
            <p className="text-sm text-muted-foreground">
              Plan your music and entertainment details
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
              <StandardEventSelector
                events={events}
                selectedEventId={selectedEventId}
                onEventSelect={onEventSelect}
              />
            </div>

            {selectedEventId && questionnaire && (
              <div className="border border-primary rounded-xl p-3 flex flex-col gap-3">
                <div className="text-sm">
                  <span className="font-medium">Export Controls</span>
                  <span className="text-muted-foreground ml-2">Download your running sheet and share it with your DJ & MC or any of your vendors.</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors"
                  >
                    <Share2 className="w-3 h-3" />
                    Share with DJ/MC
                  </button>
                  <button
                    onClick={handleDownloadEntirePDF}
                    disabled={downloadingPDF}
                    className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {downloadingPDF ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <FileText className="w-3 h-3" />
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
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select an event to start planning your music and entertainment</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading questionnaire...</p>
          </CardContent>
        </Card>
      ) : questionnaire ? (
        <div className="space-y-4">
          {/* Event header */}
          {selectedEvent && (
            <div className="text-center py-4 border-b border-border space-y-3">
              <h2 className="text-xl font-semibold text-primary">{selectedEvent.name}</h2>
              
              {/* Ceremony & Reception Details */}
              <div className={`flex justify-center gap-8 flex-wrap ${
                selectedEvent.ceremony_enabled && selectedEvent.reception_enabled !== false ? '' : 'max-w-md mx-auto'
              }`}>
                {/* Ceremony Section */}
                {selectedEvent.ceremony_enabled && (
                  <div className="text-left min-w-[280px]">
                    <div>
                      <span className="font-semibold text-primary">Ceremony:</span>
                      <span className="ml-2 text-muted-foreground">
                        {formatFullDate(selectedEvent.ceremony_date)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Start: {formatTimeDisplay(selectedEvent.ceremony_start_time)} — Finish: {formatTimeDisplay(selectedEvent.ceremony_finish_time)}
                    </div>
                    {selectedEvent.ceremony_venue && (
                      <div className="text-sm text-muted-foreground">
                        {selectedEvent.ceremony_venue}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Reception Section */}
                {selectedEvent.reception_enabled !== false && (
                  <div className="text-left min-w-[280px]">
                    <div>
                      <span className="font-semibold text-primary">Reception:</span>
                      <span className="ml-2 text-muted-foreground">
                        {formatFullDate(selectedEvent.date)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Start: {formatTimeDisplay(selectedEvent.start_time)} — Finish: {formatTimeDisplay(selectedEvent.finish_time)}
                    </div>
                    {selectedEvent.venue && (
                      <div className="text-sm text-muted-foreground">
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
              onUpdateSection={(updates) => updateSection(section.id, updates)}
              onUpdateItem={(itemId, updates) => updateItem(itemId, updates)}
              onAddItem={() => addItem(section.id)}
              onDeleteItem={(itemId) => deleteItem(itemId)}
              onDuplicateItem={(item) => duplicateItem(item)}
              onReorderItems={(items) => reorderItems(section.id, items)}
              onResetToDefault={() => resetSectionToDefault(section.id)}
              onDuplicateSection={() => duplicateSection(section.id)}
              onDeleteSection={() => deleteSection(section.id)}
              onDownloadSectionPDF={() => handleDownloadSectionPDF(section)}
            />
          ))}
        </div>
      ) : null}

      {/* Share Modal */}
      <DJMCShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        shareTokens={shareTokens}
        onGenerateToken={generateShareToken}
        onDeleteToken={deleteShareToken}
        onTokensUpdated={refreshShareTokens}
        eventSlug={selectedEvent?.slug ?? undefined}
      />
    </div>
  );
}
