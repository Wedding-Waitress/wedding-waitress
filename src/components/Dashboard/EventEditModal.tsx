/**
 * Event Editing Modal with Ceremony & Reception Sections
 * 
 * Two-section layout matching EventCreateModal:
 * - Ceremony section (toggle on/off)
 * - Reception section (toggle on/off)
 * 
 * At least one section must be enabled to save.
 * 3-column layout for compact display.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EventDatePicker } from './EventDatePicker';
import { TimePicker } from './TimePicker';
import { LocationDetailsPopover } from './LocationDetailsPopover';
import { format } from 'date-fns';

interface Event {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
  venue_address?: string | null;
  venue_phone?: string | null;
  venue_contact?: string | null;
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
  // Ceremony fields
  ceremony_enabled?: boolean;
  ceremony_name?: string | null;
  ceremony_date?: string | null;
  ceremony_venue?: string | null;
  ceremony_venue_address?: string | null;
  ceremony_venue_phone?: string | null;
  ceremony_venue_contact?: string | null;
  ceremony_guest_limit?: number | null;
  ceremony_start_time?: string | null;
  ceremony_finish_time?: string | null;
  ceremony_rsvp_deadline?: string | null;
  reception_enabled?: boolean;
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
    // Top-level event name
    event_name: '',
    
    // Ceremony fields
    ceremony_enabled: false,
    ceremony_name: '',
    ceremony_date: null as Date | null,
    ceremony_venue: '',
    ceremony_venue_address: '',
    ceremony_venue_phone: '',
    ceremony_venue_contact: '',
    ceremony_guest_limit: '' as string | number,
    ceremony_start_time: '',
    ceremony_finish_time: '',
    ceremony_rsvp_deadline: null as Date | null,
    
    // Reception fields
    reception_enabled: true,
    name: '',
    event_type: 'seated' as 'seated' | 'cocktail',
    date: null as Date | null,
    venue: '',
    venue_address: '',
    venue_phone: '',
    venue_contact: '',
    start_time: '',
    finish_time: '',
    guest_limit: '' as string | number,
    rsvp_deadline: null as Date | null
  });

  const [isSaving, setIsSaving] = useState(false);


  // Populate form when event changes
  useEffect(() => {
    if (event) {
      setFormData({
        // Top-level event name
        event_name: (event as any).event_display_name || event.name || '',
        
        // Ceremony fields
        ceremony_enabled: event.ceremony_enabled ?? false,
        ceremony_name: event.ceremony_name || '',
        ceremony_date: event.ceremony_date ? new Date(event.ceremony_date) : null,
        ceremony_venue: event.ceremony_venue || '',
        ceremony_venue_address: event.ceremony_venue_address || '',
        ceremony_venue_phone: event.ceremony_venue_phone || '',
        ceremony_venue_contact: event.ceremony_venue_contact || '',
        ceremony_guest_limit: event.ceremony_guest_limit ?? 10,
        ceremony_start_time: event.ceremony_start_time || '',
        ceremony_finish_time: event.ceremony_finish_time || '',
        ceremony_rsvp_deadline: event.ceremony_rsvp_deadline ? new Date(event.ceremony_rsvp_deadline) : null,
        
        // Reception fields
        reception_enabled: event.reception_enabled ?? true,
        name: event.name,
        event_type: (event.event_type as 'seated' | 'cocktail') || 'seated',
        date: event.date ? new Date(event.date) : null,
        venue: event.venue || '',
        venue_address: event.venue_address || '',
        venue_phone: event.venue_phone || '',
        venue_contact: event.venue_contact || '',
        start_time: event.start_time || '',
        finish_time: event.finish_time || '',
        guest_limit: event.guest_limit ?? 10,
        rsvp_deadline: event.rsvp_deadline ? new Date(event.rsvp_deadline) : null
      });
    }
  }, [event]);

  const isFormValid = useMemo(() => {
    // Event name is required
    if (!formData.event_name.trim()) {
      return false;
    }
    
    // At least one section must be enabled
    if (!formData.ceremony_enabled && !formData.reception_enabled) {
      return false;
    }
    
    // Validate ceremony fields if enabled
    if (formData.ceremony_enabled) {
      if (!formData.ceremony_name.trim() || 
          !formData.ceremony_date || 
          !formData.ceremony_venue.trim() ||
          !formData.ceremony_start_time ||
          !formData.ceremony_finish_time ||
          !formData.ceremony_rsvp_deadline) {
        return false;
      }
    }
    
    // Validate reception fields if enabled
    if (formData.reception_enabled) {
      if (!formData.name.trim() || 
          !formData.date || 
          !formData.venue.trim() ||
          !formData.start_time ||
          !formData.finish_time ||
          !formData.rsvp_deadline) {
        return false;
      }
    }
    
    return true;
  }, [formData]);

  const handleSave = async () => {
    if (!event || !isFormValid) return;
    
    setIsSaving(true);
    try {
      // Convert guest limits to numbers for database
      const ceremonyGuestLimit = formData.ceremony_guest_limit === '' ? 10 : Number(formData.ceremony_guest_limit);
      const receptionGuestLimit = formData.guest_limit === '' ? 10 : Number(formData.guest_limit);
      
      await onSave(event.id, {
        // Ceremony fields
        ceremony_enabled: formData.ceremony_enabled,
        ceremony_name: formData.ceremony_enabled ? formData.ceremony_name : null,
        ceremony_date: formData.ceremony_enabled && formData.ceremony_date 
          ? format(formData.ceremony_date, 'yyyy-MM-dd') : null,
        ceremony_venue: formData.ceremony_enabled ? formData.ceremony_venue : null,
        ceremony_venue_address: formData.ceremony_enabled ? formData.ceremony_venue_address : null,
        ceremony_venue_phone: formData.ceremony_enabled ? formData.ceremony_venue_phone : null,
        ceremony_venue_contact: formData.ceremony_enabled ? formData.ceremony_venue_contact : null,
        ceremony_guest_limit: formData.ceremony_enabled ? ceremonyGuestLimit : null,
        ceremony_start_time: formData.ceremony_enabled ? formData.ceremony_start_time : null,
        ceremony_finish_time: formData.ceremony_enabled ? formData.ceremony_finish_time : null,
        ceremony_rsvp_deadline: formData.ceremony_enabled && formData.ceremony_rsvp_deadline 
          ? format(formData.ceremony_rsvp_deadline, 'yyyy-MM-dd') : null,
        
        // Reception fields
        reception_enabled: formData.reception_enabled,
        name: formData.event_name, // Use top-level event name as main name
        event_type: formData.event_type,
        date: formData.reception_enabled && formData.date 
          ? format(formData.date, 'yyyy-MM-dd') 
          : (formData.ceremony_date ? format(formData.ceremony_date, 'yyyy-MM-dd') : null),
        venue: formData.reception_enabled ? formData.venue : null,
        venue_address: formData.reception_enabled ? formData.venue_address : null,
        venue_phone: formData.reception_enabled ? formData.venue_phone : null,
        venue_contact: formData.reception_enabled ? formData.venue_contact : null,
        start_time: formData.reception_enabled ? formData.start_time : null,
        finish_time: formData.reception_enabled ? formData.finish_time : null,
        guest_limit: formData.reception_enabled ? receptionGuestLimit : ceremonyGuestLimit,
        rsvp_deadline: formData.reception_enabled && formData.rsvp_deadline 
          ? formData.rsvp_deadline.toISOString() : null
      });
      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle guest limit input - allow empty string and typing
  const handleGuestLimitChange = (value: string, field: 'ceremony_guest_limit' | 'guest_limit') => {
    if (value === '') {
      setFormData(prev => ({ ...prev, [field]: '' }));
    } else {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        setFormData(prev => ({ ...prev, [field]: parsed }));
      }
    }
  };

  if (!event) return null;

  const inputClass = useMemo(() => 
    "rounded-full border-2 border-primary focus-visible:border-primary focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9 text-sm"
  , []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col px-8">
        <DialogHeader className="flex flex-row items-center gap-4">
          <DialogTitle className="text-2xl font-medium text-primary whitespace-nowrap">Edit Event</DialogTitle>
          <div className="flex-1">
            <Input
              value={formData.event_name}
              onChange={(e) => setFormData(prev => ({ ...prev, event_name: e.target.value }))}
              placeholder="e.g., Jason & Linda's Wedding"
              className={inputClass}
            />
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3 overflow-y-auto flex-1">
          {/* Validation Message */}
          {!formData.ceremony_enabled && !formData.reception_enabled && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              Please enable at least one section (Ceremony or Reception) to save.
            </div>
          )}

          {/* ========== CEREMONY SECTION ========== */}
          <div className="border-2 border-border rounded-xl overflow-hidden">
            {/* Ceremony Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
              <h3 className="text-lg font-semibold text-foreground">Ceremony</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {formData.ceremony_enabled ? 'Yes' : 'No'}
                </span>
                <Switch
                  checked={formData.ceremony_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ceremony_enabled: checked }))}
                />
              </div>
            </div>

            {/* Ceremony Content - controlled by toggle */}
            {formData.ceremony_enabled ? (
              <div className="p-4 space-y-4">
                {/* Row 1: Name, Date, RSVP Deadline */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ceremony Name *</Label>
                    <Input
                      value={formData.ceremony_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, ceremony_name: e.target.value }))}
                      placeholder="e.g., Bride & Groom's Name"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ceremony Date *</Label>
                    <EventDatePicker
                      value={formData.ceremony_date}
                      onChange={(date) => setFormData(prev => ({ ...prev, ceremony_date: date }))}
                      placeholder="Select date"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">RSVP Deadline *</Label>
                    <EventDatePicker
                      value={formData.ceremony_rsvp_deadline}
                      onChange={(date) => setFormData(prev => ({ ...prev, ceremony_rsvp_deadline: date }))}
                      placeholder="Select deadline"
                    />
                  </div>
                </div>

                {/* Row 2: Guest Limit, Location, Location Details */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Guest Limit</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.ceremony_guest_limit}
                      onChange={(e) => handleGuestLimitChange(e.target.value, 'ceremony_guest_limit')}
                      placeholder="10"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Location *</Label>
                    <Input
                      value={formData.ceremony_venue}
                      onChange={(e) => setFormData(prev => ({ ...prev, ceremony_venue: e.target.value }))}
                      placeholder="e.g., Church/Venue"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Location Details</Label>
                    <LocationDetailsPopover
                      address={formData.ceremony_venue_address}
                      phone={formData.ceremony_venue_phone}
                      contact={formData.ceremony_venue_contact}
                      onSave={({ address, phone, contact }) =>
                        setFormData((prev) => ({
                          ...prev,
                          ceremony_venue_address: address,
                          ceremony_venue_phone: phone,
                          ceremony_venue_contact: contact,
                        }))
                      }
                      inputClass={inputClass}
                    />
                  </div>
                </div>

                {/* Row 3: Start Time, Finish Time */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Time *</Label>
                    <TimePicker
                      value={formData.ceremony_start_time}
                      onChange={(time) => setFormData(prev => ({ ...prev, ceremony_start_time: time }))}
                      placeholder="Select time"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Finish Time *</Label>
                    <TimePicker
                      value={formData.ceremony_finish_time}
                      onChange={(time) => setFormData(prev => ({ ...prev, ceremony_finish_time: time }))}
                      placeholder="Select time"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Toggle on to add ceremony details
              </div>
            )}
          </div>

          {/* ========== RECEPTION SECTION ========== */}
          <div className="border-2 border-border rounded-xl overflow-hidden">
            {/* Reception Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
              <h3 className="text-lg font-semibold text-foreground">Reception</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {formData.reception_enabled ? 'Yes' : 'No'}
                </span>
                <Switch
                  checked={formData.reception_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reception_enabled: checked }))}
                />
              </div>
            </div>

            {/* Reception Content - controlled by toggle */}
            {formData.reception_enabled ? (
              <div className="p-4 space-y-4">
                {/* Event Type Toggle - Smaller */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Event Type *</Label>
                  <div className="flex items-center gap-1 bg-muted border border-border rounded-full p-0.5 w-fit">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, event_type: 'seated' }))}
                      className={`px-3 py-1 rounded-full transition-all text-xs font-medium ${
                        formData.event_type === 'seated' 
                          ? 'bg-green-500 text-white shadow-sm' 
                          : 'bg-transparent text-muted-foreground hover:bg-muted-foreground/10'
                      }`}
                    >
                      Seated Event
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, event_type: 'cocktail' }))}
                      className={`px-3 py-1 rounded-full transition-all text-xs font-medium ${
                        formData.event_type === 'cocktail' 
                          ? 'bg-green-500 text-white shadow-sm' 
                          : 'bg-transparent text-muted-foreground hover:bg-muted-foreground/10'
                      }`}
                    >
                      Cocktail/Stand-up
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formData.event_type === 'seated' 
                      ? 'Guests will be assigned to tables and seats' 
                      : 'No table assignments - guests mingle freely'}
                  </p>
                </div>

                {/* Row 1: Name, Date, RSVP Deadline */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Event Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Bride & Groom's Name"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Event Date *</Label>
                    <EventDatePicker
                      value={formData.date}
                      onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                      placeholder="Select date"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">RSVP Deadline *</Label>
                    <EventDatePicker
                      value={formData.rsvp_deadline}
                      onChange={(date) => setFormData(prev => ({ ...prev, rsvp_deadline: date }))}
                      placeholder="Select deadline"
                    />
                  </div>
                </div>

                {/* Row 2: Guest Limit, Venue, Location Details */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Guest Limit</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.guest_limit}
                      onChange={(e) => handleGuestLimitChange(e.target.value, 'guest_limit')}
                      placeholder="10"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Venue *</Label>
                    <Input
                      value={formData.venue}
                      onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                      placeholder="e.g., Grand Ballroom"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Location Details</Label>
                    <LocationDetailsPopover
                      address={formData.venue_address}
                      phone={formData.venue_phone}
                      contact={formData.venue_contact}
                      onSave={({ address, phone, contact }) =>
                        setFormData((prev) => ({
                          ...prev,
                          venue_address: address,
                          venue_phone: phone,
                          venue_contact: contact,
                        }))
                      }
                      inputClass={inputClass}
                    />
                  </div>
                </div>

                {/* Row 3: Start Time, Finish Time */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Time *</Label>
                    <TimePicker
                      value={formData.start_time}
                      onChange={(time) => setFormData(prev => ({ ...prev, start_time: time }))}
                      placeholder="Select time"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Finish Time *</Label>
                    <TimePicker
                      value={formData.finish_time}
                      onChange={(time) => setFormData(prev => ({ ...prev, finish_time: time }))}
                      placeholder="Select time"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Toggle on to add reception details
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button 
            variant="destructive" 
            size="sm" 
            className="rounded-full" 
            onClick={onClose} 
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            variant="default"
            size="sm"
            className="rounded-full bg-green-500 hover:bg-green-600 text-white"
            onClick={handleSave} 
            disabled={!isFormValid || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
