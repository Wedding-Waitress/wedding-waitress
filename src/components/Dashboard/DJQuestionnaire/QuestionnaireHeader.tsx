import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DJQuestionnaireWithData, TemplateType } from '@/types/djQuestionnaire';
import {
  Event,
  formatEventDate,
  getEventName,
  getTemplateDisplayLabel,
  formatTimeRange,
  getCurrentDateTime,
} from '@/lib/djQuestionnaireFormatters';

interface QuestionnaireHeaderProps {
  event: Event;
  questionnaire: DJQuestionnaireWithData;
  templateType: TemplateType;
  pageCount?: number;
}

export const QuestionnaireHeader = ({
  event,
  questionnaire,
  templateType,
  pageCount = 1,
}: QuestionnaireHeaderProps) => {
  const headerOverrides = questionnaire.header_overrides as Record<string, any> || {};
  const { date: generatedDate, time: generatedTime } = getCurrentDateTime();

  // Line 1: Event Name
  const eventName = getEventName(event);

  // Line 2: Template Label & Date
  const templateLabel = getTemplateDisplayLabel(templateType);
  const fullDate = formatEventDate(event.date);

  // Line 3: Event Details
  const venue = headerOverrides.venue_override || event.venue_name || event.venue || 'Venue TBD';
  const ceremonyTime = formatTimeRange(
    headerOverrides.ceremony_start || event.start_time,
    headerOverrides.ceremony_finish || event.start_time
  );
  const canapesTime = formatTimeRange(
    headerOverrides.canapes_start || null,
    headerOverrides.canapes_finish || null
  );
  const receptionTime = formatTimeRange(
    headerOverrides.reception_start || event.start_time,
    headerOverrides.reception_finish || event.finish_time
  );
  const djName = headerOverrides.dj_name || 'TBD';
  const djMobile = headerOverrides.dj_mobile || 'TBD';
  const mcName = headerOverrides.mc_name || 'TBD';
  const mcMobile = headerOverrides.mc_mobile || 'TBD';

  return (
    <Card className="ww-box print:shadow-none print:border-0" id="questionnaire-header">
      <CardContent className="p-6 space-y-3">
        {/* Line 1: Event Name */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#6D28D9' }}>
            {eventName}
          </h1>
        </div>

        <Separator className="print:bg-border" />

        {/* Line 2: Template & Date */}
        <div>
          <p className="text-lg font-semibold text-foreground">
            {templateLabel} – {fullDate}
          </p>
        </div>

        <Separator className="print:bg-border" />

        {/* Line 3: Event Details */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <span className="font-medium">Venue:</span> {venue}
          </p>
          <p>
            <span className="font-medium">Ceremony:</span> {ceremonyTime}
            {canapesTime && canapesTime !== 'TBD' && (
              <> —{' '}<span className="font-medium">Canapés:</span> {canapesTime}</>
            )}
            {' '}—{' '}<span className="font-medium">Reception:</span> {receptionTime}
          </p>
          <p>
            <span className="font-medium">DJ:</span> {djName}, {djMobile} —{' '}
            <span className="font-medium">MC:</span> {mcName}, {mcMobile}
          </p>
        </div>

        <Separator className="print:bg-border" />

        {/* Line 4: Metadata */}
        <div className="text-xs text-muted-foreground italic">
          <p>
            Pages: {pageCount} — Generated on: {generatedDate} — Time: {generatedTime}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
