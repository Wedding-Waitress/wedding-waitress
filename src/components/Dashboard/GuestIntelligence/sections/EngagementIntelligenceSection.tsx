import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import InsightCard from '../InsightCard';
import { computeEngagementInsights } from '../lib/computeGuestInsights';
import type { Guest } from '@/hooks/useGuests';

export const EngagementIntelligenceSection = ({ guests }: { guests: Guest[] }) => {
  const ins = useMemo(() => computeEngagementInsights(guests), [guests]);
  return (
    <IntelligenceSection
      value="engagement"
      title="Engagement Intelligence"
      description="Invite reach and contact coverage"
      icon={<Activity className="w-4 h-4" />}
    >
      <div className="grid grid-cols-2 gap-2 mb-3">
        <InsightCard label="Invites Sent" value={ins.inviteSent} tone="positive" />
        <InsightCard label="Not Yet Invited" value={ins.inviteNotSent} tone={ins.inviteNotSent ? 'warning' : 'neutral'} />
        <InsightCard label="With Email" value={ins.withEmail} />
        <InsightCard label="With Mobile" value={ins.withMobile} />
        <InsightCard label="Email + Mobile" value={ins.withBoth} tone="info" />
        <InsightCard label="Missing Both" value={ins.withNeither} tone={ins.withNeither ? 'warning' : 'neutral'} />
      </div>
      <div className="text-[11px] text-[#6E6E73] leading-relaxed">
        For delivery, opens and reminders, see the Communications Centre.
      </div>
    </IntelligenceSection>
  );
};

export default EngagementIntelligenceSection;
