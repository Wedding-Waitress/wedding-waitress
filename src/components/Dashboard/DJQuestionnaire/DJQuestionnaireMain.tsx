import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { QuestionnaireTemplateSelector } from './QuestionnaireTemplateSelector';
import { QuestionnaireForm } from './QuestionnaireForm';
import { QuestionnaireActionButtons } from './QuestionnaireActionButtons';
import { useDJQuestionnaire, TemplateType } from '@/hooks/useDJQuestionnaire';

interface Event {
  id: string;
  name: string;
  partner1_name?: string;
  partner2_name?: string;
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
  const { questionnaire, loading, createQuestionnaireFromTemplate, refetch } = useDJQuestionnaire(selectedEventId);
  const [templateType, setTemplateType] = useState<TemplateType>('wedding_mr_mrs');

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

  const handleTemplateChange = (newTemplate: TemplateType) => {
    setTemplateType(newTemplate);
  };

  return (
    <div className="space-y-6 print:space-y-4">
      <Card className="ww-box print:shadow-none">
        <CardHeader>
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
            <QuestionnaireActionButtons
              eventName={selectedEvent?.name}
              templateType={templateType}
              responses={{}}
            />
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
        ) : questionnaire ? (
          <Card className="ww-box print:shadow-none">
            <CardContent className="pt-6">
              <QuestionnaireForm questionnaire={questionnaire} />
            </CardContent>
          </Card>
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
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:space-y-4 > * + * {
            margin-top: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
};
