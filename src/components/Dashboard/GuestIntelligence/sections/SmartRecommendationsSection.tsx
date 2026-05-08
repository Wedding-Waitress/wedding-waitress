import { useMemo } from 'react';
import { Sparkles, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import {
  computeRsvpInsights,
  computeSeatingInsights,
  computeDietaryInsights,
  computeEngagementInsights,
  computeRecommendations,
  type TableLite,
  type EventLite,
} from '../lib/computeGuestInsights';
import type { Guest } from '@/hooks/useGuests';

const toneIcon = {
  warning: <AlertTriangle className="w-4 h-4 text-[#8A5A14]" />,
  info: <Info className="w-4 h-4 text-[#967A59]" />,
  positive: <CheckCircle2 className="w-4 h-4 text-[#2F6B2F]" />,
};

const toneBg = {
  warning: 'bg-[#FBF4E8] border-[#EDDDC0]',
  info: 'bg-[#FBF8F2] border-[#ECE5D8]',
  positive: 'bg-[#F4F9F4] border-[#DCEBDC]',
};

export const SmartRecommendationsSection = ({
  guests,
  tables,
  event,
}: {
  guests: Guest[];
  tables: TableLite[];
  event?: EventLite | null;
}) => {
  const recs = useMemo(() => {
    const rsvp = computeRsvpInsights(guests);
    const seating = computeSeatingInsights(guests, tables);
    const dietary = computeDietaryInsights(guests);
    const engagement = computeEngagementInsights(guests);
    return computeRecommendations(rsvp, seating, dietary, engagement, event);
  }, [guests, tables, event]);

  const actionable = recs.filter(r => r.tone !== 'positive').length;

  return (
    <IntelligenceSection
      value="recommendations"
      title="Smart Recommendations"
      description="Suggested next actions"
      icon={<Sparkles className="w-4 h-4" />}
      badge={actionable || ''}
      badgeTone="warning"
    >
      <div className="space-y-2">
        {recs.map(r => (
          <div
            key={r.id}
            className={`rounded-xl border px-3 py-2.5 flex gap-3 ${toneBg[r.tone]}`}
          >
            <div className="mt-0.5 shrink-0">{toneIcon[r.tone]}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#1D1D1F] leading-snug">
                {r.title}
              </div>
              {r.detail && (
                <div className="text-[11.5px] text-[#6E6E73] mt-0.5 leading-snug">
                  {r.detail}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </IntelligenceSection>
  );
};

export default SmartRecommendationsSection;
