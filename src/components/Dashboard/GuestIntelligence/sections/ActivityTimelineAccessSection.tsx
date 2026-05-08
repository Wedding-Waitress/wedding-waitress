import { useState } from 'react';
import { History } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import EmptyHint from '../EmptyHint';
import { GuestActivityTimeline } from '@/components/Dashboard/GuestActivityTimeline';
import type { Guest } from '@/hooks/useGuests';

export const ActivityTimelineAccessSection = ({ guests }: { guests: Guest[] }) => {
  const [guestId, setGuestId] = useState<string>('');
  const sorted = [...guests].sort((a, b) =>
    `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
  );

  return (
    <IntelligenceSection
      value="activity"
      title="Guest Activity Timeline"
      description="Per-guest CRM-style history"
      icon={<History className="w-4 h-4" />}
    >
      <p className="text-[12px] text-[#6E6E73] mb-3 leading-relaxed">
        Inspect a chronological record of invites, responses, reminders and updates for any guest.
      </p>
      {guests.length === 0 ? (
        <EmptyHint>Add guests first to view activity timelines.</EmptyHint>
      ) : (
        <>
          <select
            value={guestId}
            onChange={e => setGuestId(e.target.value)}
            className="w-full h-10 rounded-lg border border-[#ECE5D8] bg-white px-3 text-[13px] text-[#1D1D1F] mb-3 focus:outline-none focus:ring-2 focus:ring-[#967A59]/20 focus:border-[#967A59]/40 transition"
          >
            <option value="">Select a guest…</option>
            {sorted.map(g => (
              <option key={g.id} value={g.id}>
                {g.first_name} {g.last_name}
              </option>
            ))}
          </select>
          {guestId ? (
            <GuestActivityTimeline guestId={guestId} defaultOpen />
          ) : (
            <EmptyHint>Select a guest to view their activity history.</EmptyHint>
          )}
        </>
      )}
    </IntelligenceSection>
  );
};

export default ActivityTimelineAccessSection;
