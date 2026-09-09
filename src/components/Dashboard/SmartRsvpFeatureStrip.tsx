/**
 * SmartRsvpFeatureStrip
 *
 * Premium feature strip for the Guest List page. Sits below the top stats
 * summary bar and above Step 1 / Step 2 / Step 3 cards.
 *
 * Design: minimal, Apple-like — soft muted background, thin border, small
 * icons, no heavy shadow. Responsive: 6-col / 3-col / 2-col / stacked.
 */
import React from 'react';
import { Send, MessagesSquare, Truck, ChartNoAxesCombined, MessageSquareText, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SmartRsvpStripActions {
  onCommandCentre?: React.MouseEventHandler<HTMLButtonElement>;
  onCommunications?: React.MouseEventHandler<HTMLButtonElement>;
  onDelivery?: React.MouseEventHandler<HTMLButtonElement>;
  onIntelligence?: React.MouseEventHandler<HTMLButtonElement>;
  onSmsCredits?: React.MouseEventHandler<HTMLButtonElement>;
  onGuestLiveView?: React.MouseEventHandler<HTMLButtonElement>;
}

interface Props extends SmartRsvpStripActions {
  className?: string;
}

const Pill = ({
  icon, title, subtitle, onClick,
}: { icon: React.ReactNode; title: string; subtitle: string; onClick?: React.MouseEventHandler<HTMLButtonElement> }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'group flex items-center gap-3 rounded-2xl border border-[#E8E1D6] bg-[#FBF7F2]/60',
      'h-full min-h-16 px-3 py-3 text-left transition-colors',
      'hover:bg-[#FBF7F2] hover:border-[#967A59]/40',
      'lv-premium-shade'
    )}
  >
    <span className="shrink-0 w-9 h-9 rounded-xl bg-white border border-[#E8E1D6] flex items-center justify-center text-[#967A59]">
      {icon}
    </span>
    <span className="min-w-0">
      <span className="ww-command-centre-title block text-[13px] font-semibold text-[#1D1D1F]">{title}</span>
      <span className="ww-command-centre-subtitle block text-[11px] text-[#6E6E73]">{subtitle}</span>
    </span>
  </button>
);

export const SmartRsvpFeatureStrip: React.FC<Props> = ({
  onCommandCentre, onCommunications, onDelivery, onIntelligence,
  onSmsCredits, onGuestLiveView, className,
}) => {
  return (
    <div className={cn('grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3', className)}>
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
      <Pill
        icon={<MessageSquareText size={20} strokeWidth={1.8} aria-hidden="true" />}
        title="Email & SMS Credits"
        subtitle="Balance & top-ups"
        onClick={onSmsCredits}
      />
      <Pill
        icon={<ShieldCheck size={20} strokeWidth={1.8} aria-hidden="true" />}
        title="Guest Live View"
        subtitle="Privacy & visibility"
        onClick={onGuestLiveView}
      />
    </div>
  );
};
