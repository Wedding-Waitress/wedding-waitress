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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EventDatePicker } from './EventDatePicker';
import { TimePicker } from './TimePicker';
import { LocationDetailsPopover } from './LocationDetailsPopover';
import { EventNameCombobox } from './EventNameCombobox';
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
  const [receptionOverrides, setReceptionOverrides] = useState<Set<string>>(new Set());

  const markReceptionOverride = (field: string) => {
    setReceptionOverrides(prev => new Set(prev).add(field));
  };

  // Auto-sync ceremony fields to reception fields (matching Create Modal pattern)
  useEffect(() => {
    if (!formData.reception_enabled || !formData.ceremony_enabled) return;

    setFormData(prev => {
      const updates: Partial<typeof prev> = {};
      const syncMap: Record<string, string> = {
        ceremony_name: 'name',
        ceremony_date: 'date',
        ceremony_rsvp_deadline: 'rsvp_deadline',
        ceremony_guest_limit: 'guest_limit',
        ceremony_venue: 'venue',
        ceremony_venue_address: 'venue_address',
        ceremony_venue_phone: 'venue_phone',
        ceremony_venue_contact: 'venue_contact',
      };
      for (const [srcKey, destKey] of Object.entries(syncMap)) {
        if (!receptionOverrides.has(destKey)) {
          (updates as any)[destKey] = (prev as any)[srcKey];
        }
      }
      // Also sync event_name from ceremony_name unless overridden
      if (!receptionOverrides.has('event_name')) {
        updates.event_name = prev.ceremony_name;
      }
      return { ...prev, ...updates };
    });
  }, [
    formData.ceremony_enabled, formData.reception_enabled,
    formData.ceremony_name, formData.ceremony_date,
    formData.ceremony_venue, formData.ceremony_venue_address,
    formData.ceremony_venue_phone, formData.ceremony_venue_contact,
    formData.ceremony_guest_limit, formData.ceremony_rsvp_deadline,
    receptionOverrides
  ]);

  // Helper to get dynamic border class based on field value
  const getInputClass = useCallback((hasValue: boolean) => {
    const baseClass = "rounded-full border-2 focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9 text-sm";
    return hasValue 
      ? `${baseClass} border-green-500 focus-visible:border-green-500`
      : `${baseClass} border-primary focus-visible:border-primary`;
  }, []);

  // Populate form when event changes
  useEffect(() => {
    if (event) {
      setReceptionOverrides(new Set());
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
        event_display_name: formData.event_name,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col px-4 sm:px-8 max-lg:pt-6" fullScreenOnMobile>
        <DialogHeader className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 max-lg:text-center">
          <DialogTitle className="text-xl sm:text-2xl font-medium text-primary whitespace-nowrap max-lg:text-center max-lg:mt-2">Edit Event</DialogTitle>
          <div className="flex-1 lg:max-w-[75%] w-full">
            <Input
              value={formData.event_name}
              onChange={(e) => { markReceptionOverride('event_name'); setFormData(prev => ({ ...prev, event_name: e.target.value })); }}
              placeholder="Add the name of your event - e.g., Jason & Linda's Wedding"
              className={`${getInputClass(!!formData.event_name.trim())} h-11 sm:h-9 max-lg:text-center`}
            />
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3 overflow-y-auto flex-1 mobile-scroll-container">
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
                  className="hidden lg:inline-flex"
                  checked={formData.ceremony_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ceremony_enabled: checked }))}
                />
                <button
                  type="button"
                  aria-label="Toggle ceremony"
                  onClick={() => setFormData(prev => ({ ...prev, ceremony_enabled: !prev.ceremony_enabled }))}
                  className={`lg:hidden w-12 h-6 rounded-full flex items-center px-[2px] transition-all duration-200 ${formData.ceremony_enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all ${formData.ceremony_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Ceremony Content - controlled by toggle */}
            {formData.ceremony_enabled ? (
              <div className="p-4 space-y-4">
                {/* Row 1: Name, Date, RSVP Deadline */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ceremony Name *</Label>
                    <EventNameCombobox
                      mainEventName={formData.event_name}
                      value={formData.ceremony_name}
                      onChange={(name) => setFormData(prev => ({ ...prev, ceremony_name: name }))}
                      placeholder="e.g., Bride & Groom's Name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ceremony Date *</Label>
                    <EventDatePicker
                      value={formData.ceremony_date}
                      onChange={(date) => setFormData(prev => ({ ...prev, ceremony_date: date }))}
                      placeholder="Select date"
                      filled={!!formData.ceremony_date}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">RSVP Deadline *</Label>
                    <EventDatePicker
                      value={formData.ceremony_rsvp_deadline}
                      onChange={(date) => setFormData(prev => ({ ...prev, ceremony_rsvp_deadline: date }))}
                      placeholder="Select deadline"
                      filled={!!formData.ceremony_rsvp_deadline}
                    />
                  </div>
                </div>

                {/* Row 2: Guest Limit, Location, Location Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Guest Limit</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.ceremony_guest_limit}
                      onChange={(e) => handleGuestLimitChange(e.target.value, 'ceremony_guest_limit')}
                      placeholder="10"
                      className={getInputClass(formData.ceremony_guest_limit !== '')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Location Name *</Label>
                    <Input
                      value={formData.ceremony_venue}
                      onChange={(e) => setFormData(prev => ({ ...prev, ceremony_venue: e.target.value }))}
                      placeholder="e.g., Church/Venue"
                      className={getInputClass(!!formData.ceremony_venue.trim())}
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
                    />
                  </div>
                </div>

                {/* Row 3: Start Time, Finish Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Time *</Label>
                    <TimePicker
                      value={formData.ceremony_start_time}
                      onChange={(time) => setFormData(prev => ({ ...prev, ceremony_start_time: time }))}
                      placeholder="Select time"
                      filled={!!formData.ceremony_start_time}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Finish Time *</Label>
                    <TimePicker
                      value={formData.ceremony_finish_time}
                      onChange={(time) => setFormData(prev => ({ ...prev, ceremony_finish_time: time }))}
                      placeholder="Select time"
                      filled={!!formData.ceremony_finish_time}
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
                  className="hidden lg:inline-flex"
                  checked={formData.reception_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reception_enabled: checked }))}
                />
                <button
                  type="button"
                  aria-label="Toggle reception"
                  onClick={() => setFormData(prev => ({ ...prev, reception_enabled: !prev.reception_enabled }))}
                  className={`lg:hidden w-12 h-6 rounded-full flex items-center px-[2px] transition-all duration-200 ${formData.reception_enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all ${formData.reception_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Reception Content - controlled by toggle */}
            {formData.reception_enabled ? (
              <div className="p-4 space-y-4">
                {/* Event Type Toggle - Smaller */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Event Type *</Label>
                  <div className="hidden lg:flex items-center gap-1 bg-muted border border-border rounded-full p-0.5 w-fit">
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
                  {/* Mobile: side-by-side wide buttons */}
                  <div className="lg:hidden grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, event_type: 'seated' }))}
                      className={`w-full h-11 rounded-full text-sm font-medium transition-all ${
                        formData.event_type === 'seated'
                          ? 'bg-green-500 text-white border-2 border-green-500'
                          : 'bg-secondary text-primary border-2 border-primary'
                      }`}
                    >
                      Seated Event
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, event_type: 'cocktail' }))}
                      className={`w-full h-11 rounded-full text-sm font-medium transition-all ${
                        formData.event_type === 'cocktail'
                          ? 'bg-green-500 text-white border-2 border-green-500'
                          : 'bg-secondary text-primary border-2 border-primary'
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Event Name *</Label>
                    <EventNameCombobox
                      mainEventName={formData.event_name}
                      value={formData.name}
                      onChange={(name) => { markReceptionOverride('name'); setFormData(prev => ({ ...prev, name })); }}
                      placeholder="e.g., Bride & Groom's Name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Event Date *</Label>
                    <EventDatePicker
                      value={formData.date}
                      onChange={(date) => { markReceptionOverride('date'); setFormData(prev => ({ ...prev, date })); }}
                      placeholder="Select date"
                      filled={!!formData.date}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">RSVP Deadline *</Label>
                    <EventDatePicker
                      value={formData.rsvp_deadline}
                      onChange={(date) => { markReceptionOverride('rsvp_deadline'); setFormData(prev => ({ ...prev, rsvp_deadline: date })); }}
                      placeholder="Select deadline"
                      filled={!!formData.rsvp_deadline}
                    />
                  </div>
                </div>

                {/* Row 2: Guest Limit, Location, Location Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Guest Limit</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.guest_limit}
                      onChange={(e) => { markReceptionOverride('guest_limit'); handleGuestLimitChange(e.target.value, 'guest_limit'); }}
                      placeholder="10"
                      className={getInputClass(formData.guest_limit !== '')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Location/Venue *</Label>
                    <Input
                      value={formData.venue}
                      onChange={(e) => { markReceptionOverride('venue'); setFormData(prev => ({ ...prev, venue: e.target.value })); }}
                      placeholder="e.g., Reception Venue"
                      className={getInputClass(!!formData.venue.trim())}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Location/Venue Details</Label>
                    <LocationDetailsPopover
                      address={formData.venue_address}
                      phone={formData.venue_phone}
                      contact={formData.venue_contact}
                      onSave={({ address, phone, contact }) => {
                        markReceptionOverride('venue_address');
                        markReceptionOverride('venue_phone');
                        markReceptionOverride('venue_contact');
                        setFormData((prev) => ({
                          ...prev,
                          venue_address: address,
                          venue_phone: phone,
                          venue_contact: contact,
                        }));
                      }}
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
                      filled={!!formData.start_time}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Finish Time *</Label>
                    <TimePicker
                      value={formData.finish_time}
                      onChange={(time) => setFormData(prev => ({ ...prev, finish_time: time }))}
                      placeholder="Select time"
                      filled={!!formData.finish_time}
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

        <DialogFooter className="pt-2 border-t">
          <Button 
            variant="destructive" 
            onClick={onClose}
            className="rounded-full bg-red-500 hover:bg-red-600 text-white"
          >
            Cancel
          </Button>
          <Button 
            variant="default"
            onClick={handleSave}
            disabled={!isFormValid || isSaving}
            className="rounded-full bg-green-500 hover:bg-green-600 text-white"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
