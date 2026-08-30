/** Public read-only view powered by the same authoritative Reception A4 renderer. */
import { useCallback, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDown, ClipboardList, FileDown, LayoutGrid, Loader2, StickyNote } from 'lucide-react';

import { ReceptionFloorPlanCanvas } from '@/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanCanvas';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import { useReceptionFloorPlanShare } from '@/hooks/useReceptionFloorPlanShare';
import { useToast } from '@/hooks/use-toast';
import {
  exportReceptionPreviewToPdf,
  type ReceptionPdfPageSize,
} from '@/lib/receptionFloorPlanPdfExporter';
import styles from './ReceptionFloorPlanShareView.module.css';

export const ReceptionFloorPlanShareView = () => {
  const { token } = useParams<{ token: string }>();
  const { data, backgroundUrl, loading, error } = useReceptionFloorPlanShare(token);
  const { toast } = useToast();
  const [exporting, setExporting] = useState<ReceptionPdfPageSize | null>(null);
  const receptionA4Ref = useRef<HTMLDivElement>(null);
  const generatedAt = useRef(new Date());
  const preserveReadOnlyPlan = useCallback(
    (_mutator: (plan: ReceptionFloorPlan) => ReceptionFloorPlan) => undefined,
    [],
  );

  const handleExport = async (size: ReceptionPdfPageSize) => {
    if (!data || !receptionA4Ref.current) return;
    setExporting(size);
    try {
      await exportReceptionPreviewToPdf({
        pageElement: receptionA4Ref.current,
        eventName: data.event.name,
        eventDate: data.event.date,
      });
      toast({ title: 'Floor plan exported', description: 'A4 PDF downloaded.' });
    } catch (exportError) {
      console.error(exportError);
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className={`${styles.page} ww-application-background flex min-h-screen items-center justify-center p-6 text-sm`}>
        <div className={`${styles.stateCard} flex items-center`} role="status" aria-live="polite">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading shared floor plan…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`${styles.page} ww-application-background flex min-h-screen items-center justify-center p-6 text-center`}>
        <div className={styles.stateCard}>
          <h1 className={`${styles.heading} text-xl font-semibold`}>Floor plan unavailable</h1>
          <p className={`${styles.muted} mt-2 max-w-md text-sm`}>
            {error ?? 'This share link is invalid or has been revoked.'}
          </p>
        </div>
      </div>
    );
  }

  const { plan, event, tables } = data;
  const couple = [event.partner1_name, event.partner2_name].filter(Boolean).join(' & ');
  const tableNotes = plan.table_positions
    .map((position) => {
      const table = tables.find((candidate) => candidate.id === position.table_id);
      const label = table?.name || (table ? `Table ${table.table_no}` : 'Table');
      const note = (position.note ?? '').trim();
      return note ? { label, note } : null;
    })
    .filter((note): note is { label: string; note: string } => Boolean(note));
  const vendorNotes = (plan.vendor_notes ?? '').trim();

  return (
    <div className={`${styles.page} ww-application-background`}>
      <header className={styles.header}>
        <div className={`${styles.headerInner} max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap`}>
          <div className="flex items-center gap-3 min-w-0">
            <LayoutGrid className={`${styles.icon} w-6 h-6 shrink-0`} />
            <div className="min-w-0">
              <h1 className={`${styles.heading} text-lg font-bold truncate`}>
                {event.name} · Reception Floor Plan
              </h1>
              <p className={`${styles.muted} text-xs truncate`}>
                {[couple, event.venue, event.date].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className={`${styles.primaryButton} h-9`}
                disabled={Boolean(exporting)}
              >
                {exporting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 mr-1.5" />
                )}
                Export PDF
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className={styles.portal} align="end">
              <DropdownMenuItem onClick={() => handleExport('a4')}>A4</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <ReceptionFloorPlanCanvas
          plan={plan}
          tables={tables}
          event={event}
          attendingCount={0}
          generatedAt={generatedAt.current}
          a4Ref={receptionA4Ref}
          backgroundUrl={backgroundUrl}
          onChange={preserveReadOnlyPlan}
          readOnly
        />

        {(tableNotes.length > 0 || vendorNotes) && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {tableNotes.length > 0 && (
              <div className={`${styles.card} rounded-lg p-4`}>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                  <StickyNote className="w-4 h-4 text-[#967A59]" /> Table notes
                </div>
                <ul className="space-y-1.5 text-sm">
                  {tableNotes.map((note) => (
                    <li key={note.label} className="text-foreground">
                      <span className="font-medium text-[#7a6347]">{note.label}:</span>{' '}
                      <span className="text-muted-foreground">{note.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {vendorNotes && (
              <div className={`${styles.card} rounded-lg p-4`}>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                  <ClipboardList className="w-4 h-4 text-[#967A59]" /> Vendor setup notes
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {vendorNotes}
                </p>
              </div>
            )}
          </div>
        )}
        <p className={`${styles.pageFooter} mt-6 text-center text-xs`}>
          Shared read-only view · Wedding Waitress
        </p>
      </main>
    </div>
  );
};

export default ReceptionFloorPlanShareView;
