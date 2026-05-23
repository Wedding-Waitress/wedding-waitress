import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutGrid, Loader2, CheckCircle2, RotateCcw, FileDown, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useReceptionTables } from '@/hooks/useReceptionTables';
import { useReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import { useAttendingGuestCount } from '@/hooks/useAttendingGuestCount';
import { ReceptionFloorPlanCanvas } from './ReceptionFloorPlanCanvas';
import { ReceptionCapacityBanner } from './ReceptionCapacityBanner';
import { ResetLayoutDialog } from './ResetLayoutDialog';
import { VenueBackgroundPanel } from './VenueBackgroundPanel';
import {
  generateReceptionFloorPlanPDF,
  type ReceptionPdfPageSize,
  type ReceptionPdfEvent,
} from '@/lib/receptionFloorPlanPdfExporter';
import { BackgroundCalibrationOverlay } from './BackgroundCalibrationOverlay';
import { RoomShapePanel } from './RoomShapePanel';
import { ShareLinkPanel } from './ShareLinkPanel';

interface ReceptionFloorPlanPageProps {
  selectedEventId: string;
}

/**
 * Phase 1A — Step 5
 * Room canvas + synced tables + fixtures + capacity banner.
 */
export const ReceptionFloorPlanPage = ({ selectedEventId }: ReceptionFloorPlanPageProps) => {
  const { tables, loading: tablesLoading } = useReceptionTables(selectedEventId);
  const {
    plan,
    loading: planLoading,
    saving,
    update,
    backgroundUrl,
    uploadBackground,
    removeBackground,
    uploadingBackground,
  } = useReceptionFloorPlan(selectedEventId);
  const { count: attendingCount } = useAttendingGuestCount(selectedEventId);
  const { toast } = useToast();
  const [resetOpen, setResetOpen] = useState(false);
  const [exporting, setExporting] = useState<ReceptionPdfPageSize | null>(null);

  const loading = tablesLoading || planLoading || !plan;

  const handleReset = (scope: 'tables' | 'fixtures' | 'all') => {
    update((p) => ({
      ...p,
      table_positions: scope === 'fixtures' ? p.table_positions : [],
      fixtures: scope === 'tables' ? p.fixtures : [],
    }));
    toast({
      title: 'Layout reset',
      description:
        scope === 'tables'
          ? 'All placed tables were returned to the unplaced tray.'
          : scope === 'fixtures'
          ? 'All fixtures were removed.'
          : 'The reception floor plan was fully cleared.',
    });
  };

  const handleExport = async (size: ReceptionPdfPageSize) => {
    if (!plan) return;
    setExporting(size);
    try {
      const { data: ev, error } = await supabase
        .from('events')
        .select('name, date, venue, partner1_name, partner2_name, start_time, finish_time')
        .eq('id', selectedEventId)
        .maybeSingle();
      if (error || !ev) throw error || new Error('Event not found');
      await generateReceptionFloorPlanPDF(
        plan,
        tables,
        ev as ReceptionPdfEvent,
        attendingCount,
        size
      );
      toast({
        title: 'Floor plan exported',
        description: `${size.toUpperCase()} PDF downloaded successfully.`,
      });
    } catch (err) {
      console.error('reception pdf export', err);
      toast({
        title: 'Export failed',
        description: 'Could not generate the PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
      <CardContent className="pt-6 space-y-4 max-lg:px-4">
        <div className="flex items-center justify-between gap-3 flex-wrap max-lg:flex-col max-lg:items-stretch">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Reception Floor Plan</h2>
          </div>
          {plan && (
            <div className="flex items-center gap-3 max-lg:flex-col max-lg:items-stretch max-lg:gap-2 max-lg:w-full">
              <div className="text-xs text-muted-foreground flex items-center gap-1 max-lg:justify-center">
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
              <div className="flex items-center gap-2 max-lg:w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="lv-premium-shade h-9 max-lg:h-11 max-lg:flex-1 max-lg:text-base"
                  onClick={() => setResetOpen(true)}
                  disabled={plan.table_positions.length === 0 && plan.fixtures.length === 0}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Reset layout
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="lv-premium-shade h-9 max-lg:h-11 max-lg:flex-1 max-lg:text-base bg-[#967A59] hover:bg-[#7a6347] text-white"
                      disabled={!!exporting}
                    >
                      {exporting ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      {exporting ? `Exporting ${exporting.toUpperCase()}…` : 'Export PDF'}
                      <ChevronDown className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('a4')}>
                      A4 (210 × 297mm)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('a3')}>
                      A3 (297 × 420mm)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('a2')}>
                      A2 (420 × 594mm)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
            <div className="flex flex-wrap items-end gap-4 max-lg:gap-3 rounded-lg border border-border bg-muted/20 p-3 max-lg:p-4">
              <div className="space-y-1 max-lg:w-full">
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
                  className="h-9 w-28 max-lg:h-11 max-lg:w-full max-lg:text-base"
                />
              </div>
              <div className="space-y-1 max-lg:w-full">
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
                  className="h-9 w-28 max-lg:h-11 max-lg:w-full max-lg:text-base"
                />
              </div>
              <div className="space-y-1 max-lg:w-full">
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
                  className="h-9 w-24 max-lg:h-11 max-lg:w-full max-lg:text-base"
                />
              </div>
              <p className="text-xs text-muted-foreground ml-auto max-w-xs max-lg:ml-0 max-lg:max-w-full">
                Drag tables from the left into the room. Click a table to rotate, lock, or remove it.
                Chairs render automatically from each table's seat count.
              </p>
            </div>


            <ReceptionCapacityBanner
              plan={plan}
              tables={tables}
              attendingCount={attendingCount}
            />

            <VenueBackgroundPanel
              plan={plan}
              uploading={uploadingBackground}
              onUpload={uploadBackground}
              onRemove={removeBackground}
              onChange={update}
            />

            <ReceptionFloorPlanCanvas
              plan={plan}
              tables={tables}
              backgroundUrl={backgroundUrl}
              onChange={update}
            />
          </>
        )}

        {plan && (
          <ResetLayoutDialog
            open={resetOpen}
            onOpenChange={setResetOpen}
            onConfirm={handleReset}
            tableCount={plan.table_positions.length}
            fixtureCount={plan.fixtures.length}
          />
        )}
      </CardContent>
    </Card>
  );
};
