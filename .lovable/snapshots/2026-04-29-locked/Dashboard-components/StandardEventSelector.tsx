import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { Event } from '@/hooks/useEvents';

interface StandardEventSelectorProps {
  events: Event[];
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  loading?: boolean;
}

export const StandardEventSelector: React.FC<StandardEventSelectorProps> = ({
  events,
  selectedEventId,
  onEventSelect,
  loading = false
}) => {
  return (
    <div className="flex items-center space-x-4">
      <label className="text-sm font-medium text-foreground whitespace-nowrap">
        Choose Event:
      </label>
      <Select 
        value={selectedEventId || "no-event"} 
        onValueChange={(value) => {
          if (value === 'no-event') return;
          onEventSelect(value);
        }}
      >
        <SelectTrigger className="w-full sm:w-[300px] border-primary focus:ring-primary">
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
              {loading ? "Loading events..." : "No events found"}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
