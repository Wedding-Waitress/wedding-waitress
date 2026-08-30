/**
 * Phase 2A — Background calibration overlay.
 *
 * The user clicks two points on the uploaded venue background and types the
 * real-world distance between them. We rescale `background.width/height` so
 * that the two points end up that exact distance apart, keeping the midpoint
 * anchored so nothing drifts off the room.
 */
import { useState } from 'react';
import { X, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';

const PX_PER_M = 50;

interface Props {
  plan: ReceptionFloorPlan;
  backgroundUrl: string;
  onClose: () => void;
  onApply: (mutator: (p: ReceptionFloorPlan) => ReceptionFloorPlan) => void;
}

export const BackgroundCalibrationOverlay = ({
  plan,
  backgroundUrl,
  onClose,
  onApply,
}: Props) => {
  const bg = plan.background;
  const wPx = (bg.width ?? 0) * PX_PER_M;
  const hPx = (bg.height ?? 0) * PX_PER_M;
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [distance, setDistance] = useState<string>('1');
  const [error, setError] = useState<string | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (points.length >= 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / PX_PER_M; // in current meters
    const py = (e.clientY - rect.top) / PX_PER_M;
    setPoints([...points, { x: px, y: py }]);
  };

  const reset = () => {
    setPoints([]);
    setError(null);
  };

  const apply = () => {
    if (points.length !== 2) {
      setError('Click two points on the background first.');
      return;
    }
    const realDist = parseFloat(distance);
    if (!Number.isFinite(realDist) || realDist <= 0) {
      setError('Enter the real distance in meters (e.g. 0.9).');
      return;
    }
    const [a, b] = points;
    const currentDist = Math.hypot(b.x - a.x, b.y - a.y);
    if (currentDist < 0.01) {
      setError('Pick two points that are further apart.');
      return;
    }
    const scale = realDist / currentDist;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    // New background size
    const newW = (bg.width ?? 0) * scale;
    const newH = (bg.height ?? 0) * scale;
    // Keep midpoint stationary in room coordinates:
    // midpoint in room = bg.x + midX (relative to bg origin). After scaling,
    // the same image-relative point lives at midX*scale from new bg.x.
    const newX = bg.x + midX - midX * scale;
    const newY = bg.y + midY - midY * scale;
    onApply((p) => ({
      ...p,
      background: { ...p.background, width: newW, height: newH, x: newX, y: newY },
    }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 max-lg:p-2">
      <div className="reception-portal-surface bg-card rounded-xl shadow-xl border border-border max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border max-lg:px-3">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" /> Calibrate venue background
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded hover:bg-muted"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 max-lg:px-3 text-xs text-muted-foreground space-y-1">
          <p>
            1. Click <strong>two points</strong> on the background that are a known real distance
            apart (a door, a wall edge, a parking line).
          </p>
          <p>
            2. Enter that real distance in meters. We will resize the background so it matches the
            room scale.
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4 max-lg:p-2 bg-muted/30">
          <div className="mx-auto" style={{ width: wPx, height: hPx }}>
            <div
              className="relative cursor-crosshair select-none"
              style={{ width: wPx, height: hPx }}
              onClick={handleClick}
            >
              <img
                src={backgroundUrl}
                alt="Background to calibrate"
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
              {points.map((p, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: p.x * PX_PER_M - 8,
                    top: p.y * PX_PER_M - 8,
                  }}
                  className="w-4 h-4 rounded-full bg-primary border-2 border-white shadow"
                />
              ))}
              {points.length === 2 && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={wPx}
                  height={hPx}
                >
                  <line
                    x1={points[0].x * PX_PER_M}
                    y1={points[0].y * PX_PER_M}
                    x2={points[1].x * PX_PER_M}
                    y2={points[1].y * PX_PER_M}
                    stroke="#967A59"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 max-lg:px-3 border-t border-border space-y-3">
          <div className="flex items-end gap-3 flex-wrap max-lg:flex-col max-lg:items-stretch">
            <div className="space-y-1 max-lg:w-full">
              <Label className="text-xs">Real distance (meters)</Label>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="h-11 w-32 text-base max-lg:w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground max-lg:text-center">
              Points clicked: {points.length} / 2
            </p>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center gap-2 max-lg:flex-row">
            <Button
              type="button"
              onClick={apply}
              className="lv-premium-shade h-11 flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Apply calibration
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              className="lv-premium-shade h-11"
            >
              Reset points
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
