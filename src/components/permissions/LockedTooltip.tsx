import React from 'react';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RESTRICTED_REASON } from '@/lib/permissions';

interface Props {
  children: React.ReactNode;
  reason?: string;
  /** When true, wraps with tooltip; when false, renders children plainly. */
  active?: boolean;
}

/**
 * Wraps a (typically disabled) control with an elegant brand-styled tooltip
 * explaining the master-only restriction. Tap-to-show on touch devices.
 */
export const LockedTooltip: React.FC<Props> = ({ children, reason = RESTRICTED_REASON, active = true }) => {
  if (!active) return <>{children}</>;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* span lets disabled buttons still receive pointer events */}
          <span className="inline-flex items-center" tabIndex={0}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[260px] bg-white border border-[#E8E1D6] text-[#1D1D1F] shadow-[0_8px_24px_-8px_rgba(150,122,89,0.25)]"
        >
          <div className="flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 mt-0.5 text-[#967A59] flex-shrink-0" />
            <span className="text-xs leading-relaxed">{reason}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
