import React, { useState } from 'react';
import { Building2, X, Sparkles, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InviteVenueModal } from './InviteVenueModal';
import type { ReferralEventLite } from '@/hooks/useFirstEventReferral';

interface VenueReferralCardProps {
  event: ReferralEventLite;
  onDismiss: (eventId: string, snoozeDays: number | null) => void;
}

export const VenueReferralCard: React.FC<VenueReferralCardProps> = ({ event, onDismiss }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="dashboard-card relative overflow-hidden">
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => onDismiss(event.id, null)}
          className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
          <div className="w-12 h-12 rounded-2xl bg-[#967A59]/10 flex items-center justify-center shrink-0">
            <Building2 size={22} strokeWidth={1.8} className="text-[#967A59]" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-foreground flex items-center gap-2">
              Using a participating venue?
              <Sparkles className="w-4 h-4 text-[#967A59]" aria-hidden />
            </h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Wedding Waitress can also help your venue streamline future weddings and events.
              Invite your venue to explore the platform and help create a more seamless planning experience.
            </p>
            <p className="text-xs text-muted-foreground/80 mt-2 italic">
              Built for couples, planners, and venues coordinating events together.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto shrink-0">
            <Button
              onClick={() => setOpen(true)}
              className="lv-premium-shade h-11 rounded-full bg-[#967A59] hover:bg-[#7d6549] text-white w-full lg:w-auto px-6 inline-flex items-center justify-center gap-[6px]"
            >
              <Send size={16} strokeWidth={1.8} aria-hidden />
              Invite My Venue
            </Button>
            <Button
              variant="ghost"
              onClick={() => onDismiss(event.id, 14)}
              className="h-11 rounded-full text-muted-foreground hover:text-foreground w-full lg:w-auto"
            >
              Not now
            </Button>
          </div>
        </div>
      </div>

      <InviteVenueModal
        open={open}
        onOpenChange={setOpen}
        event={event}
      />
    </>
  );
};
