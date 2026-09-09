import { Printer as ExportControlsPrinter } from 'lucide-react';
import {ReceptionDraftReview} from '../ReceptionDraftReview';
import {FloorPlanShareModal} from '../FloorPlanShareModal';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Download, Building2, UploadCloud, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useReceptionTables } from '@/hooks/useReceptionTables';
import { useReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import { useAttendingGuestCount } from '@/hooks/useAttendingGuestCount';
import type { Event } from '@/hooks/useEvents';
import { ReceptionFloorPlanCanvas } from './ReceptionFloorPlanCanvas';

import {useReceptionLayoutHistory,resetReceptionLayout} from '@/hooks/useReceptionLayoutHistory';
import {
  exportReceptionPreviewToPdf,
  type ReceptionPdfPageSize,
} from '@/lib/receptionFloorPlanPdfExporter';
import { BackgroundCalibrationOverlay } from './BackgroundCalibrationOverlay';
import { ChooseVenueDialog } from './ChooseVenueDialog';
import { SubmitTemplateDialog } from './SubmitTemplateDialog';
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
    saveError,
    loadError,
    flush, settle, reload,
    update: commit,
    backgroundUrl,
    uploadBackground,
    uploadingBackground,
  } = useReceptionFloorPlan(selectedEventId);
  const { count: attendingCount } = useAttendingGuestCount(selectedEventId);
  const { toast } = useToast();
  const {update,undo,canUndo} = useReceptionLayoutHistory(selectedEventId,commit,tables);
  const [exporting, setExporting] = useState<ReceptionPdfPageSize | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [shareOpen,setShareOpen]=useState(false);
  const [chooseVenueOpen, setChooseVenueOpen] = useState(false);
  const [submitTemplateOpen, setSubmitTemplateOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const receptionA4Ref = useRef<HTMLDivElement>(null);
  const [generatedAt] = useState(() => new Date());

  const loading = tablesLoading || planLoading || !plan;

  useEffect(() => {
    if (!plan || plan.event_id !== selectedEventId || tablesLoading || !tablesReady) return;
    commit(current => reconcileReceptionFloorPlan(current, tables));
  }, [plan, selectedEventId, tables, tablesLoading, tablesReady, commit]);


  useEffect(() => {
    const mark = () => receptionA4Ref.current?.closest('[data-reception-document-group]')?.setAttribute('data-reception-print-source', 'true');
    const clear = () => receptionA4Ref.current?.closest('[data-reception-document-group]')?.removeAttribute('data-reception-print-source');
    window.addEventListener('beforeprint', mark);
    window.addEventListener('afterprint', clear);
    return () => { window.removeEventListener('beforeprint', mark); window.removeEventListener('afterprint', clear); clear(); };
  }, []);

  const handleReset = () => {
    update(p => resetReceptionLayout(p,tables));
    setSelectedTableId(null);
    toast({title:'Layout reset',description:'Your default room and furniture layout has been restored. Use Undo to go back.'});
  };

  const handleExport = async (size: ReceptionPdfPageSize) => {
    if (!plan || !receptionA4Ref.current) return;
    setExporting(size);
    try {
      toast({ title: 'Generating PDF', description: 'Preparing your reception floor plan...' });
      await exportReceptionPreviewToPdf({
        pageElement: receptionA4Ref.current,
        eventName: selectedEvent.name,
        eventDate: selectedEvent.date,
      });
      toast({
        title: 'PDF Downloaded',
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
    <div data-export-controls-panel
        className={`${headerStyles.exportControls} flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end`}
        data-floor-plan-export-controls="true"
        data-reception-export-controls="true"
      >
        <div className={`${styles.setupCardHeading} whitespace-nowrap`}>

          <span data-export-controls-heading><ExportControlsPrinter size={16} strokeWidth={2} aria-hidden="true" />Export Controls</span>
        </div>
        <span id="reception-floor-plan-export-description" className="sr-only">
          Download your reception floor plan PDF.
        </span>
        <div className="flex w-full items-center justify-center gap-2 sm:w-auto">
          <button type="button" className={headerStyles.exportButton+" inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-xs"} onClick={()=>setShareOpen(true)}><Share2 className="w-4 h-4"/>Share</button>
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

        {saveError && <div role="alert" className="rounded-lg border border-red-600 p-3 text-sm">{saveError} <Button variant="outline" size="sm" onClick={() => void flush().catch(() => undefined)}>Retry save</Button></div>}
        <h2 className={styles.setupTitle}>Reception Setup &amp; Status</h2>
        {loadError ? <div role="alert" className="p-4">{loadError}</div> : loading ? (
          <div className={`${headerStyles.interfaceText} flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center`}>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading reception floor plan…
          </div>
        ) : (
          <>
            <section data-reception-setup-master="true">

              <div className={styles.setupGrid} data-reception-setup-grid="true">
                <section className={styles.setupCard} data-reception-setup-card="venue-templates" data-reception-panel="true">
                  <div className={styles.setupCardHeading}>
                    <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3>Venue Templates</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Look up shared venue templates from Australia and around the world, or add a venue template.
                  </p>
                  <div className={styles.setupActions}>
                    <Button size="sm" variant="outline" className="lv-premium-shade h-9" onClick={() => setChooseVenueOpen(true)} title="Browse the worldwide venue template library">
                      <Building2 className="mr-1.5 h-3.5 w-3.5" /> Look Up Venue Floor Plan Template
                    </Button>
                    <Button size="sm" variant="outline" className="lv-premium-shade h-9" onClick={() => setSubmitTemplateOpen(true)} title="Save your own venue floor plan template">
                      <UploadCloud className="mr-1.5 h-3.5 w-3.5" /> Submit Venue Template
                    </Button>

                  </div>
                </section>
                <VendorNotesPanel plan={plan} onChange={update} />



              </div>
            </section>

            <ReceptionDraftReview plan={plan} tables={tables} event={selectedEvent} backgroundUrl={backgroundUrl} settle={settle} reload={reload}/>
            {/* Empty-state hint when no tables exist yet */}
            {tables.length === 0 && (
              <div data-reception-panel="true" className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-foreground/80">
                <strong className="text-primary">No tables yet.</strong> Add tables in the
                <span className="italic"> Tables</span> tab first — they'll appear here automatically
                so you can drag them into the room.
              </div>
            )}

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
              onResetRequest={handleReset}
              onUndo={undo}
              undoDisabled={!canUndo}
              resetDisabled={!tablesReady || tablesLoading}
            />

            <TableNotePanel
              plan={plan}
              tables={tables}
              selectedTableId={selectedTableId}
              onClose={() => setSelectedTableId(null)}
              onChange={update}
            />



          </>
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
          <><FloorPlanShareModal open={shareOpen} onOpenChange={setShareOpen} eventId={selectedEventId} kind="reception"/>
        <ChooseVenueDialog
            open={chooseVenueOpen}
            onOpenChange={setChooseVenueOpen}
            plan={plan}
            onApply={update}
          /></>
        )}

        {plan && (
          <SubmitTemplateDialog
            uploading={uploadingBackground}
            onUpload={uploadBackground}
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
