import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EventDatePicker } from './EventDatePicker';
import { TimePicker } from './TimePicker';
import { format } from 'date-fns';

interface Event {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
  start_time: string | null;
  finish_time: string | null;
  guest_limit: number;
  created_at: string;
  event_created: string | null;
  expiry_date: string | null;
  created_date_local: string | null;
  expiry_date_local: string | null;
  event_timezone: string | null;
  rsvp_deadline: string | null;
}

interface EventEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onSave: (id: string, eventData: any) => Promise<void>;
}

// Helper function to format local dates
const formatDisplayLocalDate = (localDate: string | null, fallbackDate: string | null, timezone?: string | null): string => {
  if (localDate) {
    const date = new Date(localDate + 'T00:00:00');
    return format(date, 'dd/MM/yyyy');
  }
  if (fallbackDate) {
    const serverDate = new Date(fallbackDate);
    const browserTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localDateString = serverDate.toLocaleDateString('en-GB', {
      timeZone: browserTimezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return localDateString;
  }
  return 'No date';
};

// Helper to calculate expiry date fallback
const getExpiryDateDisplay = (createdDate: string | null, expiryLocal: string | null, timezone?: string | null): string => {
  if (expiryLocal) {
    return formatDisplayLocalDate(expiryLocal, null);
  }
  if (!createdDate) return 'No date';
  const date = new Date(createdDate);
  const browserTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  date.setFullYear(date.getFullYear() + 1);
  const localDateString = date.toLocaleDateString('en-GB', {
    timeZone: browserTimezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  return localDateString;
};

export const EventEditModal: React.FC<EventEditModalProps> = ({
  isOpen,
  onClose,
  event,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    date: null as Date | null,
    venue: '',
    start_time: '',
    finish_time: '',
    guest_limit: 50,
    rsvp_deadline: null as Date | null
  });

  const [isSaving, setIsSaving] = useState(false);

  // Populate form when event changes
  useEffect(() => {
    if (event) {
      setFormData({
        name: event.name,
        date: event.date ? new Date(event.date) : null,
        venue: event.venue || '',
        start_time: event.start_time || '',
        finish_time: event.finish_time || '',
        guest_limit: event.guest_limit,
        rsvp_deadline: event.rsvp_deadline ? new Date(event.rsvp_deadline) : null
      });
    }
  }, [event]);

  const handleSave = async () => {
    if (!event || !formData.name.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(event.id, {
        name: formData.name,
        date: formData.date ? format(formData.date, 'yyyy-MM-dd') : null,
        venue: formData.venue,
        start_time: formData.start_time || null,
        finish_time: formData.finish_time || null,
        guest_limit: formData.guest_limit,
        rsvp_deadline: formData.rsvp_deadline ? formData.rsvp_deadline.toISOString() : null
      });
      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!event) return null;

  const createdDateDisplay = formatDisplayLocalDate(
    event.created_date_local,
    event.event_created || event.created_at,
    event.event_timezone
  );

  const expiryDateDisplay = getExpiryDateDisplay(
    event.event_created || event.created_at,
    event.expiry_date_local,
    event.event_timezone
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>My Events Edit</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Name */}
          <div className="space-y-2">
            <Label htmlFor="event-name">Event Name *</Label>
            <Input
              id="event-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter event name"
              autoFocus
            />
          </div>

          {/* Event Date */}
          <div className="space-y-2">
            <Label htmlFor="event-date">Event Date</Label>
            <EventDatePicker
              value={formData.date}
              onChange={(date) => setFormData(prev => ({ ...prev, date }))}
              placeholder="Select event date"
            />
          </div>

          {/* Venue */}
          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={formData.venue}
              onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
              placeholder="Enter venue location"
            />
          </div>

          {/* Time fields in a row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <TimePicker
                value={formData.start_time}
                onChange={(time) => setFormData(prev => ({ ...prev, start_time: time }))}
                placeholder="Select start time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finish-time">Finish Time</Label>
              <TimePicker
                value={formData.finish_time}
                onChange={(time) => setFormData(prev => ({ ...prev, finish_time: time }))}
                placeholder="Select finish time"
              />
            </div>
          </div>

          {/* Guest Limit */}
          <div className="space-y-2">
            <Label htmlFor="guest-limit">Guest Limit</Label>
            <Input
              id="guest-limit"
              type="number"
              value={formData.guest_limit}
              onChange={(e) => setFormData(prev => ({ ...prev, guest_limit: parseInt(e.target.value) || 50 }))}
              min="1"
            />
          </div>

          {/* RSVP Deadline */}
          <div className="space-y-2">
            <Label htmlFor="rsvp-deadline">RSVP Deadline</Label>
            <EventDatePicker
              value={formData.rsvp_deadline}
              onChange={(date) => setFormData(prev => ({ ...prev, rsvp_deadline: date }))}
              placeholder="Select RSVP deadline"
            />
          </div>

          {/* Read-only fields */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Created Date</Label>
              <div className="text-sm font-medium">{createdDateDisplay}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Expiry Date</Label>
              <div className="text-sm font-medium">{expiryDateDisplay}</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!formData.name.trim() || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
