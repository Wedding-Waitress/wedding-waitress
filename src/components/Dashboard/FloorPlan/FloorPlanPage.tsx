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

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, FileText, LayoutGrid } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useCeremonyFloorPlan } from '@/hooks/useCeremonyFloorPlan';
import { CeremonyFloorPlanVisual } from './CeremonyFloorPlan/CeremonyFloorPlanVisual';
import { CeremonyFloorPlanSettings } from './CeremonyFloorPlan/CeremonyFloorPlanSettings';
import { generateCeremonyFloorPlanPDF } from '@/lib/ceremonyFloorPlanPdfExporter';
import { toast } from 'sonner';

interface FloorPlanPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

type FloorPlanType = 'ceremony' | 'reception';

export const FloorPlanPage = ({
  selectedEventId,
  onEventSelect,
}: FloorPlanPageProps) => {
  const [floorPlanType, setFloorPlanType] = useState<FloorPlanType>('ceremony');
  const [isExporting, setIsExporting] = useState(false);

  const { events, loading: eventsLoading } = useEvents();
  const { 
    floorPlan, 
    loading: floorPlanLoading,
    initialLoadComplete,
    createFloorPlan, 
    updateFloorPlan,
    updateSeatAssignment,
    updateBridalPartyMember,
    updateBridalPartyRole,
    getSeatName,
    getBridalPartyName,
    getBridalPartyRole,
  } = useCeremonyFloorPlan(selectedEventId);

  const selectedEvent = events.find(event => event.id === selectedEventId);

  // Create floor plan if it doesn't exist when ceremony type is selected
  // Only attempt after initial load confirms no plan exists
  useEffect(() => {
    if (selectedEventId && floorPlanType === 'ceremony' && !floorPlan && initialLoadComplete && !floorPlanLoading) {
      createFloorPlan();
    }
  }, [selectedEventId, floorPlanType, floorPlan, initialLoadComplete, floorPlanLoading, createFloorPlan]);

  const handleDownloadPdf = async () => {
    if (!selectedEvent || !floorPlan) return;

    setIsExporting(true);
    try {
      toast.info('Generating PDF...');
      await generateCeremonyFloorPlanPDF(floorPlan, selectedEvent);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const isDataReady = selectedEvent && floorPlan && !floorPlanLoading;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="ww-box">
        <CardContent className="pt-4 sm:pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start justify-between gap-4">
            {/* Left: Title and Description */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-medium text-[#7248e6] mb-2">
                Floor Plan
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Design and visualize your ceremony or reception seating layout
              </p>
            </div>
            
            {/* Right: Export Controls Box */}
            {isDataReady && floorPlanType === 'ceremony' && (
              <div className="w-full sm:w-auto border border-primary rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3">
                <h3 className="text-sm font-medium">Export Controls</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Download your floor plan for venue staff.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    variant="default"
                    size="sm"
                    onClick={handleDownloadPdf}
                    disabled={isExporting}
                    className="rounded-full flex items-center gap-2 touch-target"
                  >
                    <FileText className="w-4 h-4" />
                    {isExporting ? 'Exporting...' : 'Download PDF'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Event and Type Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 pt-4">
            {/* Choose Event Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
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
                <SelectTrigger className="w-full sm:w-[300px] border-primary focus:ring-primary font-bold text-[#7248e6]">
                  <SelectValue placeholder="Choose Event" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {events.length > 0 ? (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>{event.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-events" disabled>
                      {eventsLoading ? "Loading events..." : "No events found"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Floor Plan Type Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Floor Plan Type:
              </label>
              <Select 
                value={floorPlanType} 
                onValueChange={(value) => setFloorPlanType(value as FloorPlanType)}
              >
                <SelectTrigger className="w-full sm:w-[200px] border-primary focus:ring-primary">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="ceremony">
                    <div className="flex items-center space-x-2">
                      <LayoutGrid className="w-4 h-4" />
                      <span>Ceremony</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="reception" disabled>
                    <div className="flex items-center space-x-2">
                      <LayoutGrid className="w-4 h-4" />
                      <span>Reception (Coming Soon)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Total Attending Ceremony - shown when ceremony floor plan is loaded */}
            {floorPlan && floorPlanType === 'ceremony' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 sm:ml-4 mt-2 sm:mt-0">
                <span className="text-sm font-medium text-primary">
                  Total Attending: <span className="font-bold">
                    {3 + (floorPlan.bridal_party_count_left || 0) + (floorPlan.bridal_party_count_right || 0) + (floorPlan.total_rows * floorPlan.chairs_per_row * 2)}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  (Bride & Groom + Celebrant + Bridal Party + Family & Friends)
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Empty States */}
      {!selectedEventId && (
        <Card className="ww-box p-8 text-center">
          <LayoutGrid className="w-16 h-16 mx-auto text-primary mb-4" />
          <CardTitle className="mb-2">Select an Event</CardTitle>
          <CardDescription>
            Choose an event to start designing your floor plan
          </CardDescription>
        </Card>
      )}

      {selectedEventId && floorPlanLoading && (
        <Card className="ww-box p-8 text-center">
          <div className="animate-pulse">
            <LayoutGrid className="w-16 h-16 mx-auto text-primary/50 mb-4" />
            <p className="text-muted-foreground">Loading floor plan...</p>
          </div>
        </Card>
      )}

      {/* Main Content */}
      {isDataReady && floorPlanType === 'ceremony' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Settings */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <CeremonyFloorPlanSettings
              floorPlan={floorPlan}
              onUpdate={updateFloorPlan}
            />
          </div>

          {/* Visual Preview */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <Card className="ww-box p-3 sm:p-6 overflow-x-auto">
              <CeremonyFloorPlanVisual
                floorPlan={floorPlan}
                onSeatUpdate={updateSeatAssignment}
                getSeatName={getSeatName}
                onBridalPartyUpdate={updateBridalPartyMember}
                getBridalPartyName={getBridalPartyName}
                onBridalPartyRoleUpdate={updateBridalPartyRole}
                getBridalPartyRole={getBridalPartyRole}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
