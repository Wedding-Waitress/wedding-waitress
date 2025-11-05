import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Plus, Calendar } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { EventEditModal } from './EventEditModal';
import { EventCreateModal } from './EventCreateModal';
import { format } from 'date-fns';
import { formatDisplayTime } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Define Event type locally
interface Event {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
  start_time: string | null;
  finish_time: string | null;
  guest_limit: number;
  guests_count: number;
  created_at: string;
  event_created: string | null;
  expiry_date: string | null;
  created_date_local: string | null;
  expiry_date_local: string | null;
  event_timezone: string | null;
  partner1_name: string | null;
  partner2_name: string | null;
  rsvp_deadline: string | null;
}

// Format event date as DAY{ordinal}, Month YYYY (e.g., "20th, September 2025")
const formatEventDate = (date: string | null): string => {
  if (!date) return "No date";
  const d = new Date(date);
  const day = d.getDate();
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}${suffix}, ${month} ${year}`;
};

// Helper function to format local dates with DD/MM/YYYY format and fallback
const formatLocalDate = (localDate: string | null, fallbackDate: string | null, timezone?: string | null): string => {
  if (localDate) {
    // Format local date as DD/MM/YYYY
    const date = new Date(localDate + 'T00:00:00');
    return format(date, 'dd/MM/yyyy');
  }
  if (fallbackDate) {
    // Fallback: derive from server timestamp using timezone
    const serverDate = new Date(fallbackDate);
    const browserTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Convert to local date in the specified timezone
    const localDateString = serverDate.toLocaleDateString('en-GB', {
      // DD/MM/YYYY format
      timeZone: browserTimezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return localDateString;
  }
  return 'No date';
};

// Helper to calculate expiry date fallback (12 months from created date)
const getExpiryDateFallback = (createdDate: string | null, timezone?: string | null): string => {
  if (!createdDate) return 'No date';
  const date = new Date(createdDate);
  const browserTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Add 12 months
  date.setFullYear(date.getFullYear() + 1);

  // Format as DD/MM/YYYY
  const localDateString = date.toLocaleDateString('en-GB', {
    timeZone: browserTimezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  return localDateString;
};
interface EventsTableProps {
  events: Event[];
  loading: boolean;
  activeEventId: string | null;
  setActiveEventId: (id: string | null) => Promise<void> | void;
  createEvent: (eventData: Partial<Omit<Event, 'id' | 'user_id' | 'created_at' | 'guests_count'>>) => Promise<any>;
  updateEvent: (id: string, eventData: Partial<Omit<Event, 'id' | 'user_id' | 'created_at' | 'guests_count'>>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  onEventSelect?: (eventId: string) => void;
  onEventEdit?: (eventId: string) => void;
  onEventDelete?: (eventId: string) => void;
}
export const EventsTable: React.FC<EventsTableProps> = ({
  events,
  loading,
  activeEventId,
  setActiveEventId,
  createEvent,
  updateEvent,
  deleteEvent,
  onEventSelect,
  onEventEdit,
  onEventDelete
}) => {
  const navigate = useNavigate();
  const selectedEvent = events.find(event => event.id === activeEventId);
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    event: Event | null;
  }>({
    isOpen: false,
    event: null
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    event: any;
  }>({
    isOpen: false,
    event: null
  });
  const [createModal, setCreateModal] = useState(false);
  const handleEventSelect = (eventId: string) => {
    // Immediate UI update (no await)
    setActiveEventId(eventId);
    // Fire callback asynchronously without blocking UI
    if (onEventSelect) {
      Promise.resolve().then(() => onEventSelect(eventId));
    }
  };
  const handleEdit = (event: Event) => {
    setEditModal({
      isOpen: true,
      event
    });
  };

  const handleSaveEdit = async (id: string, eventData: any) => {
    await updateEvent(id, eventData);
    setEditModal({
      isOpen: false,
      event: null
    });
    // Immediately set this event as active and notify parent
    setActiveEventId(id);
    onEventSelect?.(id);
  };
  const handleDeleteClick = (event: any) => {
    setDeleteModal({
      isOpen: true,
      event
    });
  };
  const handleDeleteConfirm = async () => {
    if (deleteModal.event) {
      try {
        await deleteEvent(deleteModal.event.id);
        setDeleteModal({
          isOpen: false,
          event: null
        });
        onEventDelete?.(deleteModal.event.id);
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    }
  };
  const handleCreateEvent = async (eventData: any) => {
    try {
      const newEvent = await createEvent(eventData);
      setCreateModal(false);
      
      // Immediately set the new event as active and notify parent
      if (newEvent?.id) {
        setActiveEventId(newEvent.id);
        onEventSelect?.(newEvent.id);
      }
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };
  const isAtCapacity = (event: any) => {
    return event.guests_count >= event.guest_limit;
  };
  if (loading) {
    return <Card className="ww-box p-8 text-center">
        <div>Loading events...</div>
      </Card>;
  }
  return <>
      <Card className="ww-box overflow-hidden mx-0">
        <div className="p-6 border-b border-card-border bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-medium text-[#7248e6]">My Events</h3>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-semibold">1</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Start here by creating & managing your events, then create the number of tables you want in the next "Tables" page.
                </p>
              </div>
              {selectedEvent && (
                <p className="text-sm mt-1">
                  <span className="text-green-500">
                    Created: {formatLocalDate(selectedEvent.created_date_local, selectedEvent.created_at, selectedEvent.event_timezone)}
                  </span>
                  <span className="text-muted-foreground"> | </span>
                  <span className="text-red-600">
                    Expiry: {formatLocalDate(selectedEvent.expiry_date_local, null, selectedEvent.event_timezone) || getExpiryDateFallback(selectedEvent.created_at, selectedEvent.event_timezone)}
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-white border-primary text-primary rounded-full text-sm">
                <Calendar className="w-4 h-4 mr-1.5" />
                {events.length} Event{events.length !== 1 ? 's' : ''} Created
              </Badge>
              <Button variant="default" size="xs" className="rounded-full flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white" onClick={() => setCreateModal(true)}>
                <Plus className="w-4 h-4" />
                Create Event
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <RadioGroup value={activeEventId || ''} onValueChange={handleEventSelect}>
            <Table>
            <TableHeader className="rounded-t-2xl">
              <TableRow className="rounded-t-2xl">
                <TableHead className="w-20 rounded-tl-2xl">Countdown</TableHead>
                <TableHead className="w-32">Event Name</TableHead>
                <TableHead className="w-24">Event Date</TableHead>
                <TableHead className="w-28">Venue</TableHead>
                <TableHead className="w-20">Start Time</TableHead>
                <TableHead className="w-20">Finish Time</TableHead>
                <TableHead className="w-20">Guest Limit</TableHead>
                <TableHead className="w-24">RSVP Deadline</TableHead>
                <TableHead className="w-24">Created Date</TableHead>
                <TableHead className="w-24">Expiry Date</TableHead>
                <TableHead className="w-20 rounded-tr-2xl">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Existing events */}
              {events.map(event => {
                const isSelected = activeEventId === event.id;
                const atCapacity = isAtCapacity(event);
                return <TableRow key={event.id} className={`
                      border-card-border hover:bg-muted/30 transition-colors
                      ${isSelected ? 'bg-primary/5 border-l-4 border-l-[#22c55e]' : ''}
                      ${atCapacity ? 'bg-green-500/10 dark:bg-green-500/20' : ''}
                    `}>
                    <TableCell className="text-center w-20">
                      <div className="flex items-center justify-center">
                        <RadioGroupItem value={event.id} id={`countdown-${event.id}`} className="data-[state=checked]:border-green-500 data-[state=checked]:text-green-500" onClick={() => handleEventSelect(event.id)} />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium w-32">
                      <div className="flex items-center">
                        {event.name}
                        {atCapacity && <Badge variant="success" className="ml-2 text-xs">
                            Full
                          </Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="w-24">
                      <span className="text-muted-foreground">
                        {formatEventDate(event.date)}
                      </span>
                    </TableCell>
                    <TableCell className="w-28">
                      <span className="text-muted-foreground">
                        {event.venue || 'No venue set'}
                      </span>
                    </TableCell>
                    <TableCell className="w-20">
                      <span className="text-muted-foreground">
                        {formatDisplayTime(event.start_time)}
                      </span>
                    </TableCell>
                    <TableCell className="w-20">
                      <span className="text-muted-foreground">
                        {formatDisplayTime(event.finish_time)}
                      </span>
                    </TableCell>
                    <TableCell className="w-20">
                      <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground">
                          {event.guests_count}/{event.guest_limit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="w-24">
                      <span className="text-muted-foreground">
                        {event.rsvp_deadline ? formatEventDate(event.rsvp_deadline.split('T')[0]) : 'Not set'}
                      </span>
                    </TableCell>
                    <TableCell className="w-24">
                      <span className="text-muted-foreground">
                        {formatLocalDate(event.created_date_local, event.created_at, event.event_timezone)}
                      </span>
                    </TableCell>
                    <TableCell className="w-24">
                      <span className="text-muted-foreground">
                        {formatLocalDate(event.expiry_date_local, null, event.event_timezone) || getExpiryDateFallback(event.created_at, event.event_timezone)}
                      </span>
                    </TableCell>
                    <TableCell className="w-20">
                      <div className="flex items-center justify-center space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleEdit(event)} 
                                className="text-green-500 hover:text-green-500"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteClick(event)} 
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>;
                })}
                {/* Purple footer row - matching header background */}
                <TableRow className="bg-primary hover:bg-primary border-t border-card-border rounded-b-2xl">
                  <TableCell colSpan={11} className="h-12 rounded-b-2xl">
                    {/* Empty footer row with same height as data rows */}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </RadioGroup>
        </div>
      </Card>

      <EventEditModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, event: null })}
        event={editModal.event}
        onSave={handleSaveEdit}
      />

      <EventCreateModal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        onCreate={handleCreateEvent}
      />

      <DeleteConfirmationModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({
      isOpen: false,
      event: null
    })} onConfirm={handleDeleteConfirm} eventName={deleteModal.event?.name || ''} />
    </>;
};