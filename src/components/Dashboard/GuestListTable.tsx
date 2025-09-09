import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/enhanced-card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users,
  Calendar
} from "lucide-react";
import { useEvents } from '@/hooks/useEvents';

export const GuestListTable: React.FC = () => {
  const { events, loading } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Load selected event from localStorage on mount
  useEffect(() => {
    const savedEventId = localStorage.getItem('selectedEventId');
    if (savedEventId && events.some(event => event.id === savedEventId)) {
      setSelectedEventId(savedEventId);
    }
  }, [events]);

  // Save selected event to localStorage when changed
  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
    localStorage.setItem('selectedEventId', eventId);
  };

  const selectedEvent = events.find(event => event.id === selectedEventId);

  if (loading) {
    return (
      <Card variant="elevated" className="p-8 text-center">
        <div>Loading events...</div>
      </Card>
    );
  }

  // No event selected - show large centered empty state
  if (!selectedEventId) {
    return (
      <div className="p-16 text-center">
        <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Guest List Management</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Select an event to view and manage its guest list.
        </p>
        <Button variant="gradient" size="sm">
          <Users className="w-4 h-4 mr-2" />
          Add Guests
        </Button>
      </div>
    );
  }

  const guestCount = selectedEvent?.guests_count || 0;

  // Event selected - show table card
  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className="p-6 border-b border-card-border bg-gradient-subtle">
        <div className="space-y-4">
          {/* Row 1: Controls with repositioned elements */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-foreground">
                Choose an Event:
              </label>
              <Select value={selectedEventId || ""} onValueChange={handleEventSelect}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select an event..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{event.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Guest counter pill - moved to left side */}
              <Badge variant="secondary" className="glass">
                {guestCount} Guest{guestCount !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            {/* No Guests Yet widget - moved to right side, only show when guestCount === 0 */}
            {guestCount === 0 && (
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">No Guests Yet</span>
                <Button variant="gradient" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Add First Guest
                </Button>
              </div>
            )}
          </div>
          
          {/* Row 2: Title line */}
          <div className="flex items-center space-x-2">
            <span className="text-lg font-medium text-foreground">Guest List for</span>
            <span className="text-lg font-bold text-primary">{selectedEvent.name}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-card-border hover:bg-muted/50">
              <TableHead className="min-w-[200px]">Guest Name</TableHead>
              <TableHead className="min-w-[200px]">Email</TableHead>
              <TableHead className="min-w-[120px]">RSVP</TableHead>
              <TableHead className="min-w-[100px]">Table</TableHead>
              <TableHead className="min-w-[200px]">Notes</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Empty table body when no guests - no large centered state */}
            {guestCount === 0 && (
              <TableRow className="border-card-border">
                <TableCell colSpan={6} className="text-center py-8">
                  {/* Empty - the "No Guests Yet" widget is now in the header */}
                </TableCell>
              </TableRow>
            )}
            {/* Future: guest rows will go here when guestCount > 0 */}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};