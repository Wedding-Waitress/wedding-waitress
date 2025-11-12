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
  event_type?: 'seated' | 'cocktail';
}

interface EventEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onSave: (id: string, eventData: any) => Promise<void>;
}

export const EventEditModal: React.FC<EventEditModalProps> = ({
  isOpen,
  onClose,
  event,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    event_type: 'seated' as 'seated' | 'cocktail',
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
        event_type: (event.event_type as 'seated' | 'cocktail') || 'seated',
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
        event_type: formData.event_type,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col px-10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium text-[#7248e6]">Edit My Events</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          {/* Row 1: Event Type (Full Width) */}
          <div className="space-y-2">
            <Label>Event Type *</Label>
            <div className="flex items-center gap-1 bg-gray-100 border-2 border-gray-300 rounded-full p-1">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, event_type: 'seated' }))}
                className={`flex-1 px-4 py-2 rounded-full transition-all font-medium ${
                  formData.event_type === 'seated' 
                    ? 'bg-green-500 text-white shadow-md' 
                    : 'bg-transparent text-gray-500 hover:bg-gray-200'
                }`}
              >
                Seated Event
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, event_type: 'cocktail' }))}
                className={`flex-1 px-4 py-2 rounded-full transition-all font-medium ${
                  formData.event_type === 'cocktail' 
                    ? 'bg-green-500 text-white shadow-md' 
                    : 'bg-transparent text-gray-500 hover:bg-gray-200'
                }`}
              >
                Cocktail/Stand-up
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.event_type === 'seated' ? 'Guests will be assigned to tables with seats' : 'No table assignments needed - guests mingle freely'}
            </p>
          </div>

          {/* Row 2: Event Name & Event Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-name">Event Name *</Label>
              <Input
                id="event-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter event name"
                autoFocus
                className="rounded-full border-2 border-[#7248e6] focus-visible:border-[#7248e6] focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-date">Event Date</Label>
              <EventDatePicker
                value={formData.date}
                onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                placeholder="Select event date"
              />
            </div>
          </div>

          {/* Row 2: Venue & Guest Limit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                placeholder="Enter venue location"
                className="rounded-full border-2 border-[#7248e6] focus-visible:border-[#7248e6] focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-limit">Guest Limit</Label>
              <Input
                id="guest-limit"
                type="number"
                value={formData.guest_limit}
                onChange={(e) => setFormData(prev => ({ ...prev, guest_limit: parseInt(e.target.value) || 50 }))}
                min="1"
                className="rounded-full border-2 border-[#7248e6] focus-visible:border-[#7248e6] focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none"
              />
            </div>
          </div>

          {/* Row 3: Start Time & Finish Time */}
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

          {/* Row 4: RSVP Deadline */}
          <div className="space-y-2">
            <Label htmlFor="rsvp-deadline">RSVP Deadline</Label>
            <EventDatePicker
              value={formData.rsvp_deadline}
              onChange={(date) => setFormData(prev => ({ ...prev, rsvp_deadline: date }))}
              placeholder="Select RSVP deadline"
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="destructive" 
            size="xs" 
            className="rounded-full bg-red-600 hover:bg-red-700 text-white" 
            onClick={onClose} 
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            variant="default"
            size="xs"
            className="rounded-full bg-green-500 hover:bg-green-600 text-white"
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
