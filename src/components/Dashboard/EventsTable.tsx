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

import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Plus, Calendar, ChevronDown, ChevronUp } from "lucide-react";
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
import { useIsMobile } from '@/hooks/use-mobile';

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
  selectedEvent?: Event | null;
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
  selectedEvent: selectedEventProp
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
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
      <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] overflow-hidden mx-0">
        <div className="px-4 sm:px-6 py-4 border-b border-card-border bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-medium text-foreground truncate">
                My Events{selectedEventProp?.name && !isMobile ? ` - ${selectedEventProp.name}` : ''}
              </h3>
              <div className="flex items-start gap-2 mt-3">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {isMobile ? "Create & manage events here." : (
                    <>
                      <span className="bg-green-500 text-white text-xs sm:text-sm font-medium px-2 py-0.5 rounded">Start here</span>
                      {" "}by creating & managing your events, then create the number of tables you want in the next "Tables" page.
                    </>
                  )}
                </p>
              </div>
              {selectedEvent && !isMobile && (
                <p className="text-sm mt-1">
                  <span className="text-green-500">
                    Your account was created on {formatLocalDate(selectedEvent.created_date_local, selectedEvent.created_at, selectedEvent.event_timezone)}
                  </span>
                  <span className="text-muted-foreground"> | </span>
                  <span className="text-red-600">
                    Your account will expire on {formatLocalDate(selectedEvent.expiry_date_local, null, selectedEvent.event_timezone) || getExpiryDateFallback(selectedEvent.created_at, selectedEvent.event_timezone)}
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isMobile && (
                <Badge variant="outline" className="bg-white border-primary text-primary rounded-full text-sm">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  {events.length} Event{events.length !== 1 ? 's' : ''} Created
                </Badge>
              )}
              <Button variant="default" size="sm" className="rounded-full flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white touch-target" onClick={() => setCreateModal(true)}>
                <Plus className="w-4 h-4" />
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
                    className={`rounded-xl border-2 overflow-hidden transition-all ${
                      isSelected ? 'border-green-500 bg-green-50' : 'border-border bg-card'
                    }`}
                  >
                    {/* Main Card Content */}
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => handleEventSelect(event.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <RadioGroupItem 
                            value={event.id} 
                            id={`countdown-${event.id}`} 
                            className="mt-1 data-[state=checked]:border-green-500 data-[state=checked]:text-green-500" 
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-foreground truncate">{event.name}</h4>
                              {atCapacity && <Badge variant="success" className="text-xs">Full</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatEventDate(event.date)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {event.venue || 'No venue set'}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>{event.guests_count}/{event.guest_limit} guests</span>
                              {event.start_time && (
                                <>
                                  <span>•</span>
                                  <span>{formatDisplayTime(event.start_time)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); handleEdit(event); }} 
                            className="text-green-500 hover:text-green-500 h-9 w-9 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(event); }} 
                            className="text-red-500 hover:text-red-600 h-9 w-9 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setExpandedEventId(isExpanded ? null : event.id);
                            }}
                            className="h-9 w-9 p-0"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/30 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Start:</span>
                            <span className="ml-1">{formatDisplayTime(event.start_time) || 'Not set'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Finish:</span>
                            <span className="ml-1">{formatDisplayTime(event.finish_time) || 'Not set'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">RSVP:</span>
                            <span className="ml-1">{event.rsvp_deadline ? formatEventDate(event.rsvp_deadline.split('T')[0]) : 'Not set'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Created:</span>
                            <span className="ml-1">{formatLocalDate(event.created_date_local, event.created_at, event.event_timezone)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </RadioGroup>
            
            {events.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No events yet. Create your first event!
              </div>
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <div className="overflow-hidden border-2 border-primary rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] mx-4 mb-4">
            <RadioGroup value={activeEventId || ''} onValueChange={handleEventSelect}>
              <Table>
              <TableHeader>
                <TableRow className="border-b-0">
                  <TableHead className="w-20">Countdown</TableHead>
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
                  <TableRow className="bg-primary hover:bg-primary border-t-0">
                    <TableCell colSpan={11} className="h-12">
                      {/* Empty footer row with same height as data rows */}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </RadioGroup>
          </div>
        )}
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