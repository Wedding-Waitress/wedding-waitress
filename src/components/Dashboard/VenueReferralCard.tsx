import React, { useState } from 'react';
import { Building2, X, Sparkles, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InviteVenueModal } from './InviteVenueModal';
import type { ReferralEventLite } from '@/hooks/useFirstEventReferral';
import styles from './VenueReferralCard.module.css';

interface VenueReferralCardProps {
  event: ReferralEventLite;
  onDismiss: (eventId: string, snoozeDays: number | null) => void;
}

export const VenueReferralCard: React.FC<VenueReferralCardProps> = ({ event, onDismiss }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div data-solid-text-surface="dark" className={`relative overflow-hidden p-5 ${styles.panel}`}>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => onDismiss(event.id, null)}
          className={`absolute top-3 right-3 z-10 p-1.5 rounded-full bg-transparent border-0 transition-colors ${styles.closeButton}`}
        >
          <X className="w-4 h-4" strokeWidth={1.8} />
        </button>

        <div className={`flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 ${styles.layout}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${styles.iconBadge}`}>
            <Building2 size={22} strokeWidth={1.8} className={styles.champagneIcon} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`text-base lg:text-lg font-semibold flex items-center gap-2 ${styles.heading}`}>
              Using a participating venue?
              <Sparkles className={`w-4 h-4 shrink-0 ${styles.champagneIcon}`} aria-hidden />
            </h3>
            <p className={`text-sm mt-1 leading-relaxed ${styles.description}`}>
              Wedding Waitress can also help your venue streamline future weddings and events.
              Invite your venue to explore the platform and help create a more seamless planning experience.
            </p>
            <p className={`text-xs mt-1 italic ${styles.note}`}>
              Built for couples, planners, and venues coordinating events together.
            </p>
          </div>

          <div className={`flex flex-col gap-2.5 w-full lg:w-auto shrink-0 ${styles.actions}`}>
            <Button
              onClick={() => setOpen(true)}
              className={`h-11 rounded-full bg-[#967A59] text-white w-full lg:w-auto px-6 inline-flex items-center justify-center gap-[6px] ${styles.inviteButton}`}
            >
              <Send size={16} strokeWidth={1.8} aria-hidden />
              Invite My Venue
            </Button>
            <Button
              variant="secondary"
              onClick={() => onDismiss(event.id, 14)}
              className={`h-11 rounded-full bg-transparent w-full lg:w-auto px-4 ${styles.notNowButton}`}
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
