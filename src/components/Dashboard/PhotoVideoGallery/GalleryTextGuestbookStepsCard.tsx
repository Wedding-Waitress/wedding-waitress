// How the unified Digital Guestbook works — 4 simple visual steps.
import React from 'react';
import { Card } from '@/components/ui/card';
import { QrCode, ListChecks, PenLine, Lock, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import managementStyles from './photoVideoSharingManagement.module.css';

const STEPS = [
  { icon: QrCode, title: 'Open the Digital Guestbook', text: 'Guests open it using the event link or QR code.' },
  { icon: ListChecks, title: 'Choose a message type', text: 'They can leave a written, audio or video message.' },
  { icon: PenLine, title: 'Create and submit', text: 'They write their message or record their audio or video.' },
  { icon: Lock, title: 'Private delivery', text: 'Guestbook messages are sent privately to the event organisers and are not displayed in the public Photo & Video Gallery by default.' },
];

export const GalleryTextGuestbookStepsCard: React.FC<{ appearance?: 'default' | 'espresso-glass' }> = ({ appearance = 'default' }) => {
  const isGlass = appearance === 'espresso-glass';
  return (
  <Card className={cn('h-full p-5 sm:p-6 space-y-6 overflow-hidden', isGlass && managementStyles.glassCard)} data-appearance={isGlass ? appearance : undefined}>
    <div className="min-w-0">
      <h2 className={cn('text-xl font-bold flex items-center gap-2', isGlass && managementStyles.galleryViewHeading)} style={isGlass ? undefined : { color: '#000000' }}>
        <HelpCircle className={cn('h-5 w-5 text-[#967A59] shrink-0', isGlass && managementStyles.galleryWarmIcon)} strokeWidth={1.8} /> How the Digital Guestbook Works
      </h2>
      <p className={cn('text-sm mt-1 break-words', isGlass && managementStyles.gallerySecondaryText)} style={isGlass ? undefined : { color: '#1a1a1a' }}>
        Four simple steps from your guest's phone straight into your Digital Guestbook.
      </p>
    </div>

    <ol className="space-y-4">
      {STEPS.map((s, i) => (
        <li key={s.title} className="flex items-start gap-3 min-w-0">
          <div className={cn('w-10 h-10 rounded-full bg-[#967A59]/10 flex items-center justify-center shrink-0', isGlass && managementStyles.guestbookStepIcon)}>
            <s.icon className={cn('h-5 w-5 text-[#967A59]', isGlass && managementStyles.galleryWarmIcon)} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className={cn('text-sm font-semibold text-[#1D1D1F] break-words', isGlass && managementStyles.galleryViewHeading)}>{i + 1}. {s.title}</p>
            <p className={cn('text-sm text-[#6E6E73] mt-1 break-words', isGlass && managementStyles.gallerySecondaryText)}>{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  </Card>
  );
};

export default GalleryTextGuestbookStepsCard;
