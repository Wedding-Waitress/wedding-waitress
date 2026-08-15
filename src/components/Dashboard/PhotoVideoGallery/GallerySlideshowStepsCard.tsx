// How the Live Slideshow works — 3 simple visual steps.
import React from 'react';
import { Card } from '@/components/ui/card';
import { CircleCheck, ExternalLink, RotateCcw, Presentation } from 'lucide-react';
import { cn } from '@/lib/utils';
import managementStyles from './photoVideoSharingManagement.module.css';

const STEPS = [
  { icon: CircleCheck, title: 'Approve your media', text: 'Approve the guest photos and videos you want displayed.' },
  { icon: ExternalLink, title: 'Open on a big screen', text: 'Open the Live Slideshow on a television, monitor or projector.' },
  { icon: RotateCcw, title: 'It updates itself', text: 'Newly approved uploads automatically join the slideshow.' },
];

export const GallerySlideshowStepsCard: React.FC<{ appearance?: 'default' | 'espresso-glass'; embedded?: boolean }> = ({ appearance = 'default', embedded = false }) => {
  const isGlass = appearance === 'espresso-glass';
  return (
  <Card className={cn(
    'overflow-hidden',
    embedded ? 'p-4 space-y-4' : 'h-full p-5 sm:p-6 space-y-5',
    isGlass && managementStyles.glassCard,
  )} data-appearance={isGlass ? appearance : undefined} data-slideshow-workspace-card={embedded ? 'steps' : undefined}>
    <div className="min-w-0">
      <h2 className={cn('text-xl font-bold flex items-center gap-2', isGlass && managementStyles.galleryViewHeading)} style={isGlass ? undefined : { color: '#000000' }}>
        <Presentation size={22} strokeWidth={1.8} className={cn('text-[#967A59] shrink-0', isGlass && managementStyles.galleryWarmIcon)} /> How the Live Slideshow Works
      </h2>
      <p className={cn('text-sm mt-1 break-words', isGlass && managementStyles.gallerySecondaryText)} style={isGlass ? undefined : { color: '#1a1a1a' }}>
        Three steps to a beautiful, continuously updating display.
      </p>
    </div>

    <ol className="space-y-4">
      {STEPS.map((s, i) => (
        <li key={s.title} className="flex items-start gap-3 min-w-0">
          <div className={cn('w-9 h-9 rounded-full bg-[#967A59]/10 flex items-center justify-center shrink-0', isGlass && managementStyles.guestbookStepIcon)}>
            <s.icon size={18} strokeWidth={1.8} className="text-[#967A59]" />
          </div>
          <div className="min-w-0">
            <p className={cn('text-sm font-semibold text-[#1D1D1F]', isGlass && managementStyles.galleryViewHeading)}>{i + 1}. {s.title}</p>
            <p className={cn('text-sm text-muted-foreground break-words', isGlass && managementStyles.gallerySecondaryText)}>{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  </Card>
  );
};

export default GallerySlideshowStepsCard;
