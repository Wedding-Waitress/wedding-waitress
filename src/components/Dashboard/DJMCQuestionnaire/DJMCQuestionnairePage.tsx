import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Music, Plus, Download, Calendar, FileText } from 'lucide-react';
import { useDJMCQuestionnaire } from '@/hooks/useDJMCQuestionnaire';
import { useEvents } from '@/hooks/useEvents';
import { DJMCQuestionnaireForm } from './DJMCQuestionnaireForm';
import { DJMCQuestionnaireHeader } from './DJMCQuestionnaireHeader';
import { DJMCQuestionnaireExporter } from './DJMCQuestionnaireExporter';
import { useToast } from '@/hooks/use-toast';

interface DJMCQuestionnairePageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export const DJMCQuestionnairePage: React.FC<DJMCQuestionnairePageProps> = ({
  selectedEventId,
  onEventSelect,
}) => {
  const { events, loading: eventsLoading } = useEvents();
  const { questionnaire, loading, createQuestionnaire, refetch } = useDJMCQuestionnaire(selectedEventId);
  const [showExporter, setShowExporter] = useState(false);
  const { toast } = useToast();

  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;

  const handleCreateQuestionnaire = async () => {
    const success = await createQuestionnaire();
    if (success) {
      toast({
        title: 'Questionnaire Created',
        description: 'Your DJ & MC Questionnaire is ready to fill out.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="ww-box">
        <CardHeader className="flex flex-col gap-4 pb-6">
          <div className="flex items-start gap-3">
            <Music className="w-16 h-16 text-primary flex-shrink-0" />
            <div className="flex flex-col flex-1">
              <CardTitle className="mb-2 text-left text-2xl font-medium text-[#7248e6]">
                DJ & MC Questionnaire
              </CardTitle>
              <CardDescription className="text-left">
                Create a detailed music and announcement guide for your DJ and MC. 
                Add ceremony music, bridal party introductions, speeches, main event songs, 
                and more. Download as PDF with clickable song links.
              </CardDescription>
            </div>
          </div>

          {/* Event Selector */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Choose Event:
              </label>
              <Select 
                value={selectedEventId || "no-event"} 
                onValueChange={(val) => val !== "no-event" && onEventSelect(val)}
              >
                <SelectTrigger className="w-[300px] border-primary focus:ring-primary [&>span]:font-bold [&>span]:text-[#7248E6]">
                  <SelectValue placeholder="Choose Event" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {events.length > 0 ? (
                    events.map(event => (
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

            {/* Action Buttons */}
            {questionnaire && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full flex items-center gap-2"
                  onClick={() => setShowExporter(true)}
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      {loading ? (
        <Card className="ww-box p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading questionnaire...</p>
        </Card>
      ) : !selectedEventId ? (
        <Card className="ww-box p-8 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="mb-2">Select an Event</CardTitle>
          <CardDescription>
            Choose an event from the dropdown above to create or view your DJ & MC Questionnaire.
          </CardDescription>
        </Card>
      ) : !questionnaire ? (
        <Card className="ww-box p-8 text-center">
          <Music className="w-16 h-16 mx-auto text-primary mb-4" />
          <CardTitle className="mb-2">No Questionnaire Yet</CardTitle>
          <CardDescription className="mb-6">
            Create a DJ & MC Questionnaire for this event to get started with your music planning.
          </CardDescription>
          <Button
            variant="default"
            size="sm"
            className="rounded-full flex items-center gap-2 mx-auto"
            onClick={handleCreateQuestionnaire}
          >
            <Plus className="w-4 h-4" />
            Create Questionnaire
          </Button>
        </Card>
      ) : (
        <>
          {/* Questionnaire Header with Event Info */}
          <DJMCQuestionnaireHeader 
            event={selectedEvent} 
            questionnaire={questionnaire} 
          />

          {/* Main Form */}
          <DJMCQuestionnaireForm 
            questionnaire={questionnaire}
            onRefresh={refetch}
          />
        </>
      )}

      {/* PDF Exporter Modal */}
      {showExporter && questionnaire && selectedEvent && (
        <DJMCQuestionnaireExporter
          questionnaire={questionnaire}
          event={selectedEvent}
          onClose={() => setShowExporter(false)}
        />
      )}
    </div>
  );
};
