import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Lock,
  Unlock,
  Loader2,
  Maximize2,
  Ruler,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';

interface Props {
  plan: ReceptionFloorPlan;
  uploading: boolean;
  onUpload: (
    file: File
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onRemove: () => void;
  onChange: (mutator: (p: ReceptionFloorPlan) => ReceptionFloorPlan) => void;
  onCalibrate?: () => void;
}

export const VenueBackgroundPanel = ({
  plan,
  uploading,
  onUpload,
  onRemove,
  onChange,
  onCalibrate,
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const bg = plan.background;
  const hasBackground = !!bg.path;

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    const res = await onUpload(file);
    if (res.ok === false) {
      toast({ title: 'Upload failed', description: res.error, variant: 'destructive' });
    } else {
      toast({
        title: 'Venue background uploaded',
        description: 'Drag, resize, rotate, or adjust opacity in the room canvas.',
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const setBg = (partial: Partial<typeof bg>) =>
    onChange((p) => ({ ...p, background: { ...p.background, ...partial } }));

  const resetToRoom = () =>
    setBg({
      x: 0,
      y: 0,
      width: plan.room_width_m,
      height: plan.room_length_m,
      rotation: 0,
    });

  return (
    <div data-reception-panel="true" className="flex h-full min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 max-lg:p-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Venue background</h3>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="lv-premium-shade h-auto min-h-9 w-full whitespace-normal max-lg:min-h-11 max-lg:text-base"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5 mr-1.5" />
          )}
          {uploading
            ? 'Uploading…'
            : hasBackground
              ? 'Replace background'
              : 'Upload background (PNG / JPG / PDF)'}
        </Button>

        {hasBackground && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lv-premium-shade min-h-9 w-full max-lg:min-h-11 max-lg:text-base"
              onClick={onCalibrate}
              disabled={!onCalibrate || bg.locked}
            >
              <Ruler className="w-3.5 h-3.5 mr-1.5" />
              Calibrate scale
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lv-premium-shade min-h-9 w-full max-lg:min-h-11 max-lg:text-base"
              onClick={resetToRoom}
              disabled={bg.locked}
            >
              <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
              Reset to room
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lv-premium-shade min-h-9 w-full max-lg:min-h-11 max-lg:text-base"
              onClick={() => setBg({ locked: !bg.locked })}
            >
              {bg.locked ? (
                <Lock className="w-3.5 h-3.5 mr-1.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5 mr-1.5" />
              )}
              {bg.locked ? 'Unlock' : 'Lock'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lv-premium-shade min-h-9 w-full text-destructive hover:text-destructive max-lg:min-h-11 max-lg:text-base"
              onClick={onRemove}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Remove
            </Button>
          </>
        )}
      </div>

      {hasBackground && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <Label className="text-xs flex items-center justify-between">
              <span>Opacity</span>
              <span className="text-muted-foreground">{Math.round(bg.opacity * 100)}%</span>
            </Label>
            <Slider
              value={[bg.opacity]}
              min={0.1}
              max={1}
              step={0.05}
              onValueChange={(v) => setBg({ opacity: v[0] })}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 max-lg:py-3">
            <Label className="text-xs">Show background</Label>
            <Switch
              checked={bg.visible}
              onCheckedChange={(v) => setBg({ visible: v })}
            />
          </div>
        </div>
      )}

      <p className="mt-auto text-xs text-muted-foreground">
        Upload your venue floor plan. PDFs use page 1 only. The image sits behind tables and
        fixtures and can be moved, resized, rotated, and faded. Files are private to your account.
      </p>
    </div>
  );
};
