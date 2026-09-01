/**
 * ⚠️ PRODUCTION-READY — LOCKED FOR PRODUCTION ⚠️
 * 
 * This Events Management Table feature is COMPLETE and APPROVED for production use.
 * 
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break event selection synchronization
 * - Changes could break countdown integration
 * - Changes could break event type toggle design
 * - Changes could break date formatting
 * 
 * See: MY_EVENTS_TABLES_GUESTLIST_SPECS.md for full specifications
 * 
 * Last locked: 2025-11-12
 */

import React, { lazy, Suspense, useRef, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, CalendarDays, CalendarCheck2, CircleDot, ChevronDown, ChevronUp } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from 'date-fns';
import { formatDisplayTime } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import type { EventLimitsState } from '@/hooks/useEventLimits';
import { useToast } from '@/hooks/use-toast';

const DeleteConfirmationModal = lazy(() => import('./DeleteConfirmationModal').then(m => ({ default: m.DeleteConfirmationModal })));
const EventEditModal = lazy(() => import('./EventEditModal').then(m => ({ default: m.EventEditModal })));
const EventCreateModal = lazy(() => import('./EventCreateModal').then(m => ({ default: m.EventCreateModal })));
const AdditionalEventModal = lazy(() => import('./AdditionalEventModal').then(m => ({ default: m.AdditionalEventModal })));

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
  event_type?: 'seated' | 'cocktail';
  event_id?: string | null;
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
  deleteEvent: (id: string) => Promise<unknown>;
  onEventSelect?: (eventId: string) => void;
  onEventEdit?: (eventId: string) => void;
  onEventDelete?: (eventId: string) => void;
  selectedEvent?: Event | null;
  eventLimits: EventLimitsState;
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
  onEventDelete,
  selectedEvent: selectedEventProp,
  eventLimits,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
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
  const [addEventModal, setAddEventModal] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const deleteInFlightRef = useRef(false);
  const handleCreateClick = () => {
    if (eventLimits.loading) return;
    if (!eventLimits.atCap) {
      setCreateModal(true);
      return;
    }
    if (eventLimits.canPurchaseAdditionalEvents && eventLimits.canCreate) {
      setAddEventModal(true);
      return;
    }
    toast({
      title: eventLimits.canCreate ? 'Event limit reached' : 'Event creation unavailable',
      description: eventLimits.planKey === 'vendor_pro'
        ? 'Vendor Pro supports up to 100 active events. Delete or wait for an event to expire before creating another.'
        : eventLimits.canCreate
          ? 'Your free account includes 1 active event. Delete or wait for it to expire before creating another.'
          : 'Your plan is not active for event creation. Please review your subscription.',
      variant: 'destructive',
    });
  };
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
    if (!deleteModal.event || deleteInFlightRef.current) return;
    const eventId = deleteModal.event.id;
    deleteInFlightRef.current = true;
    setDeletingEventId(eventId);
    try {
      await deleteEvent(eventId);
      setDeleteModal({ isOpen: false, event: null });
      onEventDelete?.(eventId);
    } catch (error) {
      console.error('Delete Event request failed', { eventId });
    } finally {
      deleteInFlightRef.current = false;
      setDeletingEventId(null);
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
    return <Card className="ww-box ww-events-table-panel p-8 text-center">
        <div>Loading events...</div>
      </Card>;
  }
  return <>
      <Card className="ww-events-table-panel border-2 border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] overflow-hidden mx-0 rounded-xl">
        <div className="ww-events-table-header px-4 sm:px-6 pt-4 pb-8 border-b-2 border-primary bg-white">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-3 max-lg:justify-center max-lg:text-center">
            <h3 className="ww-events-title min-w-0 max-w-full shrink text-2xl font-extrabold text-foreground truncate tracking-tight max-lg:w-full max-lg:font-bold max-lg:tracking-normal flex items-center gap-2 max-lg:justify-center">
              <CalendarDays size={22} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
              <span className="truncate">My Events{selectedEventProp?.name ? ` - ${selectedEventProp.name}` : ''}</span>
            </h3>

            <div className="ml-auto flex shrink-0 items-center gap-2 max-lg:ml-0 max-lg:basis-full max-lg:flex-wrap max-lg:justify-center">
              <Badge variant="outline" className="ww-events-badge bg-white border-primary text-primary rounded-full text-sm">
                <CalendarCheck2 size={16} strokeWidth={1.8} className="mr-1.5 shrink-0" aria-hidden="true" />
                {events.length} Event{events.length !== 1 ? 's' : ''} Created
              </Badge>
              <Button variant="default" size="sm" className="ww-events-button lv-premium-shade rounded-full flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white touch-target sm:max-lg:w-48 max-lg:h-9 max-lg:justify-center" onClick={handleCreateClick}>
                <Plus size={16} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                {isMobile ? "Create" : "Create Event"}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        {isMobile ? (
          <div className="p-4 space-y-3">
            <RadioGroup value={activeEventId || ''} onValueChange={handleEventSelect}>
              {events.map(event => {
                const isSelected = activeEventId === event.id;
                const atCapacity = isAtCapacity(event);
                const isExpanded = expandedEventId === event.id;
                
                return (
                  <div 
                    key={event.id}
                    className={`ww-events-mobile-card rounded-xl border-2 overflow-hidden transition-all ${
                      isSelected ? 'border-green-500 bg-green-50' : 'border-border bg-card'
                    }`}
                  >
                    {/* Main Card Content */}
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => handleEventSelect(event.id)}
                    >
                      {/* Header: Name with radio */}
                      <div className="flex items-start gap-3 min-w-0">
                        <RadioGroupItem 
                          value={event.id} 
                          id={`countdown-${event.id}`} 
                          className="mt-1 data-[state=checked]:border-green-500 data-[state=checked]:text-green-500" 
                        />
                        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                          <h4 className="text-base font-semibold text-foreground break-words w-full">{event.name}</h4>
                          {atCapacity && <Badge variant="success" className="ww-events-badge text-xs">Full</Badge>}
                        </div>
                      </div>
                      {event.event_id && (
                        <p className="mt-1 text-xs font-mono text-muted-foreground pl-7">ID: {event.event_id}</p>
                      )}

                      {/* Always-visible details (tightened spacing) */}
                      <div className="mt-1.5 space-y-0">
                        <p className="text-sm text-muted-foreground">{formatEventDate(event.date)}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{event.venue || 'No venue set'}</p>

                        <p className="mt-1 text-sm text-muted-foreground">{event.guests_count}/{event.guest_limit} guests</p>

                        <div className="flex justify-between items-center mt-0.5 text-sm gap-2">
                          <span><span className="ww-events-label text-muted-foreground">Start Time:</span> <span>{formatDisplayTime(event.start_time) || 'Not set'}</span></span>
                          <span><span className="ww-events-label text-muted-foreground">Finish Time:</span> <span>{formatDisplayTime(event.finish_time) || 'Not set'}</span></span>
                        </div>

                        <p className="mt-1 text-sm">
                          <span className="ww-events-label text-muted-foreground">RSVP:</span>{' '}
                          <span>{event.rsvp_deadline ? formatEventDate(event.rsvp_deadline.split('T')[0]) : 'Not set'}</span>
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <span className="ww-events-label">Created:</span>{' '}{formatLocalDate(event.created_date_local, event.created_at, event.event_timezone)}
                        </p>
                      </div>

                      {/* Action buttons: centered tablet-shape buttons */}
                      <div className="flex items-center justify-center gap-3 mt-3">
                        <Button 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); handleEdit(event); }} 
                          className="ww-events-button lv-premium-shade rounded-full bg-green-500 hover:bg-green-600 text-white h-9 px-4 flex items-center gap-2"
                        >
                          <Pencil size={17} strokeWidth={1.8} className="text-white shrink-0" aria-hidden="true" />
                          <span>Edit Event</span>
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(event); }} 
                          className="ww-events-button lv-premium-shade rounded-full bg-red-500 hover:bg-red-600 text-white h-9 px-4 flex items-center gap-2"
                        >
                          <Trash2 size={17} strokeWidth={1.8} className="text-white shrink-0" aria-hidden="true" />
                          <span>Cancel</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
            
            {events.length === 0 && (
              <div className="ww-events-empty text-center py-8 text-muted-foreground">
                No events yet. Create your first event!
              </div>
            )}
          </div>
        ) : (
          /* Desktop / Tablet Table View */
          <div className="overflow-x-auto">
            <RadioGroup value={activeEventId || ''} onValueChange={handleEventSelect}>
              <Table>
              <TableHeader>
                <TableRow className="border-b-0">
                  <TableHead className="w-20">Countdown</TableHead>
                  <TableHead className="w-24">Event ID</TableHead>
                  <TableHead className="w-32">Event Name</TableHead>
                  <TableHead className="w-24">Event Date</TableHead>
                  <TableHead className="w-28">Venue</TableHead>
                  <TableHead className="w-20">Start Time</TableHead>
                  <TableHead className="w-20">Finish Time</TableHead>
                  <TableHead className="w-20">Guest Limit</TableHead>
                  <TableHead className="w-24">RSVP Deadline</TableHead>
                  <TableHead className="w-24">Created Date</TableHead>
                  <TableHead className="w-24">Expiry Date</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Existing events */}
                {events.map(event => {
                  const isSelected = activeEventId === event.id;
                  const atCapacity = isAtCapacity(event);
                  return <TableRow key={event.id} className={`ww-events-row
                        border-card-border hover:bg-muted/30 transition-colors
                        ${isSelected ? 'bg-primary/5 border-l-4 border-l-[#22c55e]' : ''}
                        ${atCapacity ? 'bg-green-500/10 dark:bg-green-500/20' : ''}
                      `}>
                      <TableCell className="text-center w-20">
                        <div className="flex items-center justify-center">
                          <RadioGroupItem value={event.id} id={`countdown-${event.id}`} aria-label={`Show countdown for ${event.name}`} className="sr-only" onClick={() => handleEventSelect(event.id)} />
                          <label htmlFor={`countdown-${event.id}`} className="cursor-pointer inline-flex items-center justify-center p-1">
                            <CircleDot
                              size={20}
                              strokeWidth={1.8}
                              aria-hidden="true"
                              className={isSelected ? 'text-green-500' : 'text-muted-foreground/50'}
                            />
                          </label>
                        </div>
                      </TableCell>
                      <TableCell className="w-24">
                        <span className="font-mono text-xs text-muted-foreground">{event.event_id || '—'}</span>
                      </TableCell>
                      <TableCell className="font-medium w-32">
                        <div className="flex items-center">
                          {event.name}
                          {atCapacity && <Badge variant="success" className="ww-events-badge ml-2 text-xs">
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
                                  aria-label="Edit event"
                                  className="ww-emboss-green ww-emboss-green-soft !border-0 text-white hover:text-white"
                                >
                                  <Pencil size={17} strokeWidth={1.8} className="text-white" aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-[13px] font-normal leading-[18px]">
                                <p>Edit event</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDeleteClick(event)} 
                                  aria-label="Delete event"
                                  className="ww-emboss-red !border-0 text-white hover:text-white"
                                >
                                  <Trash2 size={17} strokeWidth={1.8} className="text-white" aria-hidden="true" />
                                </Button>

                              </TooltipTrigger>
                              <TooltipContent className="text-[13px] font-normal leading-[18px]">
                                <p>Delete event</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>;
                  })}
                  {/* Purple footer row - matching header background */}
                  <TableRow className="ww-events-footer bg-primary hover:bg-primary border-t-0">
                    <TableCell colSpan={12} className="h-12">
                      {/* Empty footer row with same height as data rows */}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </RadioGroup>
          </div>
        )}
      </Card>

      <Suspense fallback={null}>
        {editModal.isOpen && <EventEditModal
          isOpen
          onClose={() => setEditModal({ isOpen: false, event: null })}
          event={editModal.event}
          onSave={handleSaveEdit}
        />}
        {createModal && <EventCreateModal
          isOpen
          onClose={() => setCreateModal(false)}
          onCreate={handleCreateEvent}
        />}
        {deleteModal.isOpen && <DeleteConfirmationModal isOpen onClose={() => setDeleteModal({
          isOpen: false,
          event: null
        })} onConfirm={handleDeleteConfirm} eventName={deleteModal.event?.name || ''} isLoading={deletingEventId === deleteModal.event?.id} />}
        {addEventModal && eventLimits.canPurchaseAdditionalEvents && <AdditionalEventModal
          isOpen
          onClose={() => setAddEventModal(false)}
          includedEvents={eventLimits.includedEvents}
          currentEvents={eventLimits.currentEvents}
        />}
      </Suspense>
    </>;
};
