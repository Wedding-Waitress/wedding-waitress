import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Download, ExternalLink, Loader2, Plus, QrCode, RotateCcw, Share2, Trash2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import type { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import type { PlaceCardPhotoVideoQr } from '@/hooks/usePlaceCardPhotoVideoQr';
import { useNavigate } from 'react-router-dom';

interface Props {
  eventName: string;
  qr: PlaceCardPhotoVideoQr | null;
  loading: boolean;
  error: string | null;
  settings: PlaceCardSettings;
  onSettingsChange: (settings: Partial<PlaceCardSettings>) => Promise<boolean>;
}

const DEFAULT_QR = { photo_video_qr_x: 50, photo_video_qr_y: 50, photo_video_qr_size: 22 };

export const PlaceCardPhotoVideoQrPanel: React.FC<Props> = ({ eventName, qr, loading, error, settings, onSettingsChange }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const enabled = Boolean(settings.photo_video_qr_enabled && qr);
  const x = Number(settings.photo_video_qr_x ?? DEFAULT_QR.photo_video_qr_x);
  const y = Number(settings.photo_video_qr_y ?? DEFAULT_QR.photo_video_qr_y);
  const size = Number(settings.photo_video_qr_size ?? DEFAULT_QR.photo_video_qr_size);
  const verticalHalf = size * 105 / 99;

  const savePosition = (updates: Partial<PlaceCardSettings>) => onSettingsChange(updates);
  const copy = async () => {
    if (!qr) return;
    await navigator.clipboard.writeText(qr.url);
    toast({ title: 'Public sharing link copied' });
  };
  const download = () => {
    if (!qr) return;
    const anchor = document.createElement('a');
    anchor.href = qr.dataUrl;
    anchor.download = `${eventName || 'event'}-photo-video-sharing-qr.png`.replace(/[^a-z0-9_.-]+/gi, '-');
    anchor.click();
  };
  const share = async () => {
    if (!qr) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${eventName} Photo & Video Sharing`, text: 'Share photos, videos and messages from our event.', url: qr.url });
        return;
      } catch (reason: any) {
        if (reason?.name === 'AbortError') return;
      }
    }
    await copy();
    toast({ title: 'Sharing link copied', description: 'Paste it into any app to share.' });
  };

  if (loading) return <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-2">Loading sharing setup…</span></div>;

  if (!qr) {
    return (
      <div className="space-y-4 rounded-xl border border-primary p-5 text-center">
        <TriangleAlert className="mx-auto h-8 w-8" aria-hidden="true" />
        <h3 className="text-lg font-semibold">Photo &amp; Video Sharing is not set up</h3>
        <p className="text-sm text-muted-foreground">{error || 'Set up Photo & Video Sharing for this event first. The same permanent public link will then be available here.'}</p>
        <Button type="button" variant="outline" className="w-full rounded-full" onClick={() => navigate('/dashboard/photo-video-gallery/photo-video-sharing')}>
          <ExternalLink className="mr-2 h-4 w-4" /> Go to Photo &amp; Video Sharing setup
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary p-4 space-y-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold"><QrCode className="h-5 w-5" />Photo &amp; Video Sharing QR Code</h3>
        <p className="text-sm text-muted-foreground">Add your event’s QR code to the back of each name place card so guests can scan it to upload photos and videos, view the shared gallery, leave a digital guestbook message and use the digital photo booth.</p>
        <div className="grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:items-start">
          <div className="rounded-lg p-2" style={{ background: '#ffffff' }}><img src={qr.dataUrl} alt="Photo & Video Sharing QR code preview" className="h-auto w-full" /></div>
          <div className="min-w-0 space-y-3">
            <div><Label>Selected event</Label><p className="mt-1 font-semibold text-foreground">{eventName}</p></div>
            <div><Label htmlFor="place-card-sharing-url">Public sharing URL</Label><Input id="place-card-sharing-url" readOnly value={qr.url} className="mt-1" /></div>
            <p className={qr.acceptingUploads ? 'text-sm text-green-700' : 'text-sm text-amber-800'}>{qr.acceptingUploads ? 'Guest uploads are currently accepting submissions.' : 'Guest uploads are currently switched off. The QR remains linked to this event.'}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">This is the exact same permanent QR code and public link used by Photo &amp; Video Sharing. No new token or guest page is created.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Button type="button" variant="outline" onClick={copy}><Copy className="mr-1.5 h-4 w-4" />Copy</Button>
          <Button type="button" variant="outline" onClick={() => window.open(qr.url, '_blank', 'noopener,noreferrer')}><ExternalLink className="mr-1.5 h-4 w-4" />Open</Button>
          <Button type="button" variant="outline" onClick={download}><Download className="mr-1.5 h-4 w-4" />PNG</Button>
          <Button type="button" variant="outline" onClick={share}><Share2 className="mr-1.5 h-4 w-4" />Share</Button>
          {enabled ? (
            <Button type="button" variant="destructive" onClick={() => savePosition({ photo_video_qr_enabled: false })}><Trash2 className="mr-1.5 h-4 w-4" />Remove</Button>
          ) : (
            <Button type="button" variant="success" onClick={() => savePosition({ photo_video_qr_enabled: true, ...DEFAULT_QR })}><Plus className="mr-1.5 h-4 w-4" />Add to cards</Button>
          )}
        </div>
      </div>

      {enabled && (
        <div className="rounded-xl border border-primary p-4 space-y-4">
          <div><h4 className="font-semibold">Placement &amp; size</h4><p className="text-sm text-muted-foreground">Drag or resize the QR on the first Master Card, or use these touch-friendly controls. Changes sync to every card.</p></div>
          <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
            <span /><Button type="button" variant="outline" aria-label="Move QR up" onClick={() => savePosition({ photo_video_qr_y: Math.max(verticalHalf, y - 2) })}><ArrowUp className="h-4 w-4" /></Button><span />
            <Button type="button" variant="outline" aria-label="Move QR left" onClick={() => savePosition({ photo_video_qr_x: Math.max(size / 2, x - 2) })}><ArrowLeft className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" aria-label="Reset QR placement" onClick={() => savePosition(DEFAULT_QR)}><RotateCcw className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" aria-label="Move QR right" onClick={() => savePosition({ photo_video_qr_x: Math.min(100 - size / 2, x + 2) })}><ArrowRight className="h-4 w-4" /></Button>
            <span /><Button type="button" variant="outline" aria-label="Move QR down" onClick={() => savePosition({ photo_video_qr_y: Math.min(100 - verticalHalf, y + 2) })}><ArrowDown className="h-4 w-4" /></Button><span />
          </div>
          <div className="space-y-2"><Label>QR size: {Math.round(size)}%</Label><Slider value={[size]} min={12} max={36} step={1} onValueChange={([next]) => { const nextVerticalHalf = next * 105 / 99; return savePosition({ photo_video_qr_size: next, photo_video_qr_x: Math.max(next / 2, Math.min(100 - next / 2, x)), photo_video_qr_y: Math.max(nextVerticalHalf, Math.min(100 - nextVerticalHalf, y)) }); }} /></div>
          <Button type="button" variant="outline" className="w-full rounded-full" onClick={() => savePosition(DEFAULT_QR)}><RotateCcw className="mr-2 h-4 w-4" />Reset to Default</Button>
        </div>
      )}
    </div>
  );
};
