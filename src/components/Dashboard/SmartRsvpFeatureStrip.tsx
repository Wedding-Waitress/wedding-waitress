/**
 * SmartRsvpFeatureStrip
 *
 * Premium feature strip for the Guest List page. Sits below the top stats
 * summary bar and above Step 1 / Step 2 / Step 3 cards.
 *
 * Design: minimal, Apple-like — soft muted background, thin border, small
 * icons, no heavy shadow. Responsive: 4-col / 2x2 / stacked.
 */
import React from 'react';
import { Send, MessagesSquare, Truck, ChartNoAxesCombined } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SmartRsvpStripActions {
  onCommandCentre?: () => void;
  onCommunications?: () => void;
  onDelivery?: () => void;
  onIntelligence?: () => void;
}

interface Props extends SmartRsvpStripActions {
  className?: string;
}

const Pill = ({
  icon, title, subtitle, onClick,
}: { icon: React.ReactNode; title: string; subtitle: string; onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'group flex items-center gap-3 rounded-2xl border border-[#E8E1D6] bg-[#FBF7F2]/60',
      'px-4 py-3 text-left transition-colors',
      'hover:bg-[#FBF7F2] hover:border-[#967A59]/40',
      'lv-premium-shade'
    )}
  >
    <span className="shrink-0 w-9 h-9 rounded-xl bg-white border border-[#E8E1D6] flex items-center justify-center text-[#967A59]">
      {icon}
    </span>
    <span className="min-w-0">
      <span className="block text-[13px] font-semibold text-[#1D1D1F] truncate">{title}</span>
      <span className="ww-command-centre-subtitle block text-[11px] text-[#6E6E73] truncate">{subtitle}</span>
    </span>
  </button>
);

export const SmartRsvpFeatureStrip: React.FC<Props> = ({
  onCommandCentre, onCommunications, onDelivery, onIntelligence, className,
}) => {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      <Pill
        icon={<Send size={20} strokeWidth={1.8} aria-hidden="true" />}
        title="RSVP Command Centre"
        subtitle="Send & manage invitations"
        onClick={onCommandCentre}
      />
      <Pill
        icon={<MessagesSquare size={20} strokeWidth={1.8} aria-hidden="true" />}
        title="Communications Centre"
        subtitle="Email & SMS history"
        onClick={onCommunications}
      />
      <Pill
        icon={<Truck size={20} strokeWidth={1.8} aria-hidden="true" />}
        title="Delivery Centre"
        subtitle="Tracking & resend"
        onClick={onDelivery}
      />
      <Pill
        icon={<ChartNoAxesCombined size={20} strokeWidth={1.8} aria-hidden="true" />}
        title="Guest Intelligence Centre"
        subtitle="Smart RSVP analytics"
        onClick={onIntelligence}
      />
    </div>
  );
};
