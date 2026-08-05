// Audio & Video Message Settings — surfaces the existing recording settings used by the guest recorder.
// Read-only: values come from the saved gallery settings; no new settings are introduced here.
import React from 'react';
import { Card } from '@/components/ui/card';
import { Settings2, Timer, HardDrive, Mic2 } from 'lucide-react';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';

function mb(bytes: number) {
  if (!bytes) return '—';
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export const GalleryVoiceSettingsCard: React.FC<{ meta: GalleryMeta }> = ({ meta }) => {
  const rows = [
    {
      icon: Timer,
      label: 'Maximum recording length',
      value: meta.max_video_duration_sec ? `${meta.max_video_duration_sec} seconds` : '—',
      hint: 'Applied automatically in the guest recorder.',
    },
    {
      icon: HardDrive,
      label: 'Maximum recording file size',
      value: mb(meta.max_video_bytes),
      hint: 'Recordings larger than this are rejected before upload.',
    },
    {
      icon: Mic2,
      label: 'Guest recording',
      value: meta.voice_guestbook_enabled ? 'Available to guests' : 'Turned off for guests',
      hint: 'Controlled by the toggle at the top of this workspace.',
    },
  ];

  return (
    <Card className="p-5 sm:p-6 space-y-5 overflow-hidden">
      <div className="min-w-0">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
          <Settings2 className="h-5 w-5 text-[#967A59] shrink-0" strokeWidth={1.8} /> Audio & Video Message Settings
        </h2>
        <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
          The saved recording settings currently used by your guest recorder.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map(r => (
          <div key={r.label} className="rounded-xl border border-border p-4 min-w-0">
            <div className="flex items-center gap-2">
              <r.icon className="h-4 w-4 text-[#967A59] shrink-0" strokeWidth={1.8} />
              <p className="text-xs uppercase tracking-wide text-[#6E6E73] break-words">{r.label}</p>
            </div>
            <p className="text-lg font-semibold text-[#1D1D1F] mt-2 break-words">{r.value}</p>
            <p className="text-xs text-[#6E6E73] mt-1 break-words">{r.hint}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default GalleryVoiceSettingsCard;
