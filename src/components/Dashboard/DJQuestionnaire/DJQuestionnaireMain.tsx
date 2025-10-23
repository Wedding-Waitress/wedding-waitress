import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Music } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { QuestionnaireTemplateSelector } from './QuestionnaireTemplateSelector';
import { QuestionnaireActionButtons } from './QuestionnaireActionButtons';
import { QuestionnaireHeader } from './QuestionnaireHeader';
import { SectionSelector } from './SectionSelector';
import { useDJQuestionnaire } from '@/hooks/useDJQuestionnaire';
import { TemplateType } from '@/types/djQuestionnaire';
import { formatEventDate, getEventName, getTemplateDisplayLabel, formatTimeRange, getCurrentDateTime } from '@/lib/djQuestionnaireFormatters';
import { useToast } from '@/hooks/use-toast';

// Lazy load QuestionnaireForm to prevent its dependencies from crashing the app
const QuestionnaireForm = React.lazy(() => 
  import('./QuestionnaireForm').then(module => ({
    default: module.QuestionnaireForm
  }))
);

interface Event {
  id: string;
  name: string;
  partner1_name?: string;
  partner2_name?: string;
  date?: string;
  venue?: string;
  venue_name?: string;
  start_time?: string;
  finish_time?: string;
}

interface DJQuestionnaireMainProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  events: Event[];
}

export const DJQuestionnaireMain = ({
  selectedEventId,
  onEventSelect,
  events,
}: DJQuestionnaireMainProps) => {
  const { questionnaire, loading, hasUnsavedChanges, createQuestionnaireFromTemplate, updateHeaderOverrides, updateActiveSection, ensureSectionExists, refetch } = useDJQuestionnaire(selectedEventId);
  const [templateType, setTemplateType] = useState<TemplateType>('wedding_mr_mrs');
  const [pageCount, setPageCount] = useState<number>(1);
  const [loadingSection, setLoadingSection] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const activeSection = questionnaire?.meta?.activeSection || 'All Sections';

  // Set initial template based on event data
  useEffect(() => {
    if (questionnaire) {
      setTemplateType(questionnaire.template_type);
    } else if (selectedEvent) {
      // Auto-detect template based on partner names
      const hasPartners = selectedEvent.partner1_name && selectedEvent.partner2_name;
      if (hasPartners) {
        setTemplateType('wedding_mr_mrs'); // Default wedding template
      } else {
        setTemplateType('event_general');
      }
    }
  }, [questionnaire, selectedEvent]);

  // Calculate page count based on form content height
  useEffect(() => {
    if (formRef.current && questionnaire) {
      const contentHeight = formRef.current.scrollHeight;
      const a4HeightPx = 1123; // A4 height in pixels at 96 DPI
      const calculatedPages = Math.ceil(contentHeight / a4HeightPx);
      setPageCount(Math.max(1, calculatedPages));
    }
  }, [questionnaire]);

  const handleTemplateChange = async (newTemplate: TemplateType) => {
    if (!newTemplate) return;
    
    setTemplateType(newTemplate);
    
    // If no questionnaire exists, create one with the selected template
    if (!questionnaire && selectedEventId) {
      try {
        await createQuestionnaireFromTemplate(newTemplate);
      } catch (error) {
        console.error('Failed to create questionnaire:', error);
      }
    }
  };

  const handleSectionChange = async (section: string) => {
    if (!questionnaire) return;

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // If not "All Sections", ensure the section exists
    if (section !== 'All Sections') {
      setLoadingSection(true);
      try {
        const sectionExists = questionnaire.sections.some(s => s.label === section);
        if (!sectionExists) {
          toast({
            title: "Creating Section",
            description: `Setting up ${section}...`,
          });
          await ensureSectionExists(section, templateType);
        }
      } catch (error) {
        console.error('Failed to ensure section exists:', error);
        toast({
          title: "Error",
          description: "Failed to load section",
          variant: "destructive",
        });
      } finally {
        setLoadingSection(false);
      }
    }

    // Update active section
    await updateActiveSection(section);
  };


  // Warn on page close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Unsaved Changes Warning Banner */}
      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>You have unsaved changes. They will be saved automatically.</span>
        </div>
      )}

      <Card className="ww-box print:shadow-none">
        <CardHeader className="border-b bg-card">
          <CardTitle className="mb-6">DJ & MC Questionnaire</CardTitle>
          
          <div className="space-y-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Event</label>
              <Select value={selectedEventId || ''} onValueChange={onEventSelect}>
                <SelectTrigger className="w-full md:w-[280px] bg-background">
                  <SelectValue placeholder="Select an event..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Questionnaire Template</label>
              <QuestionnaireTemplateSelector value={templateType} onChange={handleTemplateChange} />
            </div>
          </div>

          {questionnaire && selectedEvent && (
            <div className="flex justify-end pt-4 print:hidden">
              <QuestionnaireActionButtons
                event={selectedEvent}
                questionnaire={questionnaire}
                templateType={templateType}
                onUpdateHeaderOverrides={updateHeaderOverrides}
              />
            </div>
          )}

          <div className="hidden print:block pt-4">
            <CardTitle className="text-2xl">DJ & MC Questionnaire</CardTitle>
            {selectedEvent && (
              <p className="text-muted-foreground mt-2">Event: {selectedEvent.name}</p>
            )}
          </div>
        </CardHeader>

        {/* Two Column Layout */}
        {questionnaire && selectedEvent && (
          <CardContent className="p-6 print:hidden bg-card">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Event Details */}
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-primary">
                  {getEventName(selectedEvent)}
                </h2>
                
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{getTemplateDisplayLabel(templateType)}</span>
                  <span className="text-muted-foreground">•</span>
                  <span>{formatEventDate(selectedEvent.date)}</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="font-medium">Venue:</span>
                    <span>{questionnaire.header_overrides?.venue_name || selectedEvent.venue || selectedEvent.venue_name || 'TBD'}</span>
                  </div>

                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="font-medium">Ceremony:</span>
                    <span>{formatTimeRange(
                      questionnaire.header_overrides?.ceremony_start || selectedEvent.start_time,
                      questionnaire.header_overrides?.ceremony_finish || selectedEvent.start_time
                    )}</span>
                  </div>

                  {(() => {
                    const canapesTime = formatTimeRange(
                      questionnaire.header_overrides?.canapes_start || null,
                      questionnaire.header_overrides?.canapes_finish || null
                    );
                    return canapesTime && canapesTime !== 'TBD' ? (
                      <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className="font-medium">Canapés:</span>
                        <span>{canapesTime}</span>
                      </div>
                    ) : null;
                  })()}

                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="font-medium">Reception:</span>
                    <span>{formatTimeRange(
                      questionnaire.header_overrides?.reception_start || selectedEvent.start_time,
                      questionnaire.header_overrides?.reception_finish || selectedEvent.finish_time
                    )}</span>
                  </div>

                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="font-medium">DJ:</span>
                    <span>
                      {questionnaire.header_overrides?.dj_name || 'TBD'}
                      {questionnaire.header_overrides?.dj_mobile && ` (${questionnaire.header_overrides.dj_mobile})`}
                    </span>
                  </div>

                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="font-medium">MC:</span>
                    <span>
                      {questionnaire.header_overrides?.mc_name || 'TBD'}
                      {questionnaire.header_overrides?.mc_mobile && ` (${questionnaire.header_overrides.mc_mobile})`}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span>Pages: {pageCount}</span>
                  <span>Generated on: {getCurrentDateTime().date}</span>
                  <span>Time: {getCurrentDateTime().time}</span>
                </div>
              </div>

              {/* Right Column: Section Navigation */}
              <div>
                <SectionSelector
                  activeSection={activeSection}
                  onChange={handleSectionChange}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {selectedEventId ? (
        loading ? (
          <Card className="ww-box print:shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading questionnaire...</p>
              </div>
            </CardContent>
          </Card>
        ) : questionnaire && selectedEvent ? (
          <>
            {/* Original QuestionnaireHeader - Print only */}
            <div className="hidden print:block">
              <QuestionnaireHeader
                event={selectedEvent}
                questionnaire={questionnaire}
                templateType={templateType}
                pageCount={pageCount}
              />
            </div>
            <Card className="ww-box print:shadow-none" ref={formRef} id="questionnaire-form">
              <CardContent className="pt-6">
                {loadingSection ? (
                  <div className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-muted-foreground">Loading section...</p>
                    </div>
                  </div>
                ) : (
                  <React.Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
                    <QuestionnaireForm 
                      questionnaire={questionnaire}
                      activeSection={activeSection}
                    />
                  </React.Suspense>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="ww-box">
            <CardContent className="pt-6 space-y-4">
              <p className="text-center text-muted-foreground">
                No questionnaire exists for this event yet.
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={() => createQuestionnaireFromTemplate(templateType)}
                  style={{ backgroundColor: '#6D28D9', color: 'white' }}
                >
                  Create Questionnaire from Template
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="ww-box">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please select an event to view the questionnaire
            </p>
          </CardContent>
        </Card>
      )}

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 20mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          #questionnaire-header,
          #questionnaire-header *,
          #questionnaire-form,
          #questionnaire-form * {
            visibility: visible;
          }

          /* Hide sticky positioning in print */
          .sticky {
            position: relative !important;
          }
          
          #questionnaire-header {
            position: relative;
            margin-bottom: 20mm;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-0 {
            border: 0 !important;
          }
          
          .print-page-break {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
};
