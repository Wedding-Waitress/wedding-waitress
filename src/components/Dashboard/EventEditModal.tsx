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
import ReactDOM from 'react-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X, Save, Trash2 } from "lucide-react";
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
  ceremony_venue_contact_email?: string | null;
  venue_contact_email?: string | null;
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
    ceremony_venue_contact_email: '',
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
    venue_contact_email: '',
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

  // Mobile keyboard awareness: scroll focused input into view above the iOS keyboard
  useEffect(() => {
    if (!isOpen) return;
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
        setTimeout(() => t.scrollIntoView({ block: "center", behavior: "smooth" }), 150);
      }
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, [isOpen]);

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
        ceremony_venue_contact_email: 'venue_contact_email',
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
  // Mobile (max-lg): always brown for visual consistency.
  // Desktop/tablet (lg+): green when filled, brown when empty.
  const getInputClass = useCallback((hasValue: boolean) => {
    const baseClass = "rounded-full border-2 focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9 text-sm border-primary focus-visible:border-primary";
    return hasValue
      ? `${baseClass} lg:border-green-500 lg:focus-visible:border-green-500`
      : baseClass;
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
        ceremony_venue_contact_email: event.ceremony_venue_contact_email || '',
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
        venue_contact_email: event.venue_contact_email || '',
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
        ceremony_venue_contact_email: formData.ceremony_enabled ? (formData.ceremony_venue_contact_email || null) : null,
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
        venue_contact_email: formData.reception_enabled ? (formData.venue_contact_email || null) : null,
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

  // Track mobile viewport - on mobile we bypass Radix Dialog entirely
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isMobile && isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isMobile, isOpen]);

  if (!event) return null;

  const bodyContent = (
    <>
      {!formData.ceremony_enabled && !formData.reception_enabled && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive max-lg:mb-4 text-center">
          Please enable at least one section (Ceremony or Reception) to save.
        </div>
      )}
      {/* CEREMONY */}
      <div className="border-2 border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
          <h3 className="text-lg font-semibold text-foreground">Ceremony</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{formData.ceremony_enabled ? 'Yes' : 'No'}</span>
            <Switch className="hidden lg:inline-flex" checked={formData.ceremony_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ceremony_enabled: checked }))} />
            <button type="button" aria-label="Toggle ceremony"
              onClick={() => setFormData(prev => ({ ...prev, ceremony_enabled: !prev.ceremony_enabled }))}
              className={`lg:hidden w-12 h-6 rounded-full flex items-center px-[2px] transition-all duration-200 ${formData.ceremony_enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all ${formData.ceremony_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
        {formData.ceremony_enabled ? (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ceremony Name *</Label>
                <EventNameCombobox mainEventName={formData.event_name} value={formData.ceremony_name}
                  onChange={(name) => setFormData(prev => ({ ...prev, ceremony_name: name }))} placeholder="e.g., Bride & Groom's Name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ceremony Date *</Label>
                <EventDatePicker value={formData.ceremony_date} onChange={(date) => setFormData(prev => ({ ...prev, ceremony_date: date }))} placeholder="Select date" filled={!!formData.ceremony_date} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">RSVP Deadline *</Label>
                <EventDatePicker value={formData.ceremony_rsvp_deadline} onChange={(date) => setFormData(prev => ({ ...prev, ceremony_rsvp_deadline: date }))} placeholder="Select deadline" filled={!!formData.ceremony_rsvp_deadline} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Guest Limit</Label>
                <Input type="number" min="0" value={formData.ceremony_guest_limit}
                  onChange={(e) => handleGuestLimitChange(e.target.value, 'ceremony_guest_limit')}
                  placeholder="10" className={getInputClass(formData.ceremony_guest_limit !== '')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location Name *</Label>
                <Input value={formData.ceremony_venue} onChange={(e) => setFormData(prev => ({ ...prev, ceremony_venue: e.target.value }))}
                  placeholder="e.g., Church/Venue" className={getInputClass(!!formData.ceremony_venue.trim())} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location Details</Label>
                <LocationDetailsPopover address={formData.ceremony_venue_address} phone={formData.ceremony_venue_phone} contact={formData.ceremony_venue_contact} email={formData.ceremony_venue_contact_email}
                  onSave={({ address, phone, contact, email }) => setFormData((prev) => ({ ...prev, ceremony_venue_address: address, ceremony_venue_phone: phone, ceremony_venue_contact: contact, ceremony_venue_contact_email: email ?? '' }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start Time *</Label>
                <TimePicker value={formData.ceremony_start_time} onChange={(time) => setFormData(prev => ({ ...prev, ceremony_start_time: time }))} placeholder="Select time" filled={!!formData.ceremony_start_time} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Finish Time *</Label>
                <TimePicker value={formData.ceremony_finish_time} onChange={(time) => setFormData(prev => ({ ...prev, ceremony_finish_time: time }))} placeholder="Select time" filled={!!formData.ceremony_finish_time} />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">Toggle on to add ceremony details</div>
        )}
      </div>
      {/* RECEPTION */}
      <div className="border-2 border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
          <h3 className="text-lg font-semibold text-foreground">Reception</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{formData.reception_enabled ? 'Yes' : 'No'}</span>
            <Switch className="hidden lg:inline-flex" checked={formData.reception_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reception_enabled: checked }))} />
            <button type="button" aria-label="Toggle reception"
              onClick={() => setFormData(prev => ({ ...prev, reception_enabled: !prev.reception_enabled }))}
              className={`lg:hidden w-12 h-6 rounded-full flex items-center px-[2px] transition-all duration-200 ${formData.reception_enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all ${formData.reception_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
        {formData.reception_enabled ? (
          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Event Type *</Label>
              <div className="hidden lg:flex items-center gap-1 bg-muted border border-border rounded-full p-0.5 w-fit">
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, event_type: 'seated' }))}
                  className={`lv-premium-shade px-3 py-1 rounded-full transition-all text-xs font-medium ${formData.event_type === 'seated' ? 'bg-green-500 text-white shadow-sm' : 'bg-transparent text-muted-foreground hover:bg-muted-foreground/10'}`}>Seated Event</button>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, event_type: 'cocktail' }))}
                  className={`lv-premium-shade px-3 py-1 rounded-full transition-all text-xs font-medium ${formData.event_type === 'cocktail' ? 'bg-green-500 text-white shadow-sm' : 'bg-transparent text-muted-foreground hover:bg-muted-foreground/10'}`}>Cocktail/Stand-up</button>
              </div>
              <div className="lg:hidden grid grid-cols-2 gap-2 mt-1">
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, event_type: 'seated' }))}
                  className={`lv-premium-shade w-full h-11 rounded-full text-sm font-medium transition-all ${formData.event_type === 'seated' ? 'bg-green-500 text-white border-2 border-green-500' : 'bg-secondary text-primary border-2 border-primary'}`}>Seated Event</button>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, event_type: 'cocktail' }))}
                  className={`lv-premium-shade w-full h-11 rounded-full text-sm font-medium transition-all ${formData.event_type === 'cocktail' ? 'bg-green-500 text-white border-2 border-green-500' : 'bg-secondary text-primary border-2 border-primary'}`}>Cocktail/Stand-up</button>
              </div>
              <p className="text-xs text-muted-foreground">{formData.event_type === 'seated' ? 'Guests will be assigned to tables and seats' : 'No table assignments - guests mingle freely'}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Event Name *</Label>
                <EventNameCombobox mainEventName={formData.event_name} value={formData.name}
                  onChange={(name) => { markReceptionOverride('name'); setFormData(prev => ({ ...prev, name })); }} placeholder="e.g., Bride & Groom's Name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Event Date *</Label>
                <EventDatePicker value={formData.date} onChange={(date) => { markReceptionOverride('date'); setFormData(prev => ({ ...prev, date })); }} placeholder="Select date" filled={!!formData.date} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">RSVP Deadline *</Label>
                <EventDatePicker value={formData.rsvp_deadline} onChange={(date) => { markReceptionOverride('rsvp_deadline'); setFormData(prev => ({ ...prev, rsvp_deadline: date })); }} placeholder="Select deadline" filled={!!formData.rsvp_deadline} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Guest Limit</Label>
                <Input type="number" min="0" value={formData.guest_limit}
                  onChange={(e) => { markReceptionOverride('guest_limit'); handleGuestLimitChange(e.target.value, 'guest_limit'); }}
                  placeholder="10" className={getInputClass(formData.guest_limit !== '')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location/Venue *</Label>
                <Input value={formData.venue}
                  onChange={(e) => { markReceptionOverride('venue'); setFormData(prev => ({ ...prev, venue: e.target.value })); }}
                  placeholder="e.g., Reception Venue" className={getInputClass(!!formData.venue.trim())} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location/Venue Details</Label>
                <LocationDetailsPopover address={formData.venue_address} phone={formData.venue_phone} contact={formData.venue_contact} email={formData.venue_contact_email}
                  onSave={({ address, phone, contact, email }) => { markReceptionOverride('venue_address'); markReceptionOverride('venue_phone'); markReceptionOverride('venue_contact'); markReceptionOverride('venue_contact_email'); setFormData((prev) => ({ ...prev, venue_address: address, venue_phone: phone, venue_contact: contact, venue_contact_email: email ?? '' })); }} />
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start Time *</Label>
                <TimePicker value={formData.start_time} onChange={(time) => setFormData(prev => ({ ...prev, start_time: time }))} placeholder="Select time" filled={!!formData.start_time} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Finish Time *</Label>
                <TimePicker value={formData.finish_time} onChange={(time) => setFormData(prev => ({ ...prev, finish_time: time }))} placeholder="Select time" filled={!!formData.finish_time} />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">Toggle on to add reception details</div>
        )}
      </div>
    </>
  );

  const renderHeader = () => (
    <SheetHeader className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 items-center max-lg:pt-8 max-lg:gap-5 lg:pr-12 px-6 pt-6">
      <SheetTitle className="text-xl lg:text-2xl font-medium text-primary whitespace-nowrap w-full lg:w-auto">Edit Event</SheetTitle>
      <div className="flex-1 w-full max-w-full lg:max-w-[75%] max-lg:px-3">
        <Input
          value={formData.event_name}
          onChange={(e) => { markReceptionOverride('event_name'); setFormData(prev => ({ ...prev, event_name: e.target.value })); }}
          placeholder="Add the name of your event - e.g., Jason & Linda's Wedding"
          className="h-11 sm:h-9 text-base sm:text-sm border-2 border-primary focus-visible:border-primary focus-visible:ring-0 w-full px-4 truncate rounded-full"
        />
      </div>
    </SheetHeader>
  );

  if (isMobile) {
    if (!isOpen) return null;
    return ReactDOM.createPortal(
      <div role="dialog" aria-modal="true" className="ww-create-event-panel" style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        width: '100%', height: '100dvh', zIndex: 9999,
        background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <button type="button" onClick={onClose} aria-label="Close" style={{
          position: 'absolute', right: 12, top: 12, zIndex: 1,
          width: 40, height: 40, borderRadius: 9999,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'white', border: '2px solid hsl(var(--primary))',
        }}>
          <X className="h-4 w-4 text-primary" strokeWidth={2.5} />
        </button>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div className="flex flex-col gap-3 items-center pt-8 gap-5 pr-12">
            <h2 className="text-xl font-medium text-primary whitespace-nowrap w-full text-center">Edit Event</h2>
            <div className="flex-1 w-full max-w-full px-3">
              <Input
                value={formData.event_name}
                onChange={(e) => { markReceptionOverride('event_name'); setFormData(prev => ({ ...prev, event_name: e.target.value })); }}
                placeholder="Add the name of your event - e.g., Jason & Linda's Wedding"
                className="h-11 text-base border-2 border-primary focus-visible:border-primary focus-visible:ring-0 w-full px-4 truncate rounded-full"
              />
            </div>
          </div>
          <div className="space-y-4 py-3">
            {bodyContent}
          </div>
        </div>
        <div style={{
          position: 'sticky', bottom: 0,
          padding: '16px 16px max(16px, env(safe-area-inset-bottom))',
          background: 'white', borderTop: '1px solid #eee',
          display: 'flex', gap: 12,
        }}>
          <Button onClick={handleSave} disabled={!isFormValid || isSaving}
            className="lv-premium-shade flex-1 h-11 rounded-full bg-green-500 hover:bg-green-600 text-white">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="destructive" onClick={onClose}
            className="lv-premium-shade flex-1 h-11 rounded-full">
            Cancel
          </Button>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="ww-create-event-panel w-full sm:max-w-3xl p-0 flex flex-col overflow-hidden"
      >
        <SheetHeader className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 items-center max-lg:pt-8 max-lg:gap-5 lg:pr-12 px-6 pt-6">
          <SheetTitle className="text-xl lg:text-2xl font-medium text-primary whitespace-nowrap w-full lg:w-auto">Edit Event</SheetTitle>
          <div className="flex-1 w-full max-w-full lg:max-w-[75%] max-lg:px-3">
            <Input
              value={formData.event_name}
              onChange={(e) => { markReceptionOverride('event_name'); setFormData(prev => ({ ...prev, event_name: e.target.value })); }}
              placeholder="Add the name of your event - e.g., Jason & Linda's Wedding"
              className="h-11 sm:h-9 text-base sm:text-sm border-2 border-primary focus-visible:border-primary focus-visible:ring-0 w-full px-4 truncate rounded-full"
            />
          </div>
        </SheetHeader>

        <div className="space-y-4 py-3 px-6 overflow-y-auto flex-1 mobile-scroll-container">
          {bodyContent}
        </div>

        <div className="flex flex-row justify-end gap-2 pt-2 px-6 pb-4 border-t max-lg:grid max-lg:grid-cols-2 max-lg:gap-3 max-lg:px-4 max-lg:pb-2 max-md:sticky max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:bg-background max-md:pt-3 max-md:pb-[max(16px,env(safe-area-inset-bottom))]">
          <Button
            variant="default"
            onClick={handleSave}
            disabled={!isFormValid || isSaving}
            className="lv-premium-shade rounded-full bg-green-500 hover:bg-green-600 text-white inline-flex items-center justify-center lg:h-12 lg:px-8 lg:text-base lg:font-semibold max-lg:order-1 max-lg:w-full max-lg:h-11"
          >
            <Save className="hidden lg:inline-block w-5 h-5 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            variant="destructive"
            onClick={onClose}
            className="lv-premium-shade rounded-full bg-red-500 hover:bg-red-600 text-white inline-flex items-center justify-center lg:h-12 lg:px-8 lg:text-base lg:font-semibold max-lg:order-2 max-lg:w-full max-lg:h-11"
          >
            <Trash2 className="hidden lg:inline-block w-5 h-5 mr-2" />
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
