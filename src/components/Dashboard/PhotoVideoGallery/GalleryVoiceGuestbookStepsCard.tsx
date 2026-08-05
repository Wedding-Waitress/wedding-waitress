// How the Audio Guestbook works — 3 simple visual steps.
import React from 'react';
import { Card } from '@/components/ui/card';
import { QrCode, Mic2, CircleCheck, HelpCircle } from 'lucide-react';

const STEPS = [
  { icon: QrCode, title: 'Open the Audio Guestbook', text: 'Guests open the Audio Guestbook using the link or QR code.' },
  { icon: Mic2, title: 'Record a message', text: 'They allow microphone access and record their message.' },
  { icon: CircleCheck, title: 'Review the recording', text: 'Their recording appears here for the event organiser to review.' },
];

export const GalleryVoiceGuestbookStepsCard: React.FC = () => (
  <Card className="h-full p-5 sm:p-6 space-y-5 overflow-hidden">
    <div className="min-w-0">
      <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
        <HelpCircle className="h-5 w-5 text-[#967A59] shrink-0" strokeWidth={1.8} /> How the Audio Guestbook Works
      </h2>
      <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
        Three simple steps from QR code to a recording you can keep forever.
      </p>
    </div>

    <ol className="space-y-4">
      {STEPS.map((s, i) => (
        <li key={s.title} className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#967A59]/10 flex items-center justify-center shrink-0">
            <s.icon className="h-5 w-5 text-[#967A59]" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1D1D1F] break-words">
              {i + 1}. {s.title}
            </p>
            <p className="text-sm text-[#6E6E73] break-words">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  </Card>
);

export default GalleryVoiceGuestbookStepsCard;
