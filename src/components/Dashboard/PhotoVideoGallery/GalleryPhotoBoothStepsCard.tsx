// How the Digital Photo Booth works — 3 simple visual steps.
import React from 'react';
import { Card } from '@/components/ui/card';
import { QrCode, Camera, CircleCheck, HelpCircle } from 'lucide-react';

const STEPS = [
  { icon: QrCode, title: 'Scan or open the link', text: 'Guests scan the QR code or open the Digital Photo Booth link on their phone or tablet.' },
  { icon: Camera, title: 'Take the photo', text: 'They allow camera access and take their photo with the on-screen countdown.' },
  { icon: CircleCheck, title: 'Review & approve', text: 'Their submitted photo appears here for review and gallery approval.' },
];

export const GalleryPhotoBoothStepsCard: React.FC = () => (
  <Card className="h-full p-5 sm:p-6 space-y-6 overflow-hidden">
    <div className="min-w-0">
      <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
        <HelpCircle className="h-5 w-5 text-[#967A59] shrink-0" /> How the Digital Photo Booth Works
      </h2>
      <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
        Three simple steps from your guest's phone straight into your event gallery.
      </p>
    </div>

    <ol className="space-y-4">
      {STEPS.map((s, i) => (
        <li key={s.title} className="flex items-start gap-4 rounded-xl border border-border bg-muted/30 p-4">
          <div className="w-11 h-11 rounded-full bg-[#967A59]/10 flex items-center justify-center shrink-0">
            <s.icon className="h-5 w-5 text-[#967A59]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1D1D1F] break-words">
              <span className="text-[#967A59] mr-1">{i + 1}.</span>{s.title}
            </p>
            <p className="text-sm text-[#6E6E73] mt-1 break-words">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  </Card>
);

export default GalleryPhotoBoothStepsCard;
