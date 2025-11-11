import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EventDatePicker } from './EventDatePicker';
import { TimePicker } from './TimePicker';
import { format } from 'date-fns';

interface EventCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (eventData: any) => Promise<any>;
}

export const EventCreateModal: React.FC<EventCreateModalProps> = ({
  isOpen,
  onClose,
  onCreate
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

  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      formData.date !== null &&
      formData.venue.trim() !== '' &&
      formData.start_time !== '' &&
      formData.finish_time !== '' &&
      formData.rsvp_deadline !== null
    );
  };

  const handleCreate = async () => {
    if (!isFormValid()) return;
    
    setIsSaving(true);
    try {
      await onCreate({
        name: formData.name,
        event_type: formData.event_type,
        date: formData.date ? format(formData.date, 'yyyy-MM-dd') : null,
        venue: formData.venue,
        start_time: formData.start_time || null,
        finish_time: formData.finish_time || null,
        guest_limit: formData.guest_limit,
        rsvp_deadline: formData.rsvp_deadline ? formData.rsvp_deadline.toISOString() : null
      });
      
      // Reset form
      setFormData({
        name: '',
        event_type: 'seated',
        date: null,
        venue: '',
        start_time: '',
        finish_time: '',
        guest_limit: 50,
        rsvp_deadline: null
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      name: '',
      event_type: 'seated',
      date: null,
      venue: '',
      start_time: '',
      finish_time: '',
      guest_limit: 50,
      rsvp_deadline: null
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col px-10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium text-[#7248e6]">Create Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          {/* Row 1: Event Type (Full Width) */}
          <div className="space-y-2">
            <Label>Event Type *</Label>
            <div className="flex items-center gap-1 bg-[#7248e6]/10 border-2 border-[#7248e6] rounded-full p-1">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, event_type: 'seated' }))}
                className={`flex-1 px-4 py-2 rounded-full transition-all ${formData.event_type === 'seated' ? 'bg-[#7248e6] text-white' : 'text-[#7248e6] hover:bg-[#7248e6]/5'}`}
              >
                Seated Event
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, event_type: 'cocktail' }))}
                className={`flex-1 px-4 py-2 rounded-full transition-all ${formData.event_type === 'cocktail' ? 'bg-[#7248e6] text-white' : 'text-[#7248e6] hover:bg-[#7248e6]/5'}`}
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
              <Label htmlFor="event-date">Event Date *</Label>
              <EventDatePicker
                value={formData.date}
                onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                placeholder="Select event date"
              />
            </div>
          </div>

          {/* Row 3: Venue & Guest Limit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venue">Venue *</Label>
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

          {/* Row 4: Start Time & Finish Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time *</Label>
              <TimePicker
                value={formData.start_time}
                onChange={(time) => setFormData(prev => ({ ...prev, start_time: time }))}
                placeholder="Select start time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finish-time">Finish Time *</Label>
              <TimePicker
                value={formData.finish_time}
                onChange={(time) => setFormData(prev => ({ ...prev, finish_time: time }))}
                placeholder="Select finish time"
              />
            </div>
          </div>

          {/* Row 5: RSVP Deadline */}
          <div className="space-y-2">
            <Label htmlFor="rsvp-deadline">RSVP Deadline *</Label>
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
            onClick={handleClose} 
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            variant="default"
            size="xs"
            className="rounded-full bg-green-500 hover:bg-green-600 text-white"
            onClick={handleCreate} 
            disabled={!isFormValid() || isSaving}
          >
            {isSaving ? 'Creating...' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};