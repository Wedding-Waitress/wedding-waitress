// Reusable full-width feature workspace layout for the six Guest Experience Features.
// No dashboard sidebar — slim header + large content panel on the gallery dark-brown background.
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import logoImage from '@/assets/wedding-waitress-full-logo.png';
import { cn } from '@/lib/utils';
import managementStyles from '../photoVideoSharingManagement.module.css';

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
  /** Adds the 2px brown outline pass to neutral cards, panels, inputs and grey buttons. */
  brownOutline?: boolean;
  /** Opt-in visual treatment for the Photo & Video Sharing management workspace only. */
  appearance?: 'default' | 'photo-video-sharing';
  /** Reuses the approved Photo & Video Sharing page background without changing child styling. */
  backgroundAppearance?: 'default' | 'photo-video-sharing';
  /** Reuses only the approved management header controls without changing typography. */
  controlsAppearance?: 'default' | 'photo-video-sharing';
  toggleClassName?: string;
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
  brownOutline,
  appearance = 'default',
  backgroundAppearance = 'default',
  controlsAppearance = 'default',
  toggleClassName,
  children,
}) => {
  const isPhotoVideoSharing = appearance === 'photo-video-sharing';
  const usesPhotoVideoSharingBackground = isPhotoVideoSharing || backgroundAppearance === 'photo-video-sharing';
  const usesPhotoVideoSharingControls = isPhotoVideoSharing || controlsAppearance === 'photo-video-sharing';

  return (
    <div
      className={cn('min-h-screen w-full overflow-x-hidden', usesPhotoVideoSharingBackground && managementStyles.photoVideoSharingSurface)}
      style={usesPhotoVideoSharingBackground ? undefined : { backgroundColor: '#472c1d' }}
      data-appearance={isPhotoVideoSharing ? appearance : undefined}
    >
      {/* Slim header */}
      <header className={cn('w-full', isPhotoVideoSharing && managementStyles.manropeTypography)}>
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
            <h1 className={cn(
              'text-xl sm:text-2xl text-white break-words',
              isPhotoVideoSharing
                ? 'font-semibold tracking-[-0.012em] leading-tight'
                : 'lg:text-3xl font-bold',
            )}>{title}</h1>
            <p className={cn('text-sm text-white/80 mt-1 break-words', isPhotoVideoSharing && 'font-normal')}>{description}</p>
          </div>

          {/* Level 3 — Navigation and controls */}
          <div className="mt-6 sm:mt-8 flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
            <button
              type="button"
              onClick={onBack}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 min-h-[40px] text-xs sm:text-sm text-white transition-all duration-200 active:translate-y-[1px]',
                usesPhotoVideoSharingControls
                  ? `font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4b97e]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#28140e] ${managementStyles.glassAction}`
                  : 'border-white/40 font-semibold hover:bg-white hover:text-[#967A59]',
              )}
            >
              <ArrowLeft size={16} strokeWidth={1.8} className="shrink-0" />
              <span className="truncate">{backLabel}</span>
            </button>

            <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end sm:gap-5">
              {headerAction && <div className="shrink-0">{headerAction}</div>}
              <div className={cn(
                'flex flex-wrap items-center justify-center gap-3 sm:gap-4',
                usesPhotoVideoSharingControls && `px-4 py-2.5 ${managementStyles.glassStatus}`,
              )}>
                {eventName && (
                  <div className="min-w-0 text-center sm:text-left">
                    <p className={cn(
                      'text-[11px] uppercase tracking-wide text-white/60',
                      usesPhotoVideoSharingControls && `font-medium ${managementStyles.selectedEventLabel}`,
                    )}>Selected event</p>
                    <p className={cn(
                      'text-white truncate max-w-[220px]',
                      usesPhotoVideoSharingControls
                        ? `text-sm font-medium ${managementStyles.selectedEventName}`
                        : 'text-sm sm:text-base font-semibold',
                    )}>{eventName}</p>
                  </div>
                )}
                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn(
                    'text-white',
                    usesPhotoVideoSharingControls ? 'text-sm font-medium text-white/85' : 'text-sm sm:text-base font-bold',
                  )}>{enabled ? 'On' : 'Off'}</span>
                  <Switch
                    checked={enabled}
                    disabled={toggleDisabled}
                    onCheckedChange={onToggle}
                    aria-label={`${title} enabled`}
                    className={cn('shrink-0 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500', toggleClassName)}
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


      <main className={`mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-8 sm:pb-12${brownOutline ? ' ww-brown-outline' : ''}`}>
        {children}
      </main>
    </div>
  );
};

export default FeatureWorkspaceLayout;
