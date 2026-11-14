import choiceStyles from './EventSelectorReference.module.css';
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { Event } from '@/hooks/useEvents';

interface StandardEventSelectorProps {
  events: Event[];
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  loading?: boolean;
  menuClassName?: string;
  referenceStyle?: boolean;
}

export const StandardEventSelector: React.FC<StandardEventSelectorProps> = ({
  events,
  selectedEventId,
  onEventSelect,
  loading = false,
  menuClassName,
  referenceStyle = false,
}) => {
  return (
    <div className={`flex items-center gap-4 min-w-0 ${referenceStyle ? choiceStyles.row : ""}`}>
      <label className={`text-sm font-medium text-foreground whitespace-nowrap ${referenceStyle ? choiceStyles.label : ""}`}>
        {referenceStyle && <Calendar size={18} strokeWidth={1.8} aria-hidden="true" />}
        Choose Event:
      </label>
      <Select 
        value={selectedEventId || "no-event"} 
        onValueChange={(value) => {
          if (value === 'no-event') return;
          onEventSelect(value);
        }}
      >
        <SelectTrigger aria-label="Choose Event" className={`w-full sm:w-[300px] border-primary focus:ring-primary ${referenceStyle ? choiceStyles.trigger : ""}`}>
          <SelectValue placeholder="Choose Event" />
        </SelectTrigger>
        <SelectContent className={`bg-popover border-border z-50 ${menuClassName || ''}`}>
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
