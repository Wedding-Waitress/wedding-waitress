import { useEffect, useMemo } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import type { Guest } from '@/hooks/useGuests';
import { computeRsvpInsights, type EventLite, type TableLite } from './lib/computeGuestInsights';
import RsvpIntelligenceSection from './sections/RsvpIntelligenceSection';
import RelationshipIntelligenceSection from './sections/RelationshipIntelligenceSection';
import DietaryIntelligenceSection from './sections/DietaryIntelligenceSection';
import SeatingIntelligenceSection from './sections/SeatingIntelligenceSection';
import EngagementIntelligenceSection from './sections/EngagementIntelligenceSection';
import SmartRecommendationsSection from './sections/SmartRecommendationsSection';
import ActivityTimelineAccessSection from './sections/ActivityTimelineAccessSection';

interface Props {
  open: boolean;
  onClose: () => void;
  guests: Guest[];
  tables: TableLite[];
  event?: EventLite | null;
}

export const GuestIntelligencePanel = ({ open, onClose, guests, tables, event }: Props) => {
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const overview = useMemo(() => computeRsvpInsights(guests), [guests]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-stretch justify-end"
      onClick={onClose}
    >
      <aside
        className="w-full sm:w-[520px] lg:w-[560px] bg-[#FBF7F2] h-full overflow-hidden flex flex-col shadow-2xl border-l border-[#E8E1D6]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Guest Intelligence Centre"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[#E8E1D6] px-5 sm:px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F4EDE0] flex items-center justify-center text-[#967A59] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-[#1D1D1F] leading-tight">
                Event Intelligence Overview
              </h2>
              <p className="text-xs text-[#6E6E73] mt-0.5">
                Smart insights derived from your guest list — separate from delivery analytics.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#6E6E73] hover:text-[#1D1D1F] p-1 -m-1 shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick chips */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="rounded-lg bg-white border border-[#E8E1D6] px-2.5 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wide text-[#6E6E73]">Total</div>
              <div className="text-sm font-semibold text-[#1D1D1F]">{overview.total}</div>
            </div>
            <div className="rounded-lg bg-white border border-[#E8E1D6] px-2.5 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wide text-[#6E6E73]">Confirmed</div>
              <div className="text-sm font-semibold text-[#2F6B2F]">{overview.attending}</div>
            </div>
            <div className="rounded-lg bg-white border border-[#E8E1D6] px-2.5 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wide text-[#6E6E73]">Pending</div>
              <div className="text-sm font-semibold text-[#8A5A14]">{overview.pending}</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
          <Accordion type="multiple" defaultValue={["rsvp"]} className="space-y-3">
            <RsvpIntelligenceSection guests={guests} />
            <RelationshipIntelligenceSection guests={guests} />
            <DietaryIntelligenceSection guests={guests} />
            <SeatingIntelligenceSection guests={guests} tables={tables} />
            <EngagementIntelligenceSection guests={guests} />
            <SmartRecommendationsSection guests={guests} tables={tables} event={event} />
            <ActivityTimelineAccessSection guests={guests} />
          </Accordion>

          <p className="text-[11px] text-[#6E6E73] text-center mt-6 px-4 leading-relaxed">
            Insights here focus on your guests. For invite delivery, opens and reminders, open the Communications Centre.
          </p>
        </div>
      </aside>
    </div>
  );
};

export default GuestIntelligencePanel;
