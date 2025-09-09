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

  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className="p-6 border-b border-card-border bg-gradient-subtle">
        <div className="space-y-4">
          {/* Row 1: Controls */}
          <div className="flex items-center justify-between">
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
            </div>
            <Badge variant="secondary" className="glass">
              {selectedEvent ? `${selectedEvent.guests_count} Guest${selectedEvent.guests_count !== 1 ? 's' : ''}` : '0 Guests'}
            </Badge>
          </div>
          
          {/* Row 2: Title line */}
          {selectedEvent && (
            <div className="flex items-center space-x-2">
              <span className="text-lg font-medium text-foreground">Guest List for</span>
              <span className="text-lg font-bold text-primary">{selectedEvent.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {!selectedEventId ? (
          // Empty state when no event selected
          <div className="p-16 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Select an Event</h3>
            <p className="text-sm text-muted-foreground">
              Choose an event from the dropdown above to view and manage its guest list.
            </p>
          </div>
        ) : (
          // Table scaffold (empty for now)
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
              {/* Empty table state */}
              <TableRow className="border-card-border">
                <TableCell colSpan={6} className="text-center py-16">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium text-foreground mb-2">No Guests Yet</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start adding guests to your event to see them here.
                  </p>
                  <Button variant="gradient" size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    Add First Guest
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
};