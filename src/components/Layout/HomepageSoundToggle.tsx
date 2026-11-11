import { Volume2, VolumeX } from 'lucide-react';
import { usePublicCopy } from '@/i18n/usePublicCopy';
import { useHomepageVideo } from './HomepageVideoContext';

export const HomepageSoundToggle = () => {
  const control = useHomepageVideo();
  const copy = usePublicCopy();
  if (!control) return null;
  const label = copy(control.audible ? 'Mute sound' : 'Turn sound on');
  return <button
    type="button"
    className="ww-home-sound-toggle"
    aria-label={label}
    title={label}
    aria-pressed={control.audible}
    disabled={!control.canPlay}
    aria-busy={control.pending || undefined}
    onClick={() => { if (!control.pending) void control.toggleSound(); }}
  >
    <span className="ww-home-sound-toggle-ring" aria-hidden="true">
      {control.audible ? <Volume2 size={18} strokeWidth={1.8} /> : <VolumeX size={18} strokeWidth={1.8} />}
    </span>
  </button>;
};
