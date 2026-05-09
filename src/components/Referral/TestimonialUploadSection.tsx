import * as React from 'react';
import { UploadCloud, Video, CheckCircle2, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useTestimonialUpload, TestimonialSubmissionRow } from '@/hooks/useTestimonialUpload';

interface Props { open: boolean; }

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'Pending review',
  approved: 'Approved',
  rejected: 'Not selected',
};

const STATUS_COLOR: Record<string, string> = {
  pending_review: '#967A59',
  approved: '#2F7D5B',
  rejected: '#8A6A6A',
};

const formatDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ''; }
};

const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

export const TestimonialUploadSection: React.FC<Props> = ({ open }) => {
  const { submit, uploading, progress, error, recent } = useTestimonialUpload(open);
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [eventName, setEventName] = React.useState('');
  const [caption, setCaption] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [justSubmitted, setJustSubmitted] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = () => {
    setFile(null); setEventName(''); setCaption(''); setConsent(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onPick = (f: File | null) => {
    setJustSubmitted(false);
    setFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onPick(f);
  };

  const onSubmit = async () => {
    if (!file || !consent) return;
    const ok = await submit({ file, caption, eventName, consentApproved: consent });
    if (ok) {
      toast.success('Thank you — your testimonial is pending review.');
      setJustSubmitted(true);
      reset();
    } else if (error) {
      toast.error(error);
    }
  };

  const canSubmit = !!file && consent && !uploading;

  return (
    <div className="mt-4 rounded-xl border border-[#E8E1D6] p-4" style={{ backgroundColor: '#FBF7F1' }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Sparkles className="h-4 w-4" style={{ color: '#967A59' }} />
        <span className="text-sm font-medium" style={{ color: '#1D1D1F' }}>
          Share Your Wedding Waitress Experience
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: '#6E6E73' }}>
        Submit a short testimonial video and earn Wedding Waitress Credits.
      </p>

      {/* Drop zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className="block cursor-pointer rounded-xl border-2 border-dashed transition-colors p-5 text-center"
        style={{
          borderColor: dragOver ? '#967A59' : '#E8E1D6',
          backgroundColor: dragOver ? '#F5EFE6' : 'rgba(255,255,255,0.6)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] || null)}
        />
        {!file ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: '#F5EFE6' }}>
              <UploadCloud className="h-5 w-5" style={{ color: '#967A59' }} />
            </span>
            <div className="text-sm font-medium" style={{ color: '#1D1D1F' }}>
              Drag &amp; drop your video here
            </div>
            <div className="text-xs" style={{ color: '#6E6E73' }}>
              or tap to choose a file from your device
            </div>
            <div className="text-[11px] mt-1" style={{ color: '#6E6E73' }}>
              MP4 · MOV · WEBM · up to 120 seconds
            </div>
            <div className="text-xs mt-1 text-center" style={{ color: '#6E6E73' }}>
              Best results: record in good lighting and speak naturally about your Wedding Waitress experience.
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-left">
            {previewUrl && (
              <video
                src={previewUrl}
                className="h-16 w-24 rounded-md object-cover bg-black/5 flex-shrink-0"
                muted
                playsInline
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-medium truncate" style={{ color: '#1D1D1F' }}>
                <Video className="h-4 w-4 flex-shrink-0" style={{ color: '#967A59' }} />
                <span className="truncate">{file.name}</span>
              </div>
              <div className="text-[11px]" style={{ color: '#6E6E73' }}>{formatBytes(file.size)}</div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); reset(); }}
              className="lv-premium-shade inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E8E1D6] bg-white"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" style={{ color: '#6E6E73' }} />
            </button>
          </div>
        )}
      </label>

      {/* Optional fields */}
      <div className="mt-3 grid gap-2">
        <Input
          value={eventName}
          onChange={(e) => setEventName(e.target.value.slice(0, 120))}
          placeholder="Wedding / event name (optional)"
          className="text-sm"
        />
        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 280))}
          placeholder="A short message about your experience (optional)"
          className="text-sm min-h-[72px]"
        />
      </div>

      {/* Consent */}
      <label className="mt-3 flex items-start gap-2 cursor-pointer">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          className="mt-0.5"
        />
        <span className="text-xs leading-relaxed" style={{ color: '#1D1D1F' }}>
          I give Wedding Waitress permission to use this testimonial video for marketing,
          advertising, website, and social media purposes.
        </span>
      </label>

      {/* Reward note */}
      <p className="mt-2 text-[11px]" style={{ color: '#6E6E73' }}>
        Approved testimonial videos may receive Wedding Waitress Credits.
      </p>

      {/* Progress */}
      {uploading && (
        <div className="mt-3 h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: '#EEE6D8' }}>
          <div
            className="h-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: '#967A59' }}
          />
        </div>
      )}

      {/* Submit */}
      <div className="mt-3 flex justify-end">
        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="lv-premium-shade gap-1.5"
          style={{ backgroundColor: canSubmit ? '#967A59' : '#C9BBA6', color: 'white' }}
        >
          {uploading ? 'Uploading…' : 'Submit testimonial'}
        </Button>
      </div>

      {/* Just-submitted confirmation */}
      {justSubmitted && (
        <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: '#2F7D5B' }}>
          <CheckCircle2 className="h-4 w-4" />
          Thank you — your testimonial is pending review.
        </div>
      )}

      {/* Recent submissions */}
      {recent.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-medium mb-1.5" style={{ color: '#1D1D1F' }}>Your recent submissions</div>
          <ul className="space-y-1.5">
            {recent.map((r: TestimonialSubmissionRow) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#E8E1D6] bg-white/70 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-xs truncate" style={{ color: '#1D1D1F' }}>
                    {r.event_name || r.caption || 'Testimonial'}
                  </div>
                  <div className="text-[10px]" style={{ color: '#6E6E73' }}>{formatDate(r.created_at)}</div>
                </div>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{ color: STATUS_COLOR[r.status], backgroundColor: '#FBF7F1', border: `1px solid ${STATUS_COLOR[r.status]}33` }}
                >
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TestimonialUploadSection;
