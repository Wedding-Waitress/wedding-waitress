import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { formatDisplayTime } from '@/lib/utils';
import type { DJMCQuestionnaireWithData } from '@/types/djmcQuestionnaire';

interface DJMCQuestionnaireHeaderProps {
  event: {
    id: string;
    name: string;
    partner1_name?: string | null;
    partner2_name?: string | null;
    date?: string | null;
    venue?: string | null;
    venue_name?: string | null;
    start_time?: string | null;
    finish_time?: string | null;
  } | null;
  questionnaire: DJMCQuestionnaireWithData;
}

export const DJMCQuestionnaireHeader: React.FC<DJMCQuestionnaireHeaderProps> = ({
  event,
  questionnaire,
}) => {
  if (!event) return null;

  const getEventName = () => {
    if (event.partner1_name && event.partner2_name) {
      return `${event.partner1_name} & ${event.partner2_name}'s Wedding`;
    }
    return event.name;
  };

  const formatEventDate = () => {
    if (!event.date) return 'Date TBD';
    try {
      return format(new Date(event.date), 'EEEE, d MMMM yyyy');
    } catch {
      return 'Date TBD';
    }
  };

  const overrides = questionnaire.header_overrides || {};

  return (
    <Card className="ww-box print:shadow-none print:border-0" id="questionnaire-header">
      <CardContent className="p-6 text-center space-y-2">
        {/* Event Name */}
        <h1 className="text-2xl font-bold text-[#7248e6]">
          {getEventName()}
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-muted-foreground">
          DJ & MC Questionnaire — {formatEventDate()}
        </p>

        {/* Venue & Time Info */}
        <div className="text-sm text-muted-foreground pt-2 space-y-1">
          {(overrides.venue_override || event.venue_name || event.venue) && (
            <p>
              <span className="font-medium">Venue:</span>{' '}
              {overrides.venue_override || event.venue_name || event.venue}
            </p>
          )}
          
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {(overrides.ceremony_start || event.start_time) && (
              <span>
                <span className="font-medium">Ceremony:</span>{' '}
                {overrides.ceremony_start || formatDisplayTime(event.start_time || '')}
              </span>
            )}
            {(overrides.reception_start || event.finish_time) && (
              <span>
                <span className="font-medium">Reception:</span>{' '}
                {overrides.reception_start || formatDisplayTime(event.finish_time || '')}
              </span>
            )}
          </div>

          {/* DJ/MC Info */}
          <div className="flex items-center justify-center gap-4 flex-wrap pt-1">
            {overrides.dj_name && (
              <span>
                <span className="font-medium">DJ:</span> {overrides.dj_name}
                {overrides.dj_phone && ` (${overrides.dj_phone})`}
              </span>
            )}
            {overrides.mc_name && (
              <span>
                <span className="font-medium">MC:</span> {overrides.mc_name}
                {overrides.mc_phone && ` (${overrides.mc_phone})`}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
