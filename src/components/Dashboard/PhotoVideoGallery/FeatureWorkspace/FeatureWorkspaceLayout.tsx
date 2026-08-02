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
  backLabel = 'Back to Photo & Video Gallery',
  headerAction,
  disabledNotice,
  children,
}) => {
  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: '#472c1d' }}>
      {/* Slim header */}
      <header className="w-full border-b border-white/15">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          {/* Logo — top left */}
          <div className="flex justify-center lg:justify-start">
            <img
              src="/wedding-waitress-logo.png"
              alt="Wedding Waitress"
              className="h-8 w-auto shrink-0"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>

          {/* Header row: back (left) · title (true centre) · actions + event + toggle (right) */}
          <div className="relative mt-4 flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            {/* Left */}
            <div className="w-full lg:w-auto lg:max-w-[26%] flex justify-center lg:justify-start shrink-0">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/40 px-3 py-1.5 min-h-[36px] text-xs sm:text-sm font-semibold text-white transition-all duration-200 hover:bg-white hover:text-[#967A59] active:translate-y-[1px]"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">{backLabel}</span>
              </button>
            </div>

            {/* Centre — statically centred on mobile/tablet, absolutely centred on desktop */}
            <div className="w-full text-center lg:absolute lg:left-1/2 lg:top-0 lg:-translate-x-1/2 lg:w-[40%] lg:max-w-[560px] lg:px-2 pointer-events-none">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white break-words">{title}</h1>
              <p className="text-sm text-white/80 mt-1 break-words">{description}</p>
            </div>

            {/* Right */}
            <div className="w-full lg:w-auto lg:max-w-[30%] flex flex-wrap items-center justify-center gap-4 lg:justify-end lg:gap-5 shrink-0">
              {headerAction && <div className="shrink-0">{headerAction}</div>}
              {eventName && (
                <div className="min-w-0 text-center lg:text-left">
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

          {!enabled && (
            <div className="mt-4 rounded-xl border border-white/25 bg-white/10 px-4 py-3">
              <p className="text-sm text-white break-words">
                {disabledNotice || 'This feature is currently turned off for your guests. You can still manage its settings and content.'}
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {children}
      </main>
    </div>
  );
};

export default FeatureWorkspaceLayout;
