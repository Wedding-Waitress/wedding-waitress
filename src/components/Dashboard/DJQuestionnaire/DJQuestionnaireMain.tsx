import React, { useState, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { QuestionnaireTemplateSelector } from './QuestionnaireTemplateSelector';
import { QuestionnaireActionButtons } from './QuestionnaireActionButtons';
import { QuestionnaireHeader } from './QuestionnaireHeader';
import { useDJQuestionnaire } from '@/hooks/useDJQuestionnaire';
import { TemplateType } from '@/types/djQuestionnaire';

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
  const { questionnaire, loading, hasUnsavedChanges, createQuestionnaireFromTemplate, updateHeaderOverrides, refetch } = useDJQuestionnaire(selectedEventId);
  const [templateType, setTemplateType] = useState<TemplateType>('wedding_mr_mrs');
  const [pageCount, setPageCount] = useState<number>(1);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showNavigationWarning, setShowNavigationWarning] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

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

  const handleTemplateChange = (newTemplate: TemplateType) => {
    setTemplateType(newTemplate);
  };

  // Scroll listener for sticky header shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Warn on navigation away
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

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

  // Show confirmation dialog for React Router navigation
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowNavigationWarning(true);
    }
  }, [blocker]);

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
        <CardHeader className={`sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b transition-shadow ${
          isScrolled ? 'shadow-lg' : 'shadow-sm'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <div className="flex-1">
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
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Questionnaire Template</label>
              <QuestionnaireTemplateSelector value={templateType} onChange={handleTemplateChange} />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 pt-4 print:hidden">
            <CardTitle>DJ & MC Questionnaire</CardTitle>
            {questionnaire && selectedEvent && (
              <QuestionnaireActionButtons
                event={selectedEvent}
                questionnaire={questionnaire}
                templateType={templateType}
                onUpdateHeaderOverrides={updateHeaderOverrides}
              />
            )}
          </div>

          <div className="hidden print:block pt-4">
            <CardTitle className="text-2xl">DJ & MC Questionnaire</CardTitle>
            {selectedEvent && (
              <p className="text-muted-foreground mt-2">Event: {selectedEvent.name}</p>
            )}
          </div>
        </CardHeader>
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
            <QuestionnaireHeader
              event={selectedEvent}
              questionnaire={questionnaire}
              templateType={templateType}
              pageCount={pageCount}
            />
            <Card className="ww-box print:shadow-none" ref={formRef} id="questionnaire-form">
              <CardContent className="pt-6">
                <React.Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
                  <QuestionnaireForm questionnaire={questionnaire} />
                </React.Suspense>
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

      {/* Navigation Warning Dialog */}
      <AlertDialog open={showNavigationWarning} onOpenChange={setShowNavigationWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost if you leave now. 
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              blocker.reset?.();
              setShowNavigationWarning(false);
            }}>
              Stay on Page
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              blocker.proceed?.();
              setShowNavigationWarning(false);
            }}>
              Leave Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
