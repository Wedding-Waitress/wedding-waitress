import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Download, Building2, UploadCloud, Ruler, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useReceptionTables } from '@/hooks/useReceptionTables';
import { useReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import { useAttendingGuestCount } from '@/hooks/useAttendingGuestCount';
import type { Event } from '@/hooks/useEvents';
import { ReceptionFloorPlanCanvas } from './ReceptionFloorPlanCanvas';
import { ReceptionCapacityBanner } from './ReceptionCapacityBanner';
import { ResetLayoutDialog } from './ResetLayoutDialog';
import { VenueBackgroundPanel } from './VenueBackgroundPanel';
import {
  exportReceptionPreviewToPdf,
  type ReceptionPdfPageSize,
} from '@/lib/receptionFloorPlanPdfExporter';
import { BackgroundCalibrationOverlay } from './BackgroundCalibrationOverlay';
import { RoomShapePanel } from './RoomShapePanel';
import { ShareLinkPanel } from './ShareLinkPanel';
import { ChooseVenueDialog } from './ChooseVenueDialog';
import { SubmitTemplateDialog } from './SubmitTemplateDialog';
import { SmartIntelligencePanel } from './SmartIntelligencePanel';
import { AutoLayoutPanel } from './AutoLayoutPanel';
import { VendorNotesPanel } from './VendorNotesPanel';
import { TableNotePanel } from './TableNotePanel';
import styles from './ReceptionFloorPlanTheme.module.css';
import headerStyles from '../FloorPlanPage.module.css';
import { reconcileReceptionFloorPlan } from '@/lib/receptionFloorPlanSync';


interface ReceptionFloorPlanPageProps {
  selectedEventId: string;
  selectedEvent: Event;
  headerControlsContainer: HTMLDivElement | null;
}

/**
 * Phase 1A — Step 5
 * Room canvas + synced tables + fixtures + capacity banner.
 */
export const ReceptionFloorPlanPage = ({
  selectedEventId,
  selectedEvent,
  headerControlsContainer,
}: ReceptionFloorPlanPageProps) => {
  const { tables, loading: tablesLoading, ready: tablesReady } = useReceptionTables(selectedEventId);
  const {
    plan,
    loading: planLoading,
    update,
    backgroundUrl,
    uploadBackground,
    removeBackground,
    uploadingBackground,
    generateShareToken,
    revokeShareToken,
  } = useReceptionFloorPlan(selectedEventId);
  const { count: attendingCount } = useAttendingGuestCount(selectedEventId);
  const { toast } = useToast();
  const [resetOpen, setResetOpen] = useState(false);
  const [exporting, setExporting] = useState<ReceptionPdfPageSize | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [chooseVenueOpen, setChooseVenueOpen] = useState(false);
  const [submitTemplateOpen, setSubmitTemplateOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const receptionA4Ref = useRef<HTMLDivElement>(null);
  const [generatedAt] = useState(() => new Date());

  const loading = tablesLoading || planLoading || !plan;

  useEffect(() => {
    if (!plan || plan.event_id !== selectedEventId || tablesLoading || !tablesReady) return;
    const reconciled = reconcileReceptionFloorPlan(plan, tables);
    if (reconciled !== plan) update(() => reconciled);
  }, [plan, selectedEventId, tables, tablesLoading, tablesReady, update]);


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
    if (!plan || !receptionA4Ref.current) return;
    setExporting(size);
    try {
      await exportReceptionPreviewToPdf({
        pageElement: receptionA4Ref.current,
        eventName: selectedEvent.name,
        eventDate: selectedEvent.date,
      });
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

  const headerControls = plan ? (
    <div
        className={`${headerStyles.exportControls} flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end`}
        data-floor-plan-export-controls="true"
        data-reception-export-controls="true"
      >
        <p className={`${headerStyles.featureHeading} text-sm font-bold inline-flex items-center gap-1.5 whitespace-nowrap`}>
          <Printer className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <span>Export Controls</span>
        </p>
        <span id="reception-floor-plan-export-description" className="sr-only">
          Download your reception floor plan PDF.
        </span>
        <div className="flex w-full items-center justify-center sm:w-auto">
          <button
            type="button"
            onClick={() => handleExport('a4')}
            disabled={!!exporting}
            aria-label="Download reception floor plan PDF"
            aria-describedby="reception-floor-plan-export-description"
            className={`${headerStyles.exportButton} inline-flex h-7 flex-1 shrink-0 items-center justify-center gap-1.5 rounded-full border-2 border-green-500 bg-background px-2.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:flex-none`}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Download className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
            )}
            {exporting ? 'Exporting...' : 'Download PDF'}
          </button>
        </div>
    </div>
  ) : null;

  return (
    <Card className={`${styles.masterCard} border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]`} data-reception-master-card="true">
      <CardContent className={`${styles.masterContent} space-y-4 max-lg:px-4`}>
        {headerControlsContainer && headerControls
          ? createPortal(headerControls, headerControlsContainer)
          : null}

        {loading ? (
          <div className={`${headerStyles.interfaceText} flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center`}>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading reception floor plan…
          </div>
        ) : (
          <>
            <section className={styles.setupMaster} data-reception-setup-master="true" data-reception-panel="true">
              <h2 className={styles.setupTitle}>Reception Setup &amp; Status</h2>
              <div className={styles.setupGrid} data-reception-setup-grid="true">
                <section className={styles.setupCard} data-reception-setup-card="venue-templates" data-reception-panel="true">
                  <div className={styles.setupCardHeading}>
                    <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3>Venue Templates</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Start from an approved venue, share your own, or browse the public directory.
                  </p>
                  <div className={styles.setupActions}>
                    <Button size="sm" variant="outline" className="lv-premium-shade h-9" onClick={() => setChooseVenueOpen(true)} title="Load an approved venue layout into this floor plan">
                      <Building2 className="mr-1.5 h-3.5 w-3.5" /> Choose venue
                    </Button>
                    <Button size="sm" variant="outline" className="lv-premium-shade h-9" onClick={() => setSubmitTemplateOpen(true)} title="Submit your current layout to the public venue directory">
                      <UploadCloud className="mr-1.5 h-3.5 w-3.5" /> Submit as template
                    </Button>
                    <a href="/venues" target="_blank" rel="noopener noreferrer" className="text-xs underline text-primary hover:text-primary/80">
                      Browse Public Directory →
                    </a>
                  </div>
                </section>

                <section className={styles.setupCard} data-reception-setup-card="room-dimensions" data-reception-panel="true">
                  <div className={styles.setupCardHeading}>
                    <Ruler className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3>Room Dimensions</h3>
                  </div>
                  <div className={styles.dimensionInputs}>
                    <div className="space-y-1">
                      <Label htmlFor="room-width" className="text-xs">Room width (m)</Label>
                      <Input id="room-width" type="number" min={2} max={50} step={0.5} value={plan.room_width_m} onChange={(e) => update((p) => ({ ...p, room_width_m: Math.max(2, Math.min(50, Number(e.target.value) || p.room_width_m)) }))} className="h-9 w-full" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="room-length" className="text-xs">Room length (m)</Label>
                      <Input id="room-length" type="number" min={2} max={50} step={0.5} value={plan.room_length_m} onChange={(e) => update((p) => ({ ...p, room_length_m: Math.max(2, Math.min(50, Number(e.target.value) || p.room_length_m)) }))} className="h-9 w-full" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="grid-size" className="text-xs">Grid (cm)</Label>
                      <Input id="grid-size" type="number" min={25} max={200} step={25} value={plan.grid_size_cm} onChange={(e) => update((p) => ({ ...p, grid_size_cm: Math.max(25, Math.min(200, Number(e.target.value) || p.grid_size_cm)) }))} className="h-9 w-full" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Drag tables from Tables to Place into the room. Click a table to rotate, lock, or remove it. Chairs render automatically from each table&apos;s seat count.
                  </p>
                </section>

                <section className={styles.setupCard} data-reception-setup-card="seating-status" data-reception-panel="true">
                  <div className={styles.setupCardHeading}>
                    <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3>Seating Status</h3>
                  </div>
                  <ReceptionCapacityBanner plan={plan} tables={tables} attendingCount={attendingCount} compact />
                </section>

                <SmartIntelligencePanel plan={plan} tables={tables} attendingCount={attendingCount} summaryClassName={styles.setupCard} detailsClassName={styles.smartDetails} />
              </div>
            </section>

            {/* Empty-state hint when no tables exist yet */}
            {tables.length === 0 && (
              <div data-reception-panel="true" className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-foreground/80">
                <strong className="text-primary">No tables yet.</strong> Add tables in the
                <span className="italic"> Tables</span> tab first — they'll appear here automatically
                so you can drag them into the room.
              </div>
            )}

            <div className={styles.managementGrid} data-reception-management-grid="true">
              <VenueBackgroundPanel
                plan={plan}
                uploading={uploadingBackground}
                onUpload={uploadBackground}
                onRemove={removeBackground}
                onChange={update}
                onCalibrate={
                  plan.background.path && backgroundUrl
                    ? () => setCalibrating(true)
                    : undefined
                }
              />

              <AutoLayoutPanel plan={plan} tables={tables} onApply={update} />

              <RoomShapePanel plan={plan} onChange={update} />

              <ShareLinkPanel
                plan={plan}
                onGenerate={generateShareToken}
                onRevoke={revokeShareToken}
                onApprovalChange={update}
              />
            </div>

            <TableNotePanel
              plan={plan}
              tables={tables}
              selectedTableId={selectedTableId}
              onClose={() => setSelectedTableId(null)}
              onChange={update}
            />

            <ReceptionFloorPlanCanvas
              plan={plan}
              tables={tables}
              event={selectedEvent}
              attendingCount={attendingCount}
              generatedAt={generatedAt}
              a4Ref={receptionA4Ref}
              backgroundUrl={backgroundUrl}
              onChange={update}
              onSelectedTableChange={setSelectedTableId}
              onResetRequest={() => setResetOpen(true)}
              resetDisabled={plan.table_positions.length === 0 && plan.fixtures.length === 0}
            />

            <VendorNotesPanel plan={plan} onChange={update} />

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

        {plan && calibrating && backgroundUrl && (
          <BackgroundCalibrationOverlay
            plan={plan}
            backgroundUrl={backgroundUrl}
            onClose={() => setCalibrating(false)}
            onApply={update}
          />
        )}

        {plan && (
          <ChooseVenueDialog
            open={chooseVenueOpen}
            onOpenChange={setChooseVenueOpen}
            plan={plan}
            onApply={update}
          />
        )}

        {plan && (
          <SubmitTemplateDialog
            open={submitTemplateOpen}
            onOpenChange={setSubmitTemplateOpen}
            plan={plan}
            backgroundUrl={backgroundUrl}
          />
        )}
      </CardContent>
    </Card>
  );
};
