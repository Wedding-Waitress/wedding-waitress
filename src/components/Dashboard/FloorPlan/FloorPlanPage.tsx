/**
 * ⚠️ WARNING: PRODUCTION LOCKED - DO NOT MODIFY ⚠️
 * 
 * This file is part of the Ceremony Floor Plan feature which has been
 * finalized and locked for production use as of 2025-12-21.
 * 
 * ANY MODIFICATIONS require explicit written approval from the project owner.
 * 
 * See CEREMONY_FLOOR_PLAN_SPECS.md for complete technical specifications.
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutGrid, CalendarDays, LayoutTemplate, HeartHandshake, PartyPopper, Printer, Download, LoaderCircle } from 'lucide-react';
import type { Event } from '@/hooks/useEvents';
import { useCeremonyFloorPlan } from '@/hooks/useCeremonyFloorPlan';
import { CeremonyFloorPlanA4Preview } from './CeremonyFloorPlan/CeremonyFloorPlanA4';
import { CeremonyFloorPlanSettings } from './CeremonyFloorPlan/CeremonyFloorPlanSettings';
import { ReceptionFloorPlanPage } from './ReceptionFloorPlan/ReceptionFloorPlanPage';
import { toast } from 'sonner';
import styles from './FloorPlanPage.module.css';
import receptionStyles from './ReceptionFloorPlan/ReceptionFloorPlanTheme.module.css';

interface FloorPlanPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  events: Event[];
  eventsLoading: boolean;
}

type FloorPlanType = 'ceremony' | 'reception';

export const FloorPlanPage = ({
  selectedEventId,
  onEventSelect,
  events,
  eventsLoading,
}: FloorPlanPageProps) => {
  const [floorPlanType, setFloorPlanType] = useState<FloorPlanType>('ceremony');
  const [isExporting, setIsExporting] = useState(false);
  const [receptionHeaderControlsContainer, setReceptionHeaderControlsContainer] = useState<HTMLDivElement | null>(null);
  const ceremonyA4Ref = useRef<HTMLDivElement>(null);
  const [generatedAt] = useState(() => new Date());


  const { 
    floorPlan, 
    loading: floorPlanLoading,
    initialLoadComplete,
    createFloorPlan, 
    updateFloorPlan,
    updateSeatAssignment,
    updateBridalPartyMember,
    updateBridalPartyRole,
  } = useCeremonyFloorPlan(selectedEventId);

  const selectedEvent = events.find(event => event.id === selectedEventId);

  // Create floor plan if it doesn't exist when ceremony type is selected
  // Only attempt after initial load confirms no plan exists
  useEffect(() => {
    if (selectedEventId && floorPlanType === 'ceremony' && !floorPlan && initialLoadComplete && !floorPlanLoading) {
      createFloorPlan();
    }
  }, [selectedEventId, floorPlanType, floorPlan, initialLoadComplete, floorPlanLoading, createFloorPlan]);

  useEffect(() => {
    if (floorPlanType !== 'ceremony') return;

    const markAuthoritativePrintSource = () => {
      const pageElement = ceremonyA4Ref.current;
      if (pageElement) pageElement.dataset.ceremonyPrintSource = 'true';
    };
    const clearAuthoritativePrintSource = () => {
      const pageElement = ceremonyA4Ref.current;
      if (pageElement) delete pageElement.dataset.ceremonyPrintSource;
    };

    window.addEventListener('beforeprint', markAuthoritativePrintSource);
    window.addEventListener('afterprint', clearAuthoritativePrintSource);
    return () => {
      window.removeEventListener('beforeprint', markAuthoritativePrintSource);
      window.removeEventListener('afterprint', clearAuthoritativePrintSource);
      clearAuthoritativePrintSource();
    };
  }, [floorPlanType]);

  // Desktop (≥1024px) remains pixel-identical (no transforms).
  const handleDownloadPdf = async () => {
    if (!selectedEvent || !floorPlan || !ceremonyA4Ref.current) return;

    setIsExporting(true);
    try {
      toast.info('Generating PDF...');
      const { exportCeremonyPreviewToPdf } = await import('@/lib/ceremonyFloorPlanPdfExporter');
      await exportCeremonyPreviewToPdf({
        pageElement: ceremonyA4Ref.current,
        eventName: selectedEvent.name,
        eventDate: selectedEvent.ceremony_date || selectedEvent.date,
      });
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const isDataReady = selectedEvent && floorPlan && !floorPlanLoading;
  const totalAttending = floorPlan
    ? 3 + (floorPlan.bridal_party_count_left || 0) + (floorPlan.bridal_party_count_right || 0) + (floorPlan.total_rows * floorPlan.chairs_per_row * 2)
    : 0;

  return (
    <div
      className={`space-y-6${floorPlanType === 'ceremony' ? ` ${styles.ceremonyPage}` : ` ${receptionStyles.receptionPage}`}`}
      data-floor-plan-page="true"
      data-floor-plan-mode={floorPlanType}
    >
      {/* Header Card */}
      <Card className={`${floorPlanType === 'ceremony' ? styles.headerPanel : receptionStyles.headerPanel} border border-primary p-0 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]`}>
        <CardContent className="p-4 sm:p-5 space-y-3">
          {/* Title and Description */}
          <div>
            <h1 className={`${styles.pageHeading} text-2xl font-bold text-foreground mb-1 flex items-center gap-2`}>
              <LayoutGrid className="w-6 h-6 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Floor Plan
            </h1>
            <p className={`${styles.pageDescription} text-sm sm:text-base text-muted-foreground`}>
              Design and visualize your ceremony or reception seating layout
            </p>
          </div>

          {/* Event, type, and export controls */}
          <div
            className={`grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:items-center xl:gap-5 ${
              floorPlanType === 'ceremony'
                ? 'xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_auto]'
                : 'xl:mx-auto xl:max-w-[1500px] xl:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.72fr)_auto_auto] xl:gap-6'
            }`}
            data-floor-plan-controls-row="true"
          >
            {/* Choose Event Section */}
            <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:gap-3">
              <label htmlFor="floor-plan-event" className={`${styles.interfaceLabel} text-sm font-medium text-foreground whitespace-nowrap inline-flex items-center gap-[7px]`}>
                <CalendarDays className="w-[17px] h-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                Choose Event:
              </label>
              <Select
                value={selectedEventId || 'no-event'} 
                onValueChange={(value) => {
                  if (value === 'no-event') return;
                  onEventSelect(value);
                }}
                disabled={eventsLoading}
              >
                <SelectTrigger id="floor-plan-event" className={`${styles.interfaceControl} ${floorPlanType === 'ceremony' ? styles.control : receptionStyles.control} w-full min-w-0 border-primary focus:ring-primary font-bold text-[#967A59] xl:flex-1`}>
                  <SelectValue placeholder="Choose Event" />
                </SelectTrigger>
                <SelectContent className={floorPlanType === 'ceremony' ? styles.portalSurface : receptionStyles.portalSurface}>
                  {events.length > 0 ? (
                    events.map((event) => (
                      <SelectItem className={floorPlanType === 'ceremony' ? styles.portalItem : receptionStyles.portalItem} key={event.id} value={event.id}>
                        <div className="flex items-center space-x-2">
                          <CalendarDays className="w-[17px] h-[17px]" strokeWidth={1.8} aria-hidden="true" />
                          <span>{event.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem className={floorPlanType === 'ceremony' ? styles.portalItem : receptionStyles.portalItem} value="no-events" disabled>
                      {eventsLoading ? "Loading events..." : "No events found"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Floor Plan Type Section */}
            <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:gap-3">
              <label htmlFor="floor-plan-type" className={`${styles.interfaceLabel} text-sm font-medium text-foreground whitespace-nowrap inline-flex items-center gap-[7px]`}>
                <LayoutTemplate className="w-[17px] h-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                Floor Plan Type:
              </label>
              <Select 
                value={floorPlanType} 
                onValueChange={(value) => setFloorPlanType(value as FloorPlanType)}
              >
                <SelectTrigger id="floor-plan-type" className={`${styles.interfaceControl} ${floorPlanType === 'ceremony' ? styles.control : receptionStyles.control} w-full min-w-0 border-primary focus:ring-primary xl:w-[180px]`}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className={floorPlanType === 'ceremony' ? styles.portalSurface : receptionStyles.portalSurface}>
                  <SelectItem className={floorPlanType === 'ceremony' ? styles.portalItem : receptionStyles.portalItem} value="ceremony">
                    <div className="flex items-center space-x-2">
                      <HeartHandshake className="w-[17px] h-[17px]" strokeWidth={1.8} aria-hidden="true" />
                      <span>Ceremony</span>
                    </div>
                  </SelectItem>
                  <SelectItem className={floorPlanType === 'ceremony' ? styles.portalItem : receptionStyles.portalItem} value="reception">
                    <div className="flex items-center space-x-2">
                      <PartyPopper className="w-[17px] h-[17px]" strokeWidth={1.8} aria-hidden="true" />
                      <span>Reception</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {floorPlanType === 'reception' && selectedEventId && selectedEvent && (
              <div
                ref={setReceptionHeaderControlsContainer}
                className="flex min-w-0 flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-center sm:gap-4 xl:contents"
                data-reception-header-controls="true"
              />
            )}

            {/* Export Controls */}
            {isDataReady && floorPlanType === 'ceremony' && (
              <div
                className={`${styles.exportControls} flex min-w-0 flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-end xl:col-span-1 xl:justify-self-end`}
                data-floor-plan-export-controls="true"
              >
                <p className={`${styles.featureHeading} text-sm font-bold inline-flex items-center gap-1.5 whitespace-nowrap`}>
                <Printer className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <span>Export Controls</span>
                </p>
                <span id="floor-plan-export-description" className="sr-only">Download your floor plan for venue staff.</span>
                <button
                  onClick={handleDownloadPdf}
                  disabled={isExporting}
                  aria-label="Download floor plan PDF"
                  aria-describedby="floor-plan-export-description"
                  className={`${styles.exportButton} inline-flex w-full sm:w-auto items-center justify-center gap-1.5 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2`}
                >
                  {isExporting ? (
                    <LoaderCircle className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
                  ) : (
                    <Download className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                  )}
                  {isExporting ? 'Exporting...' : 'Download PDF'}
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Empty States */}
      {!selectedEventId && (
        <Card className={`${floorPlanType === 'ceremony' ? styles.emptyPanel : 'ww-box'} p-8 text-center`}>
          <LayoutGrid className="w-16 h-16 mx-auto text-primary mb-4" />
          <CardTitle className={`${styles.featureHeading} mb-2`}>Select an Event</CardTitle>
          <CardDescription className={styles.interfaceText}>
            Choose an event to start designing your floor plan
          </CardDescription>
        </Card>
      )}

      {selectedEventId && floorPlanLoading && (
        <Card className={`${floorPlanType === 'ceremony' ? styles.emptyPanel : 'ww-box'} p-8 text-center`}>
          <div className="animate-pulse">
            <LayoutGrid className="w-16 h-16 mx-auto text-primary/50 mb-4" />
            <p className={`${styles.interfaceText} text-muted-foreground`}>Loading floor plan...</p>
          </div>
        </Card>
      )}

      {/* Main Content */}
      {isDataReady && floorPlanType === 'ceremony' && (
        <div className="space-y-4 sm:space-y-6">
          <CeremonyFloorPlanSettings
            floorPlan={floorPlan}
            totalAttending={totalAttending}
            onUpdate={updateFloorPlan}
          />

          <div className={styles.previewRegion} data-ceremony-preview-region="true">
            <CeremonyFloorPlanA4Preview
              pageRef={ceremonyA4Ref}
              floorPlan={floorPlan}
              event={selectedEvent}
              generatedAt={generatedAt}
              onSeatUpdate={updateSeatAssignment}
              onBridalPartyUpdate={updateBridalPartyMember}
              onBridalPartyRoleUpdate={updateBridalPartyRole}
            />
          </div>
        </div>
      )}

      {/* Reception Floor Plan (Phase 1A — Step 2 scaffold) */}
      {selectedEventId && selectedEvent && floorPlanType === 'reception' && (
        <ReceptionFloorPlanPage
          selectedEventId={selectedEventId}
          selectedEvent={selectedEvent}
          headerControlsContainer={receptionHeaderControlsContainer}
        />
      )}
    </div>
  );
};
