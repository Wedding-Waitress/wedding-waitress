import React, { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Edit2, 
  Trash2, 
  Calendar,
  MapPin,
  Users,
  Clock,
  Plus,
  Save,
  X,
  Check,
  Settings
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { EventDatePicker } from './EventDatePicker';
import { TimePicker } from './TimePicker';
import { format } from 'date-fns';
import { formatDisplayTime, formatDisplayDate } from '@/lib/utils';

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
}

// Format event date as DAY{ordinal}, Month YYYY (e.g., "20th, September 2025")
const formatEventDate = (date: string | null): string => {
  if (!date) return "No date";
  
  const d = new Date(date);
  const day = d.getDate();
  const suffix = (day % 10 === 1 && day !== 11) ? "st"
              : (day % 10 === 2 && day !== 12) ? "nd"
              : (day % 10 === 3 && day !== 13) ? "rd" : "th";
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
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
    const localDateString = serverDate.toLocaleDateString('en-GB', { // DD/MM/YYYY format
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean; event: any}>({
    isOpen: false,
    event: null
  });
  const [editForm, setEditForm] = useState<any>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newEventForm, setNewEventForm] = useState({
    name: '',
    date: null as Date | null,
    venue: '',
    start_time: '',
    finish_time: '',
    guest_limit: 50
  });
  const [isShaking, setIsShaking] = useState(false);
  const newRowRef = useRef<HTMLTableRowElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleEventSelect = (eventId: string) => {
    setActiveEventId(eventId);
    onEventSelect?.(eventId);
  };

  const handleEdit = (event: any) => {
    setEditingId(event.id);
    setEditForm({
      name: event.name,
      date: event.date ? new Date(event.date) : null,
      venue: event.venue || '',
      start_time: event.start_time || '',
      finish_time: event.finish_time || '',
      guest_limit: event.guest_limit
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    try {
      await updateEvent(editingId, {
        name: editForm.name,
        date: editForm.date ? format(editForm.date, 'yyyy-MM-dd') : null,
        venue: editForm.venue,
        start_time: editForm.start_time || null,
        finish_time: editForm.finish_time || null,
        guest_limit: editForm.guest_limit
      });
      setEditingId(null);
      setEditForm({});
      
      // Immediately set this event as active and notify parent
      setActiveEventId(editingId);
      onEventSelect?.(editingId);
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDeleteClick = (event: any) => {
    setDeleteModal({ isOpen: true, event });
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.event) {
      try {
        await deleteEvent(deleteModal.event.id);
        setDeleteModal({ isOpen: false, event: null });
        onEventDelete?.(deleteModal.event.id);
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    }
  };

  const handleCreateEvent = async () => {
    if (!newEventForm.name.trim()) return;
    
    try {
      const newEvent = await createEvent({
        name: newEventForm.name,
        date: newEventForm.date ? format(newEventForm.date, 'yyyy-MM-dd') : null,
        venue: newEventForm.venue,
        start_time: newEventForm.start_time || null,
        finish_time: newEventForm.finish_time || null,
        guest_limit: newEventForm.guest_limit
      });
      
      setIsCreating(false);
      setNewEventForm({
        name: '',
        date: null,
        venue: '',
        start_time: '',
        finish_time: '',
        guest_limit: 50
      });
      
      // Immediately set the new event as active and notify parent
      if (newEvent?.id) {
        setActiveEventId(newEvent.id);
        onEventSelect?.(newEvent.id);
      }
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleCancelCreate = () => {
    const hasChanges = newEventForm.name || 
                      newEventForm.date || 
                      newEventForm.venue || 
                      newEventForm.start_time || 
                      newEventForm.finish_time || 
                      newEventForm.guest_limit !== 50;

    if (hasChanges) {
      const confirmDiscard = window.confirm('Discard this new event?');
      if (!confirmDiscard) return;
    }

    setIsCreating(false);
    setNewEventForm({
      name: '',
      date: null,
      venue: '',
      start_time: '',
      finish_time: '',
      guest_limit: 50
    });
  };

  const handleCreateEventClick = () => {
    if (isCreating) {
      // Shake existing row if trying to create another
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      return;
    }
    setIsCreating(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newEventForm.name.trim()) {
      e.preventDefault();
      handleCreateEvent();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelCreate();
    }
  };

  // Auto-scroll and focus when new row is created
  useEffect(() => {
    if (isCreating && newRowRef.current && nameInputRef.current) {
      // Auto-scroll to new row
      newRowRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
      
      // Focus the name input after a short delay to ensure the row is rendered
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isCreating]);

  const isAtCapacity = (event: any) => {
    return event.guests_count >= event.guest_limit;
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <div>Loading events...</div>
      </Card>
    );
  }
  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-card-border bg-gradient-subtle">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">My Events</h3>
              <p className="text-sm text-muted-foreground">
                Create and manage your event
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="glass">
                {events.length} Event{events.length !== 1 ? 's' : ''}
              </Badge>
              <Button 
                variant="gradient" 
                size="sm"
                onClick={handleCreateEventClick}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <RadioGroup value={activeEventId || ''} onValueChange={handleEventSelect}>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 rounded-tl-lg">Countdown</TableHead>
                <TableHead className="w-32">Event Name</TableHead>
                <TableHead className="w-24">Event Date</TableHead>
                <TableHead className="w-28">Venue</TableHead>
                <TableHead className="w-20">Start Time</TableHead>
                <TableHead className="w-20">Finish Time</TableHead>
                <TableHead className="w-20">Guest Limit</TableHead>
                <TableHead className="w-24">Created Date:</TableHead>
                <TableHead className="w-24">Expiry Date:</TableHead>
                <TableHead className="w-20 rounded-tr-lg">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Create new event row */}
              {isCreating && (
                <TableRow 
                  ref={newRowRef}
                  className={`event-row--new ${isShaking ? 'shake' : ''}`}
                  onKeyDown={handleKeyDown}
                >
                  <TableCell className="w-20">
                    <span className="text-muted-foreground text-sm">-</span>
                  </TableCell>
                  <TableCell className="w-32">
                    <Input
                      ref={nameInputRef}
                      value={newEventForm.name}
                      onChange={(e) => setNewEventForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Event name"
                      className="min-w-[180px]"
                      onKeyDown={handleKeyDown}
                    />
                  </TableCell>
                  <TableCell className="w-24">
                    <EventDatePicker
                      value={newEventForm.date}
                      onChange={(date) => setNewEventForm(prev => ({ ...prev, date }))}
                      placeholder="Select date"
                    />
                  </TableCell>
                  <TableCell className="w-28">
                    <Input
                      value={newEventForm.venue}
                      onChange={(e) => setNewEventForm(prev => ({ ...prev, venue: e.target.value }))}
                      placeholder="Venue location"
                      className="min-w-[180px]"
                    />
                  </TableCell>
                  <TableCell className="w-20">
                    <TimePicker
                      value={newEventForm.start_time}
                      onChange={(time) => setNewEventForm(prev => ({ ...prev, start_time: time }))}
                      placeholder="Start time"
                    />
                  </TableCell>
                  <TableCell className="w-20">
                    <TimePicker
                      value={newEventForm.finish_time}
                      onChange={(time) => setNewEventForm(prev => ({ ...prev, finish_time: time }))}
                      placeholder="End time"
                    />
                  </TableCell>
                  <TableCell className="w-20">
                    <Input
                      type="number"
                      value={newEventForm.guest_limit}
                      onChange={(e) => setNewEventForm(prev => ({ ...prev, guest_limit: parseInt(e.target.value) || 50 }))}
                      className="w-20"
                      min="1"
                    />
                  </TableCell>
                  <TableCell className="w-24">
                    <span className="text-muted-foreground text-sm">Auto-generated</span>
                  </TableCell>
                  <TableCell className="w-24">
                    <span className="text-muted-foreground text-sm">Auto-generated</span>
                  </TableCell>
                  <TableCell className="w-20">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCreateEvent}
                        disabled={!newEventForm.name}
                        className="w-8 h-8 text-green-600 hover:text-green-700"
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancelCreate}
                        className="w-8 h-8 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Existing events */}
              {events.map((event) => {
                const isSelected = activeEventId === event.id;
                const isEditing = editingId === event.id;
                const atCapacity = isAtCapacity(event);

                return (
                  <TableRow 
                    key={event.id} 
                    className={`
                      border-card-border hover:bg-muted/30 transition-colors
                      ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''}
                      ${atCapacity ? 'bg-green-50 dark:bg-green-900/20' : ''}
                    `}
                  >
                    <TableCell className="text-center w-20">
                      <div className="flex items-center justify-center">
                        <RadioGroupItem 
                          value={event.id} 
                          id={`countdown-${event.id}`}
                          className="data-[state=checked]:border-primary data-[state=checked]:text-primary"
                          onClick={() => handleEventSelect(event.id)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium w-32">
                      {isEditing ? (
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="min-w-[180px]"
                        />
                      ) : (
                        <div className="flex items-center">
                          {event.name}
                          {atCapacity && (
                            <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                              At capacity
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="w-24">
                      {isEditing ? (
                        <EventDatePicker
                          value={editForm.date}
                          onChange={(date) => setEditForm(prev => ({ ...prev, date }))}
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {formatEventDate(event.date)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="w-28">
                      {isEditing ? (
                        <Input
                          value={editForm.venue}
                          onChange={(e) => setEditForm(prev => ({ ...prev, venue: e.target.value }))}
                          placeholder="Venue location"
                          className="min-w-[180px]"
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {event.venue || 'No venue set'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="w-20">
                      {isEditing ? (
                        <TimePicker
                          value={editForm.start_time}
                          onChange={(time) => setEditForm(prev => ({ ...prev, start_time: time }))}
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {formatDisplayTime(event.start_time)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="w-20">
                      {isEditing ? (
                        <TimePicker
                          value={editForm.finish_time}
                          onChange={(time) => setEditForm(prev => ({ ...prev, finish_time: time }))}
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {formatDisplayTime(event.finish_time)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="w-20">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editForm.guest_limit}
                          onChange={(e) => setEditForm(prev => ({ ...prev, guest_limit: parseInt(e.target.value) || 50 }))}
                          className="w-20"
                          min="1"
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-muted-foreground">
                            {event.guests_count}/{event.guest_limit}
                          </span>
                        </div>
                      )}
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
                      {isEditing ? (
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSaveEdit}
                            className="w-8 h-8 text-green-600 hover:text-green-700"
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelEdit}
                            className="w-8 h-8 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(event)}
                            className="w-8 h-8 text-muted-foreground hover:text-primary"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(event)}
                            className="w-8 h-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            </Table>
          </RadioGroup>
        </div>
      </Card>

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, event: null })}
        onConfirm={handleDeleteConfirm}
        eventName={deleteModal.event?.name || ''}
      />
    </>
  );
};