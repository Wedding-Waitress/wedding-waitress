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
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const overview = useMemo(() => computeRsvpInsights(guests), [guests]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] flex items-stretch justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <aside
        className="ww-guest-intelligence-drawer w-full sm:w-[520px] lg:w-[560px] bg-[#FBF8F2] h-full overflow-hidden flex flex-col shadow-2xl border-l border-[#ECE5D8] animate-in slide-in-from-right duration-300 ease-out"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Guest Intelligence Centre"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#ECE5D8] px-5 sm:px-6 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F4EDE0] flex items-center justify-center text-[#967A59] shrink-0">
              <Sparkles className="w-[17px] h-[17px]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] sm:text-[16px] font-semibold text-[#1D1D1F] leading-tight tracking-tight">
                Event Intelligence Overview
              </h2>
              <p className="text-[11.5px] text-[#6E6E73] mt-0.5 leading-snug">
                Smart insights derived from your guest list — separate from delivery analytics.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#FBF8F2] p-1.5 -m-1 rounded-lg shrink-0 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick chips */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: 'Total', value: overview.total, color: 'text-[#1D1D1F]' },
              { label: 'Confirmed', value: overview.attending, color: 'text-[#2F6B2F]' },
              { label: 'Pending', value: overview.pending, color: 'text-[#8A5A14]' },
            ].map(c => (
              <div
                key={c.label}
                className="rounded-lg bg-white border border-[#ECE5D8] px-2.5 py-2 text-center"
              >
                <div className="text-[10px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
                  {c.label}
                </div>
                <div className={`text-[14px] font-semibold mt-0.5 tabular-nums ${c.color}`}>
                  {c.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-5 scroll-smooth">
          <Accordion type="multiple" defaultValue={['rsvp']} className="space-y-3">
            <RsvpIntelligenceSection guests={guests} eventId={event?.id ?? null} />
            <RelationshipIntelligenceSection
              guests={guests}
              partner1Name={event?.partner1_name ?? null}
              partner2Name={event?.partner2_name ?? null}
            />
            <DietaryIntelligenceSection guests={guests} />
            <SeatingIntelligenceSection guests={guests} tables={tables} />
            <EngagementIntelligenceSection guests={guests} eventId={event?.id ?? null} />
            <SmartRecommendationsSection guests={guests} tables={tables} event={event} />
            <ActivityTimelineAccessSection guests={guests} eventId={event?.id ?? null} />
          </Accordion>

          <p className="text-[11px] text-[#6E6E73] text-center mt-6 px-4 leading-relaxed">
            Insights here focus on your guests. For invite delivery, opens and reminders, open the
            Communications Centre.
          </p>
        </div>
      </aside>
    </div>
  );
};

export default GuestIntelligencePanel;
