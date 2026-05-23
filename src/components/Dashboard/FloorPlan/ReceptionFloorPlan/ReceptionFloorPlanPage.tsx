import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LayoutGrid, Loader2, CheckCircle2 } from 'lucide-react';
import { useReceptionTables } from '@/hooks/useReceptionTables';
import { useReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import { ReceptionFloorPlanCanvas } from './ReceptionFloorPlanCanvas';

interface ReceptionFloorPlanPageProps {
  selectedEventId: string;
}

/**
 * Phase 1A — Step 3
 * Room canvas + drag/drop synced tables + rotate / lock / auto chairs.
 */
export const ReceptionFloorPlanPage = ({ selectedEventId }: ReceptionFloorPlanPageProps) => {
  const { tables, loading: tablesLoading } = useReceptionTables(selectedEventId);
  const { plan, loading: planLoading, saving, update } = useReceptionFloorPlan(selectedEventId);

  const loading = tablesLoading || planLoading || !plan;

  return (
    <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Reception Floor Plan</h2>
          </div>
          {plan && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Saved{' '}
                  {new Date(plan.last_saved_at).toLocaleTimeString()}
                </>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading reception floor plan…
          </div>
        ) : (
          <>
            {/* Room dimensions */}
            <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-muted/20 p-3">
              <div className="space-y-1">
                <Label htmlFor="room-width" className="text-xs">
                  Room width (m)
                </Label>
                <Input
                  id="room-width"
                  type="number"
                  min={2}
                  max={50}
                  step={0.5}
                  value={plan.room_width_m}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      room_width_m: Math.max(2, Math.min(50, Number(e.target.value) || p.room_width_m)),
                    }))
                  }
                  className="h-9 w-28"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="room-length" className="text-xs">
                  Room length (m)
                </Label>
                <Input
                  id="room-length"
                  type="number"
                  min={2}
                  max={50}
                  step={0.5}
                  value={plan.room_length_m}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      room_length_m: Math.max(2, Math.min(50, Number(e.target.value) || p.room_length_m)),
                    }))
                  }
                  className="h-9 w-28"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="grid-size" className="text-xs">
                  Grid (cm)
                </Label>
                <Input
                  id="grid-size"
                  type="number"
                  min={25}
                  max={200}
                  step={25}
                  value={plan.grid_size_cm}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      grid_size_cm: Math.max(25, Math.min(200, Number(e.target.value) || p.grid_size_cm)),
                    }))
                  }
                  className="h-9 w-24"
                />
              </div>
              <p className="text-xs text-muted-foreground ml-auto max-w-xs">
                Drag tables from the left into the room. Click a table to rotate, lock, or remove it.
                Chairs render automatically from each table's seat count.
              </p>
            </div>

            <ReceptionFloorPlanCanvas plan={plan} tables={tables} onChange={update} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
