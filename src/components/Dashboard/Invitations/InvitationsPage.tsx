import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEvents } from '@/hooks/useEvents';
import { useInvitationCardSettings } from '@/hooks/useInvitationCardSettings';
import { InvitationCardCustomizer } from './InvitationCardCustomizer';
import { InvitationCardPreview } from './InvitationCardPreview';
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils';
import { Loader2, FileText, Calendar, Mail } from 'lucide-react';

interface InvitationsPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export const InvitationsPage: React.FC<InvitationsPageProps> = ({
  selectedEventId,
  onEventSelect,
}) => {
  const { events, loading: eventsLoading } = useEvents();
  const { settings, loading: settingsLoading, updateSettings } = useInvitationCardSettings(selectedEventId);

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  const eventData = useMemo(() => {
    if (!selectedEvent) return {};
    const p1 = selectedEvent.partner1_name || '';
    const p2 = selectedEvent.partner2_name || '';
    const coupleNames = p1 && p2 ? `${p1} & ${p2}` : p1 || p2 || selectedEvent.name;

    return {
      couple_names: coupleNames,
      date: selectedEvent.date ? formatDisplayDate(selectedEvent.date) : '',
      venue: selectedEvent.venue || '',
      time: selectedEvent.start_time ? formatDisplayTime(selectedEvent.start_time) : '',
      rsvp_deadline: selectedEvent.rsvp_deadline ? formatDisplayDate(selectedEvent.rsvp_deadline) : '',
    };
  }, [selectedEvent]);

  const handleEventChange = (eventId: string) => {
    if (eventId === "no-event") return;
    onEventSelect(eventId);
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
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Events Found</h3>
            <p className="text-sm text-muted-foreground">Create an event first to design invitations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Combined Header Box */}
      <Card className="ww-box">
        <CardContent className="space-y-4 pt-6">
          {/* Title & Subtitle */}
          <div className="text-left">
            <h1 className="text-2xl font-medium text-foreground">Invitations and Cards</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create professional A4-A5 invitations, save the date, and thank you cards for you to send to your guest digitally and download to print
            </p>
          </div>

          {/* Stats Box */}
          {selectedEvent && (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 border border-primary rounded-xl p-4 text-sm space-y-2">
                <p className="font-medium text-green-600">
                  Manage your A4-A5 invitations and cards
                </p>
                <div className="text-muted-foreground space-y-1 mt-3">
                  <p>• All exports are 300 DPI for professional quality</p>
                  <p>• PDF exports maintain exact A4/A5 dimensions</p>
                  <p>• Image exports are 2480×3508 pixels (A4 @ 300 DPI)</p>
                  <p>• Send digitally or download to print at home or your local printer</p>
                  <p>• Background images must be smaller than 5MB</p>
                </div>
              </div>
            </div>
          )}

          {/* Separator */}
          <div className="border-b border-border" />

          {/* Choose Event & Export Controls */}
          <div className="flex items-center justify-between gap-8 flex-nowrap pt-2">
            {/* Left side: Choose Event */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Choose Event:
              </label>
              <Select value={selectedEventId || "no-event"} onValueChange={handleEventChange}>
                <SelectTrigger className="w-full sm:w-[300px] border-primary focus:ring-primary font-bold text-primary">
                  <SelectValue placeholder="Choose Event" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {events.length > 0 ? (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
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

            {/* Right side: Export Controls */}
            {selectedEvent && (
              <div className="border border-primary rounded-xl p-3 flex flex-col gap-2 whitespace-nowrap">
                <div className="text-sm">
                  <span className="font-medium">Export Controls</span>
                  <span className="text-muted-foreground ml-2">Download your invitations as PDF ready for printing.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled
                    className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
                  >
                    <FileText className="w-3 h-3" />
                    Download PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Placeholder when no event selected */}
      {!selectedEventId && (
        <Card className="ww-box p-12 text-center">
          <Mail className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="text-xl mb-2 text-muted-foreground">Select an Event</CardTitle>
          <CardDescription className="text-base">
            Choose an event above to start designing your invitations
          </CardDescription>
        </Card>
      )}

      {/* Bottom Section - Grid Layout */}
      {selectedEventId && selectedEvent && !settingsLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Customizer */}
          <div className="lg:col-span-2">
            <InvitationCardCustomizer
              settings={settings}
              onSettingsChange={updateSettings}
              eventData={eventData}
            />
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-3">
            <InvitationCardPreview
              settings={settings}
              eventData={eventData}
            />
          </div>
        </div>
      )}
    </div>
  );
};
