/**
 * Event Creation Modal with Ceremony & Reception Sections
 * 
 * Two-section layout:
 * - Ceremony section (toggle on/off)
 * - Reception section (toggle on/off)
 * 
 * At least one section must be enabled to create an event.
 * 3-column layout for compact display.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import '@fontsource/manrope/latin-600.css';
import ReactDOM from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X, CalendarPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EventDatePicker } from './EventDatePicker';
import { TimePicker } from './TimePicker';
import { LocationDetailsPopover } from './LocationDetailsPopover';
import { EventNameCombobox } from './EventNameCombobox';
import { format } from 'date-fns';
import styles from './EventCreateModal.module.css';

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
    reception_enabled: false,
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
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [receptionOverrides, setReceptionOverrides] = useState<Set<string>>(new Set());

  const markReceptionOverride = (field: string) => {
    setReceptionOverrides(prev => new Set(prev).add(field));
  };

  // Live sync from Ceremony to Reception (excludes start_time and finish_time)
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

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('ww-create-event-open');
    return () => document.body.classList.remove('ww-create-event-open');
  }, [isOpen]);

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
    const baseClass = "rounded-full border-2 focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9 text-sm border-primary focus-visible:border-primary px-4 truncate w-full";
    return baseClass;
  }, []);

  const validationIssues = useMemo(() => {
    const issues: Array<{ field: string; label: string }> = [];

    if (!formData.event_name.trim()) issues.push({ field: 'event_name', label: 'Event name' });
    if (!formData.ceremony_enabled && !formData.reception_enabled) {
      issues.push({ field: 'sections', label: 'Enable Ceremony or Reception' });
    }

    if (formData.ceremony_enabled) {
      if (!formData.ceremony_name.trim()) issues.push({ field: 'ceremony_name', label: 'Ceremony name' });
      if (!formData.ceremony_date) issues.push({ field: 'ceremony_date', label: 'Ceremony date' });
      if (!formData.ceremony_rsvp_deadline) issues.push({ field: 'ceremony_rsvp_deadline', label: 'Ceremony RSVP deadline' });
      if (!formData.ceremony_venue.trim()) issues.push({ field: 'ceremony_venue', label: 'Ceremony location name' });
      if (!formData.ceremony_start_time) issues.push({ field: 'ceremony_start_time', label: 'Ceremony start time' });
      if (!formData.ceremony_finish_time) issues.push({ field: 'ceremony_finish_time', label: 'Ceremony finish time' });
    }

    if (formData.reception_enabled) {
      if (!formData.name.trim()) issues.push({ field: 'reception_name', label: 'Reception event name' });
      if (!formData.date) issues.push({ field: 'reception_date', label: 'Reception event date' });
      if (!formData.rsvp_deadline) issues.push({ field: 'reception_rsvp_deadline', label: 'Reception RSVP deadline' });
      if (!formData.venue.trim()) issues.push({ field: 'reception_venue', label: 'Reception location/venue' });
      if (!formData.start_time) issues.push({ field: 'reception_start_time', label: 'Reception start time' });
      if (!formData.finish_time) issues.push({ field: 'reception_finish_time', label: 'Reception finish time' });
    }

    return issues;
  }, [formData]);

  const isFormValid = validationIssues.length === 0;

  const focusFirstInvalidField = (field: string) => {
    const selector = field === 'sections'
      ? '.ww-create-event-panel [role="switch"]'
      : `.ww-create-event-panel [data-create-event-field="${field}"]`;
    const fieldContainer = document.querySelector<HTMLElement>(selector);
    const focusTarget = fieldContainer?.matches('input, button, [role="combobox"]')
      ? fieldContainer
      : fieldContainer?.querySelector<HTMLElement>('input, button, [role="combobox"]');

    fieldContainer?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    window.setTimeout(() => focusTarget?.focus({ preventScroll: true }), 180);
  };

  const handleCreate = async () => {
    setSubmitAttempted(true);
    setSubmissionError(null);
    if (!isFormValid) {
      focusFirstInvalidField(validationIssues[0].field);
      return;
    }
    
    setIsSaving(true);
    try {
      // Convert guest limits to numbers for database
      const ceremonyGuestLimit = formData.ceremony_guest_limit === '' ? 10 : Number(formData.ceremony_guest_limit);
      const receptionGuestLimit = formData.guest_limit === '' ? 10 : Number(formData.guest_limit);
      
      await onCreate({
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
      
      // Reset form
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create event:', error);
      setSubmissionError('The event could not be created. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      event_name: '',
      ceremony_enabled: false,
      ceremony_name: '',
      ceremony_date: null,
      ceremony_venue: '',
      ceremony_venue_address: '',
      ceremony_venue_phone: '',
      ceremony_venue_contact: '',
      ceremony_venue_contact_email: '',
      ceremony_guest_limit: 10,
      ceremony_start_time: '',
      ceremony_finish_time: '',
      ceremony_rsvp_deadline: null,
      reception_enabled: false,
      name: '',
      event_type: 'seated',
      date: null,
      venue: '',
      venue_address: '',
      venue_phone: '',
      venue_contact: '',
      venue_contact_email: '',
      start_time: '',
      finish_time: '',
      guest_limit: 10,
      rsvp_deadline: null
    });
    setReceptionOverrides(new Set());
    setSubmitAttempted(false);
    setSubmissionError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
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

  // Lock body scroll while mobile sheet is open
  useEffect(() => {
    if (isMobile && isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isMobile, isOpen]);

  const headerNode = (
    <DialogHeader className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 items-center max-lg:pt-8 max-lg:gap-5 lg:pr-12">
      <DialogTitle className={`text-xl sm:text-2xl font-semibold tracking-[-0.012em] leading-tight text-white break-words whitespace-nowrap w-full lg:w-auto ${styles.title}`}>Create Event</DialogTitle>
      <div className="flex-1 w-full max-w-full lg:max-w-[75%] max-lg:px-3">
        <Input
          data-create-event-field="event_name"
          value={formData.event_name}
          onChange={(e) => setFormData(prev => ({ ...prev, event_name: e.target.value }))}
          placeholder="Event name - e.g., Jason & Linda's Wedding"
          className="h-11 sm:h-9 text-base sm:text-sm border-2 border-primary focus-visible:border-primary focus-visible:ring-0 w-full px-4 truncate rounded-full"
        />
      </div>
    </DialogHeader>
  );

  const footerNode = (
    <div className="flex flex-row gap-3 w-full pt-2 border-t lg:justify-end max-lg:grid max-lg:grid-cols-2 max-lg:gap-3 max-lg:px-3 max-lg:pb-2 max-md:sticky max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:bg-background max-md:px-4 max-md:pt-3 max-md:pb-[max(16px,env(safe-area-inset-bottom))]">
      <Button
        onClick={handleCreate}
        disabled={isSaving}
        className={`lv-premium-shade flex-1 lg:flex-none lg:order-2 h-11 rounded-full bg-green-500 hover:bg-green-600 text-white max-lg:order-1 max-lg:w-full ${styles.createButton}`}
      >
        {isSaving ? 'Creating...' : 'Create Event'}
      </Button>
      <Button
        variant="destructive"
        onClick={handleClose}
        className={`lv-premium-shade flex-1 lg:flex-none lg:order-1 h-11 rounded-full bg-red-500 hover:bg-red-600 text-white max-lg:order-2 max-lg:w-full ${styles.cancelButton}`}
      >
        Cancel
      </Button>
    </div>
  );

  const bodyContent = (
    <>
      {/* Validation Message */}
      {((!formData.ceremony_enabled && !formData.reception_enabled) ||
        (submitAttempted && validationIssues.length > 0) || submissionError) && (
        <div role="alert" className={`bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive max-lg:mb-4 text-center whitespace-pre-line ${styles.validation}`}>
          {!formData.ceremony_enabled && !formData.reception_enabled &&
            "Please enable at least one section below\n(Ceremony or Reception) \nto create an event."}
          {submitAttempted && validationIssues.filter(({ field }) => field !== 'sections').length > 0 && (
            <div className="mt-2 whitespace-normal">
              <p>Please complete the following required fields:</p>
              <p>{validationIssues.filter(({ field }) => field !== 'sections').map(({ label }) => label).join(', ')}</p>
            </div>
          )}
          {submissionError && <p className="mt-2 whitespace-normal">{submissionError}</p>}
        </div>
      )}
      {/* CEREMONY SECTION */}
      <div className={`border-2 border-border rounded-xl overflow-hidden ${styles.section}`}>
        <div className={`flex items-center justify-between px-4 py-3 bg-muted/50 ${styles.sectionHeader}`}>
          <h3 className={`text-lg font-semibold text-foreground ${styles.sectionTitle}`}>Ceremony</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{formData.ceremony_enabled ? 'Yes' : 'No'}</span>
            <button type="button" role="switch" aria-checked={formData.ceremony_enabled}
              onClick={() => setFormData(prev => ({ ...prev, ceremony_enabled: !prev.ceremony_enabled }))}
              className={`lg:hidden w-12 h-6 rounded-full flex items-center px-[2px] transition-all duration-200 ${formData.ceremony_enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${formData.ceremony_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <div className="hidden lg:block">
              <Switch checked={formData.ceremony_enabled} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ceremony_enabled: checked }))} />
            </div>
          </div>
        </div>
        {formData.ceremony_enabled ? (
          <div className="p-3 lg:p-4 space-y-3 lg:space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5" data-create-event-field="ceremony_name">
                <Label className="text-xs">Ceremony Name *</Label>
                <EventNameCombobox mainEventName={formData.event_name} value={formData.ceremony_name}
                  onChange={(name) => setFormData(prev => ({ ...prev, ceremony_name: name }))} placeholder="e.g., Bride & Groom's Name" />
              </div>
              <div className="space-y-1.5" data-create-event-field="ceremony_date">
                <Label className="text-xs">Ceremony Date *</Label>
                <EventDatePicker value={formData.ceremony_date} onChange={(date) => setFormData(prev => ({ ...prev, ceremony_date: date }))} placeholder="Select date" filled={!!formData.ceremony_date} />
              </div>
              <div className="space-y-1.5" data-create-event-field="ceremony_rsvp_deadline">
                <Label className="text-xs">RSVP Deadline *</Label>
                <EventDatePicker value={formData.ceremony_rsvp_deadline} onChange={(date) => setFormData(prev => ({ ...prev, ceremony_rsvp_deadline: date }))} placeholder="Select deadline" filled={!!formData.ceremony_rsvp_deadline} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Guest Limit</Label>
                <Input type="number" min="0" value={formData.ceremony_guest_limit}
                  onChange={(e) => handleGuestLimitChange(e.target.value, 'ceremony_guest_limit')}
                  placeholder="10" className={`h-10 sm:h-9 ${getInputClass(formData.ceremony_guest_limit !== '')}`} />
              </div>
              <div className="space-y-1.5" data-create-event-field="ceremony_venue">
                <Label className="text-xs">Location Name *</Label>
                <Input value={formData.ceremony_venue} onChange={(e) => setFormData(prev => ({ ...prev, ceremony_venue: e.target.value }))}
                  placeholder="e.g., Church/Venue" className={`h-10 sm:h-9 ${getInputClass(!!formData.ceremony_venue.trim())}`} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location Details</Label>
                <LocationDetailsPopover address={formData.ceremony_venue_address} phone={formData.ceremony_venue_phone} contact={formData.ceremony_venue_contact} email={formData.ceremony_venue_contact_email}
                  onSave={({ address, phone, contact, email }) => setFormData((prev) => ({ ...prev, ceremony_venue_address: address, ceremony_venue_phone: phone, ceremony_venue_contact: contact, ceremony_venue_contact_email: email ?? '' }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="space-y-1.5" data-create-event-field="ceremony_start_time">
                <Label className="text-xs">Start Time *</Label>
                <TimePicker value={formData.ceremony_start_time} onChange={(time) => setFormData(prev => ({ ...prev, ceremony_start_time: time }))} placeholder="Select time" filled={!!formData.ceremony_start_time} />
              </div>
              <div className="space-y-1.5" data-create-event-field="ceremony_finish_time">
                <Label className="text-xs">Finish Time *</Label>
                <TimePicker value={formData.ceremony_finish_time} onChange={(time) => setFormData(prev => ({ ...prev, ceremony_finish_time: time }))} placeholder="Select time" filled={!!formData.ceremony_finish_time} />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">Toggle on to add ceremony details</div>
        )}
      </div>
      {/* RECEPTION SECTION */}
      <div className={`border-2 border-border rounded-xl overflow-hidden ${styles.section}`}>
        <div className={`flex items-center justify-between px-4 py-3 bg-muted/50 ${styles.sectionHeader}`}>
          <h3 className={`text-lg font-semibold text-foreground ${styles.sectionTitle}`}>Reception</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{formData.reception_enabled ? 'Yes' : 'No'}</span>
            <button type="button" role="switch" aria-checked={formData.reception_enabled}
              onClick={() => setFormData(prev => ({ ...prev, reception_enabled: !prev.reception_enabled }))}
              className={`lg:hidden w-12 h-6 rounded-full flex items-center px-[2px] transition-all duration-200 ${formData.reception_enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${formData.reception_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <div className="hidden lg:block">
              <Switch checked={formData.reception_enabled} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reception_enabled: checked }))} />
            </div>
          </div>
        </div>
        {formData.reception_enabled ? (
          <div className="p-3 lg:p-4 space-y-3 lg:space-y-4">
            <div className="space-y-1.5 max-lg:mt-3 max-lg:space-y-2">
              <Label className="text-xs">Event Type *</Label>
              <div className={`lg:hidden grid grid-cols-2 gap-2 mt-2 ${styles.eventType}`}>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, event_type: 'seated' }))}
                  className={`lv-premium-shade w-full py-3 rounded-full text-sm transition-all ${formData.event_type === 'seated' ? 'bg-green-500 text-white border-none' : 'bg-secondary border-2 border-primary text-primary'}`}>Seated Event</button>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, event_type: 'cocktail' }))}
                  className={`lv-premium-shade w-full py-3 rounded-full text-sm transition-all ${formData.event_type === 'cocktail' ? 'bg-green-500 text-white border-none' : 'bg-secondary border-2 border-primary text-primary'}`}>Cocktail/Stand-up</button>
              </div>
              <div className={`hidden lg:grid lg:grid-cols-2 lg:gap-1 bg-muted border border-border rounded-full p-1 w-full max-w-md ${styles.eventType}`}>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, event_type: 'seated' }))}
                  className={`lv-premium-shade w-full h-9 rounded-full text-xs font-medium flex items-center justify-center transition-all ${formData.event_type === 'seated' ? 'bg-green-500 text-white shadow-sm' : 'bg-transparent text-muted-foreground hover:bg-muted-foreground/10'}`}>Seated Event</button>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, event_type: 'cocktail' }))}
                  className={`lv-premium-shade w-full h-9 rounded-full text-xs font-medium flex items-center justify-center transition-all ${formData.event_type === 'cocktail' ? 'bg-green-500 text-white shadow-sm' : 'bg-transparent text-muted-foreground hover:bg-muted-foreground/10'}`}>Cocktail/Stand-up</button>
              </div>
              <p className="text-xs lg:text-xs text-muted-foreground max-lg:mt-2 max-lg:text-sm">{formData.event_type === 'seated' ? 'Guests will be assigned to tables and seats' : 'No table assignments - guests mingle freely'}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5" data-create-event-field="reception_name">
                <Label className="text-xs">Event Name *</Label>
                <EventNameCombobox mainEventName={formData.event_name} value={formData.name}
                  onChange={(name) => { markReceptionOverride('name'); setFormData(prev => ({ ...prev, name })); }} placeholder="e.g., Bride & Groom's Name" />
              </div>
              <div className="space-y-1.5" data-create-event-field="reception_date">
                <Label className="text-xs">Event Date *</Label>
                <EventDatePicker value={formData.date} onChange={(date) => { markReceptionOverride('date'); setFormData(prev => ({ ...prev, date })); }} placeholder="Select date" filled={!!formData.date} />
              </div>
              <div className="space-y-1.5" data-create-event-field="reception_rsvp_deadline">
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
              <div className="space-y-1.5" data-create-event-field="reception_venue">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="space-y-1.5" data-create-event-field="reception_start_time">
                <Label className="text-xs">Start Time *</Label>
                <TimePicker value={formData.start_time} onChange={(time) => setFormData(prev => ({ ...prev, start_time: time }))} placeholder="Select time" filled={!!formData.start_time} />
              </div>
              <div className="space-y-1.5" data-create-event-field="reception_finish_time">
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

  // Mobile: render via plain portal to document.body, bypassing Radix entirely
  if (isMobile) {
    if (!isOpen) return null;
    return ReactDOM.createPortal(
      <div
        role="dialog"
        aria-modal="true"
        className={`ww-create-event-panel ${styles.drawer}`}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          width: '100%', height: '100dvh', zIndex: 9999,
          background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className={styles.closeButton}
          style={{
            position: 'absolute', right: 12, top: 12, zIndex: 1,
            width: 40, height: 40, borderRadius: 9999,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'white', border: '2px solid hsl(var(--primary))',
          }}
        >
          <X className="h-4 w-4 text-primary" strokeWidth={2.5} />
        </button>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div className="flex flex-col gap-3 items-center pt-8 gap-5 pr-12">
            <h2 className={`text-xl sm:text-2xl font-semibold tracking-[-0.012em] leading-tight text-white break-words whitespace-nowrap w-full text-center ${styles.title}`}>Create Event</h2>
            <div className="flex-1 w-full max-w-full px-3">
              <Input
                data-create-event-field="event_name"
                value={formData.event_name}
                onChange={(e) => setFormData(prev => ({ ...prev, event_name: e.target.value }))}
                placeholder="Event name - e.g., Jason & Linda's Wedding"
                className="h-11 text-base border-2 border-primary focus-visible:border-primary focus-visible:ring-0 w-full px-4 truncate rounded-full"
              />
            </div>
          </div>
          <div className={`space-y-4 py-3 ${styles.body}`}>
            {bodyContent}
          </div>
        </div>
        <div className={styles.footer} style={{
          position: 'sticky', bottom: 0,
          padding: '16px 16px max(16px, env(safe-area-inset-bottom))',
          background: 'white', borderTop: '1px solid #eee',
          display: 'flex', gap: 12,
        }}>
          <Button
            onClick={handleCreate}
            disabled={isSaving}
            className={`lv-premium-shade flex-1 h-11 rounded-full bg-green-500 hover:bg-green-600 text-white ${styles.createButton}`}
          >
            {isSaving ? 'Creating...' : 'Create Event'}
          </Button>
          <Button
            variant="destructive"
            onClick={handleClose}
            className={`lv-premium-shade flex-1 h-11 rounded-full bg-red-500 hover:bg-red-600 text-white ${styles.cancelButton}`}
          >
            Cancel
          </Button>
        </div>
      </div>,
      document.body
    );
  }

  // Desktop / tablet: right-side slide-out Sheet drawer (matches AddGuestModal)
  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <SheetContent
        side="right"
        className={`ww-create-event-panel w-full sm:max-w-3xl flex flex-col overflow-hidden p-6 mobile-scroll-container ${styles.drawer}`}
      >
        <SheetHeader className={`flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 items-center max-lg:pt-8 max-lg:gap-5 lg:pr-12 text-left space-y-0 ${styles.header}`}>
          <SheetTitle className={`text-xl sm:text-2xl font-semibold tracking-[-0.012em] leading-tight text-white break-words whitespace-nowrap w-full lg:w-auto ${styles.title}`}>Create Event</SheetTitle>
          <div className="flex-1 w-full max-w-full lg:max-w-[75%] max-lg:px-3">
            <Input
              data-create-event-field="event_name"
              value={formData.event_name}
              onChange={(e) => setFormData(prev => ({ ...prev, event_name: e.target.value }))}
              placeholder="Event name - e.g., Jason & Linda's Wedding"
              className="h-11 sm:h-9 text-base sm:text-sm border-2 border-primary focus-visible:border-primary focus-visible:ring-0 w-full px-4 truncate rounded-full"
            />
          </div>
        </SheetHeader>

        <div className={`space-y-4 py-3 pb-40 max-md:pb-6 overflow-y-auto flex-1 mobile-scroll-container ${styles.body}`}>
          {bodyContent}
        </div>

        <div className={`flex flex-row gap-3 w-full pt-2 border-t lg:justify-end max-lg:grid max-lg:grid-cols-2 max-lg:gap-3 max-lg:px-3 max-lg:pb-2 max-md:sticky max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:bg-background max-md:px-4 max-md:pt-3 max-md:pb-[max(16px,env(safe-area-inset-bottom))] ${styles.footer}`}>
          <Button
            onClick={handleCreate}
            disabled={isSaving}
            className={`lv-premium-shade inline-flex items-center justify-center flex-1 lg:flex-none lg:order-1 h-11 lg:h-12 lg:px-8 lg:text-base lg:font-semibold rounded-full bg-green-500 hover:bg-green-600 text-white max-lg:order-1 max-lg:w-full ${styles.createButton}`}
          >
            <CalendarPlus className="hidden lg:inline-block w-5 h-5 mr-2 text-white" />
            {isSaving ? 'Creating...' : 'Create Event'}
          </Button>
          <Button
            variant="destructive"
            onClick={handleClose}
            className={`lv-premium-shade inline-flex items-center justify-center flex-1 lg:flex-none lg:order-2 h-11 lg:h-12 lg:px-8 lg:text-base lg:font-semibold rounded-full bg-red-500 hover:bg-red-600 text-white max-lg:order-2 max-lg:w-full ${styles.cancelButton}`}
          >
            <Trash2 className="hidden lg:inline-block w-5 h-5 mr-2 text-white" />
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
