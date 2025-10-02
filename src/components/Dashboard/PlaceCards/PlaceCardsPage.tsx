import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEvents } from '@/hooks/useEvents';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { Guest } from '@/hooks/useGuests';
import { usePlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { PlaceCardCustomizer } from './PlaceCardCustomizer';
import { PlaceCardPreview } from './PlaceCardPreview';
import { PlaceCardExporter } from './PlaceCardExporter';
import { PlaceCardExportControls } from './PlaceCardExportControls';
import { Loader2, Users, Settings, FileText } from 'lucide-react';

export const PlaceCardsPage: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [focusedPage, setFocusedPage] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { events, loading: eventsLoading } = useEvents();
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);
  const { settings, loading: settingsLoading, updateSettings } = usePlaceCardSettings(selectedEventId);

  const selectedEvent = events.find(event => event.id === selectedEventId);
  const assignedGuests = guests.filter(guest => guest.assigned && guest.table_no && guest.seat_no);
  const totalPages = Math.ceil(assignedGuests.length / 6);

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading events...</span>
      </div>
    );
  }

  if (!events.length) {
    return (
      <Card className="ww-box">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Events Found</h3>
            <p className="text-sm text-muted-foreground">Create an event first to generate place cards.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Table Name Place Cards</h1>
          <p className="text-muted-foreground">Create professional foldable place cards for your guests</p>
        </div>
      </div>

      {/* Event Selection & Export Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="ww-box">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Event Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Event</label>
                <Select value={selectedEventId || ""} onValueChange={handleEventChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name} - {event.date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEvent && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Users className="h-4 w-4" />
                    <span>{assignedGuests.length} assigned guests</span>
                  </div>
                )}
              </div>
              
              {selectedEvent && assignedGuests.length > 0 && (
                <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
                  <p><strong>{assignedGuests.length}</strong> place cards ready for export</p>
                  <p><strong>{totalPages}</strong> A4 page{totalPages !== 1 ? 's' : ''} (6 cards per page)</p>
                  <p>Standard 105mm × 99mm foldable place cards</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedEvent && assignedGuests.length > 0 && (
          <PlaceCardExportControls
            settings={settings}
            guests={assignedGuests}
            event={selectedEvent}
            totalPages={totalPages}
            onPageFocus={setFocusedPage}
            onExportStateChange={setIsExporting}
          />
        )}
      </div>

      {selectedEventId && (
        <>
          {(guestsLoading || settingsLoading) ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customizer */}
              <div className="space-y-6">
                <PlaceCardCustomizer
                  settings={settings}
                  onSettingsChange={updateSettings}
                  guests={assignedGuests}
                />
              </div>

              {/* Preview Only */}
              <div className="space-y-6">
                <PlaceCardPreview
                  settings={settings}
                  guests={assignedGuests}
                  event={selectedEvent}
                  isExporting={isExporting}
                  focusedPage={focusedPage}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};