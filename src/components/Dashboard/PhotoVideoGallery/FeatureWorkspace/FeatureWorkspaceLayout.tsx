// Reusable full-width feature workspace layout for the six Guest Experience Features.
// No dashboard sidebar — slim header + large content panel on the gallery dark-brown background.
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import logoImage from '@/assets/wedding-waitress-full-logo.png';

export interface FeatureWorkspaceLayoutProps {
  title: string;
  description: string;
  eventName?: string | null;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  toggleDisabled?: boolean;
  onBack: () => void;
  backLabel?: string;
  /** Optional extra action rendered in the header (e.g. Preview as Guest). */
  headerAction?: React.ReactNode;
  /** Optional override for the "feature is off" notice. */
  disabledNotice?: string;
  children?: React.ReactNode;
}

export const FeatureWorkspaceLayout: React.FC<FeatureWorkspaceLayoutProps> = ({
  title,
  description,
  eventName,
  enabled,
  onToggle,
  toggleDisabled,
  onBack,
  backLabel = 'Back to Photo & Video Sharing',
  headerAction,
  disabledNotice,
  children,
}) => {
  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: '#472c1d' }}>
      {/* Slim header */}
      <header className="w-full">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5 pb-6">
          {/* Level 1 — Logo */}
          <div className="flex justify-center lg:justify-start">
            <img
              src={logoImage}
              alt="Wedding Waitress"
              className="h-12 md:h-14 w-auto object-contain shrink-0"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>

          {/* Level 2 — Centred page identity */}
          <div className="mt-6 sm:mt-8 text-center">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white break-words">{title}</h1>
            <p className="text-sm text-white/80 mt-1 break-words">{description}</p>
          </div>

          {/* Level 3 — Navigation and controls */}
          <div className="mt-6 sm:mt-8 flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/40 px-3 py-1.5 min-h-[40px] text-xs sm:text-sm font-semibold text-white transition-all duration-200 hover:bg-white hover:text-[#967A59] active:translate-y-[1px]"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">{backLabel}</span>
            </button>

            <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end sm:gap-5">
              {headerAction && <div className="shrink-0">{headerAction}</div>}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                {eventName && (
                  <div className="min-w-0 text-center sm:text-left">
                    <p className="text-[11px] uppercase tracking-wide text-white/60">Selected event</p>
                    <p className="text-sm sm:text-base font-semibold text-white truncate max-w-[220px]">{eventName}</p>
                  </div>
                )}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm sm:text-base font-bold text-white">{enabled ? 'On' : 'Off'}</span>
                  <Switch
                    checked={enabled}
                    disabled={toggleDisabled}
                    onCheckedChange={onToggle}
                    aria-label={`${title} enabled`}
                    className="shrink-0 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Level 4 — Separator */}
        <div className="border-b border-white/15" />

        {!enabled && (
          <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mt-4 rounded-xl border border-white/25 bg-white/10 px-4 py-3">
              <p className="text-sm text-white break-words">
                {disabledNotice || 'This feature is currently turned off for your guests. You can still manage its settings and content.'}
              </p>
            </div>
          </div>
        )}
      </header>


      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-8 sm:pb-12">
        {children}
      </main>
    </div>
  );
};

export default FeatureWorkspaceLayout;
