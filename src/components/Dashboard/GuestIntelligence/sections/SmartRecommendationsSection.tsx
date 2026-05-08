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
  warning: 'bg-[#FBF3E8] border-[#EBD9BD]',
  info: 'bg-[#FBF7F2] border-[#E8E1D6]',
  positive: 'bg-[#F1F7F1] border-[#D7E7D7]',
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
    >
      <div className="space-y-2">
        {recs.map(r => (
          <div key={r.id} className={`rounded-xl border p-3 flex gap-3 ${toneBg[r.tone]}`}>
            <div className="mt-0.5">{toneIcon[r.tone]}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#1D1D1F]">{r.title}</div>
              {r.detail && <div className="text-xs text-[#6E6E73] mt-0.5">{r.detail}</div>}
            </div>
          </div>
        ))}
      </div>
    </IntelligenceSection>
  );
};

export default SmartRecommendationsSection;
