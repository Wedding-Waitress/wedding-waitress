import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import InsightCard from '../InsightCard';
import EmptyHint from '../EmptyHint';
import { computeRsvpInsights } from '../lib/computeGuestInsights';
import type { Guest } from '@/hooks/useGuests';

export const RsvpIntelligenceSection = ({ guests }: { guests: Guest[] }) => {
  const ins = useMemo(() => computeRsvpInsights(guests), [guests]);
  const ratePct = Math.round(ins.responseRate * 100);
  return (
    <IntelligenceSection
      value="rsvp"
      title="RSVP Intelligence"
      description="Response status across your guest list"
      icon={<CheckCircle2 className="w-4 h-4" />}
      badge={ins.total ? `${ratePct}%` : ''}
      badgeTone={ins.pending > 0 ? 'warning' : 'neutral'}
    >
      {ins.total === 0 ? (
        <EmptyHint>Add guests to see RSVP insights here.</EmptyHint>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <InsightCard label="Attending" value={ins.attending} tone="positive" />
          <InsightCard
            label="Pending"
            value={ins.pending}
            tone={ins.pending > 0 ? 'warning' : 'neutral'}
          />
          <InsightCard label="Declined" value={ins.declined} />
          <InsightCard
            label="Response Rate"
            value={`${ratePct}%`}
            hint={`${ins.attending + ins.declined} of ${ins.total} responded`}
            tone="info"
          />
        </div>
      )}
    </IntelligenceSection>
  );
};

export default RsvpIntelligenceSection;
