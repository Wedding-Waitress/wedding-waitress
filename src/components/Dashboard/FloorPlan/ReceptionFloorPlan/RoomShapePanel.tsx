/**
 * Phase 2C — Room shape panel. Rectangle (default) / L-shape / T-shape /
 * Custom polygon. Writes plan.room_polygon. When kind === 'rect', polygon is
 * cleared (null) so legacy behavior is preserved.
 */
import { useMemo, useState } from 'react';
import { Shapes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  lShapePolygon,
  tShapePolygon,
  ROOM_SHAPE_OPTIONS,
} from '@/lib/floorPlanShapes';
import type {
  ReceptionFloorPlan,
  RoomShapeKind,
} from '@/hooks/useReceptionFloorPlan';

interface Props {
  plan: ReceptionFloorPlan;
  onChange: (mutator: (p: ReceptionFloorPlan) => ReceptionFloorPlan) => void;
}

export const RoomShapePanel = ({ plan, onChange }: Props) => {
  const current: RoomShapeKind = (plan.room_polygon?.kind ?? 'rect') as RoomShapeKind;
  const w = plan.room_width_m;
  const h = plan.room_length_m;
  const { toast } = useToast();

  // L-shape params (notch from bottom-right)
  const [notchW, setNotchW] = useState<number>(Math.min(3, w / 2));
  const [notchH, setNotchH] = useState<number>(Math.min(3, h / 2));
  // T-shape params
  const [topBarH, setTopBarH] = useState<number>(Math.min(4, h / 2));
  const [stemW, setStemW] = useState<number>(Math.min(4, w / 2));
  // Custom polygon JSON
  const initialCustom = useMemo(
    () =>
      JSON.stringify(
        plan.room_polygon?.kind === 'custom'
          ? plan.room_polygon.points
          : [
              { x: 0, y: 0 },
              { x: w, y: 0 },
              { x: w, y: h },
              { x: 0, y: h },
            ],
        null,
        0
      ),
    [plan.room_polygon, w, h]
  );
  const [customJson, setCustomJson] = useState<string>(initialCustom);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const apply = (kind: RoomShapeKind) => {
    if (kind === 'rect') {
      onChange((p) => ({ ...p, room_polygon: null }));
      toast({ title: 'Room shape set to Rectangle' });
      return;
    }
    if (kind === 'L') {
      const poly = lShapePolygon(
        w,
        h,
        Math.max(0.5, Math.min(w - 0.5, notchW)),
        Math.max(0.5, Math.min(h - 0.5, notchH))
      );
      onChange((p) => ({ ...p, room_polygon: poly }));
      toast({ title: 'Room shape set to L-shape' });
      return;
    }
    if (kind === 'T') {
      const poly = tShapePolygon(
        w,
        h,
        Math.max(0.5, Math.min(h - 0.5, topBarH)),
        Math.max(0.5, Math.min(w - 0.5, stemW))
      );
      onChange((p) => ({ ...p, room_polygon: poly }));
      toast({ title: 'Room shape set to T-shape' });
      return;
    }
    if (kind === 'custom') {
      try {
        const parsed = JSON.parse(customJson);
        if (
          !Array.isArray(parsed) ||
          parsed.length < 3 ||
          !parsed.every(
            (pt) => typeof pt?.x === 'number' && typeof pt?.y === 'number'
          )
        ) {
          throw new Error('Polygon must be an array of at least 3 {x,y} points.');
        }
        onChange((p) => ({
          ...p,
          room_polygon: { kind: 'custom', points: parsed },
        }));
        setJsonError(null);
        toast({ title: 'Custom polygon applied' });
      } catch (e) {
        setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
      }
    }
  };

  return (
    <div data-reception-panel="true" className="flex h-full min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 max-lg:p-4">
      <div className="flex items-center gap-2">
        <Shapes className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Room shape</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ROOM_SHAPE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            variant={current === opt.value ? 'default' : 'outline'}
            size="sm"
            className={`lv-premium-shade min-h-9 whitespace-normal max-lg:min-h-11 max-lg:text-base ${
              current === opt.value ? 'bg-[#967A59] hover:bg-[#7a6347] text-white' : ''
            }`}
            onClick={() => apply(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {current === 'L' && (
        <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
          <div className="space-y-1">
            <Label className="text-xs">Notch width (m)</Label>
            <Input
              type="number"
              min={0.5}
              max={w - 0.5}
              step={0.5}
              value={notchW}
              onChange={(e) => setNotchW(Number(e.target.value) || 0)}
              onBlur={() => apply('L')}
              className="h-9 max-lg:h-11 max-lg:text-base"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notch height (m)</Label>
            <Input
              type="number"
              min={0.5}
              max={h - 0.5}
              step={0.5}
              value={notchH}
              onChange={(e) => setNotchH(Number(e.target.value) || 0)}
              onBlur={() => apply('L')}
              className="h-9 max-lg:h-11 max-lg:text-base"
            />
          </div>
        </div>
      )}

      {current === 'T' && (
        <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
          <div className="space-y-1">
            <Label className="text-xs">Top bar height (m)</Label>
            <Input
              type="number"
              min={0.5}
              max={h - 0.5}
              step={0.5}
              value={topBarH}
              onChange={(e) => setTopBarH(Number(e.target.value) || 0)}
              onBlur={() => apply('T')}
              className="h-9 max-lg:h-11 max-lg:text-base"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Stem width (m)</Label>
            <Input
              type="number"
              min={0.5}
              max={w - 0.5}
              step={0.5}
              value={stemW}
              onChange={(e) => setStemW(Number(e.target.value) || 0)}
              onBlur={() => apply('T')}
              className="h-9 max-lg:h-11 max-lg:text-base"
            />
          </div>
        </div>
      )}

      {current === 'custom' && (
        <div className="space-y-2">
          <Label className="text-xs">
            Polygon vertices (JSON array of {`{x, y}`} in meters)
          </Label>
          <textarea
            value={customJson}
            onChange={(e) => setCustomJson(e.target.value)}
            rows={4}
            className="w-full font-mono text-xs rounded-md border border-border bg-background p-2"
          />
          {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="lv-premium-shade h-9 max-lg:h-11 max-lg:w-full max-lg:text-base"
            onClick={() => apply('custom')}
          >
            Apply polygon
          </Button>
        </div>
      )}

      <p className="mt-auto text-xs text-muted-foreground">
        Non-rectangular rooms clip the grid, background, and PDF export to your room outline.
        Tables and fixtures can still be placed anywhere on the canvas.
      </p>
    </div>
  );
};
