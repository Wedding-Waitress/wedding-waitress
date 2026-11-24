/**
 * ⚠️ PRODUCTION-READY — LOCKED FOR PRODUCTION ⚠️
 * 
 * This Guest Add/Edit Modal feature is COMPLETE and APPROVED for production use.
 * 
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break security validation (XSS protection)
 * - Changes could break rate limiting
 * - Changes could break input sanitization
 * - Changes could break relation tracking
 * - Changes could break table/seat assignment
 * 
 * See: MY_EVENTS_TABLES_GUESTLIST_SPECS.md for full specifications
 * 
 * Last locked: 2025-11-12
 */

import { isGuestCapacityError } from '@/lib/activeTrial';
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { secureGuestSchema, type SecureGuestData } from "@/lib/security/validation";
import { logSecurityEvent, guestAddRateLimiter } from "@/lib/security/monitoring";
import { sanitize, InputSanitizer } from "@/lib/security/inputSanitizer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { EventDatePicker } from "@/components/Dashboard/EventDatePicker";
import { Button } from "@/components/ui/enhanced-button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, AlertCircle, Users, Utensils, Calendar, MapPin, Plus, UserPlus, Pencil, Trash2, UserRound, Phone, Mail, ClipboardCheck, Table2, StickyNote, Save } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { normalizeGuestPhone, guestPhoneHint } from '@/lib/guestPhone';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTables } from "@/hooks/useTables";
import { computeRelationDisplay, isHostRelation, RelationPartner, RelationRole } from "@/lib/relationUtils";
import { cn } from "@/lib/utils";
import { normalizeRsvp } from "@/lib/rsvp";
import { useEvents } from "@/hooks/useEvents";
import { getGuestEventOwnerId } from "@/lib/guestEventOwner";
import {
  buildEditedGuestGroupName,
  deriveSavedGuestCategory,
  validateEditedGuestCategory,
} from "@/lib/editGuestCategory";
import type { GuestGroupType } from "@/lib/guestGroupClassification";
import {
  buildNewPartyMemberRelationshipFields,
  buildPrimaryGuestRelationshipFields,
} from "@/lib/guestRelationshipPayload";
import { RelationSelector } from "./RelationSelector";
import categoryStyles from "./AddGuestModal.module.css";

import { GroupTypeDialog } from "./GroupTypeDialog";
import { RelationAssignmentDialog, PersonToAssign } from "./RelationAssignmentDialog";

type AddGuestFormData = SecureGuestData;

interface AddGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuestAdded: () => void;
  eventId: string;
  editGuest?: {
    id: string;
    first_name: string;
    last_name: string;
    table_id: string | null;
    seat_no: number | null;
    rsvp_date?: string | null;
    rsvp: string;
    dietary: string;
    mobile: string | null;
    email: string | null;
    notes: string | null;
    family_group?: string | null;
    allow_plus_one?: boolean | null;
    relation_partner: string;
    relation_role: string;
    relation_display: string;
  } | null;
  savedEventGuests?: Array<{
    id: string;
    family_group?: string | null;
  }>;
  isEdit?: boolean;
  relationsHidden?: boolean;
  currentGuestCount?: number;
  allowedGuestLimit?: number | null;
  onGuestLimitReached?: () => void;
}

export const AddGuestModal: React.FC<AddGuestModalProps> = ({
  isOpen,
  onClose,
  onGuestAdded,
  eventId,
  editGuest,
  savedEventGuests,
  isEdit = false,
  relationsHidden: relationsHiddenProp,
  currentGuestCount = 0,
  allowedGuestLimit,
  onGuestLimitReached,
}) => {
  const { toast } = useToast();
  const { tables, loading: tablesLoading } = useTables(eventId);
  const { events } = useEvents();

  // useTables already fetches on mount and reuses in-flight requests.
  const selectedEvent = events.find(e => e.id === eventId);
  
  const [relationSelectorOpen, setRelationSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingFamilyMembers, setPendingFamilyMembers] = useState<string[]>([]);
  const [takenSeats, setTakenSeats] = useState<{[key: string]: {seatNo: number, guestName: string, guestId: string}[]}>({});
  const [relationSettings, setRelationSettings] = useState({
    relation_required: true,
    relation_allow_custom_role: false,
    relation_allow_single_partner: true,
    relation_disable_first_guest_alert: false,
    custom_roles: [] as string[]
  });
  
  
  // Group type dialog state for edit mode
  const [showGroupTypeDialog, setShowGroupTypeDialog] = useState(false);
  const [pendingEditSaveData, setPendingEditSaveData] = useState<any>(null);
  const [pendingMemberNames, setPendingMemberNames] = useState<string[]>([]);

  // Relation assignment dialog state
  const [showRelationAssignment, setShowRelationAssignment] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<AddGuestFormData | null>(null);
  const [peopleToAssign, setPeopleToAssign] = useState<PersonToAssign[]>([]);

  // Guest type selection state
  const [guestType, setGuestType] = useState<GuestGroupType>('individual');
  const [savedGuestType, setSavedGuestType] = useState<GuestGroupType>('individual');
  const [existingGroupMemberCount, setExistingGroupMemberCount] = useState(0);
  const [partyMembers, setPartyMembers] = useState<Array<{
    first_name: string;
    last_name: string;
    mobile?: string;
    email?: string;
    dietary?: string;
    table_id?: string;
    seat_no?: number;
  }>>([]);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);
  const [manualInviteStatus, setManualInviteStatus] = useState((editGuest as any)?.rsvp_invite_status || 'not_sent');
  const [allowPlusOne, setAllowPlusOne] = useState(editGuest?.allow_plus_one !== false);

  const [memberForm, setMemberForm] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
    email: '',
    dietary: 'None'
  });

  const resetMemberEditor = () => {
    setShowAddMemberForm(false);
    setEditingMemberIndex(null);
    setMemberForm({ first_name: '', last_name: '', mobile: '', email: '', dietary: 'None' });
  };

  const form = useForm<AddGuestFormData>({
    resolver: zodResolver(secureGuestSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      table_id: "",
      seat_no: undefined,
      rsvp_date: undefined,
      rsvp: "Pending",
      dietary: "NA",
      mobile: "",
      email: "",
      family_group: "",
      notes: "",
      relation_partner: '',
      relation_role: '',
      mailing_address: "",
      mailing_suburb: "",
      mailing_state: "",
      mailing_postcode: "",
    }
  });

  // Fetch relation settings for this event
  useEffect(() => {
    if (isOpen && eventId) {
      const fetchRelationSettings = async () => {
        try {
          const { data, error } = await supabase
            .from('events')
            .select('relation_required, relation_allow_custom_role, relation_allow_single_partner, relation_disable_first_guest_alert, custom_roles')
            .eq('id', eventId)
            .single();

          if (data && !error) {
            setRelationSettings({
              relation_required: data.relation_required ?? true,
              relation_allow_custom_role: data.relation_allow_custom_role ?? false,
              relation_allow_single_partner: data.relation_allow_single_partner ?? true,
              relation_disable_first_guest_alert: data.relation_disable_first_guest_alert ?? false,
              custom_roles: Array.isArray(data.custom_roles) ? data.custom_roles as string[] : [],
            });
          }
        } catch (error) {
          console.error('Error fetching relation settings:', error);
        }
      };

      fetchRelationSettings();
    }
  }, [isOpen, eventId]);

  // Reset form when modal opens/closes or edit guest changes
  useEffect(() => {
    if (isOpen) {
      setPartyMembers([]);
      setShowAddMemberForm(false);
      setEditingMemberIndex(null);
      setMemberForm({ first_name: '', last_name: '', mobile: '', email: '', dietary: 'None' });
      if (isEdit && editGuest) {
        form.reset({
          first_name: editGuest.first_name,
          last_name: editGuest.last_name,
          table_id: editGuest.table_id || "",
          seat_no: editGuest.seat_no || undefined,
          rsvp_date: editGuest.rsvp_date ? new Date(editGuest.rsvp_date) : undefined,
          rsvp: normalizeRsvp(editGuest.rsvp),
          dietary: editGuest.dietary,
          mobile: editGuest.mobile || "",
          email: editGuest.email || "",
          family_group: editGuest.family_group || "",
          notes: editGuest.notes || "",
          relation_partner: editGuest.relation_partner || '',
          relation_role: editGuest.relation_role || '',
          mailing_address: (editGuest as any).mailing_address || "",
          mailing_suburb: (editGuest as any).mailing_suburb || "",
          mailing_state: (editGuest as any).mailing_state || "",
          mailing_postcode: (editGuest as any).mailing_postcode || "",
        });
      } else {
        form.reset({
          first_name: "",
          last_name: "",
          table_id: "",
          seat_no: undefined,
          rsvp_date: undefined,
          rsvp: "Pending",
          dietary: "NA",
          mobile: "",
          email: "",
          family_group: "",
          notes: "",
          relation_partner: '',
          relation_role: '',
          mailing_address: "",
          mailing_suburb: "",
          mailing_state: "",
          mailing_postcode: "",
        });
      }
    }
    if (isEdit && editGuest) {
      const category = deriveSavedGuestCategory(editGuest, savedEventGuests || [editGuest]);
      const groupName = editGuest.family_group?.trim();
      const otherMemberCount = groupName
        ? (savedEventGuests || [editGuest]).filter(
            (guest) => guest.id !== editGuest.id && guest.family_group?.trim() === groupName,
          ).length
        : 0;
      setManualInviteStatus((editGuest as any).rsvp_invite_status || 'not_sent');
      setAllowPlusOne(editGuest.allow_plus_one !== false);
      setGuestType(category);
      setSavedGuestType(category);
      setExistingGroupMemberCount(category === 'individual' ? 0 : otherMemberCount);
    }
  }, [isOpen, isEdit, editGuest, form, savedEventGuests]);

  // Fetch other guests in this event for the Couple partner picker
  useEffect(() => {
    if (!isOpen || !isEdit || !eventId || savedEventGuests) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('guests')
        .select('id, first_name, last_name, family_group')
        .eq('event_id', eventId)
        .order('first_name', { ascending: true });
      const eventGuests = ((data as any) || []) as Array<{ id: string; first_name: string; last_name: string; family_group: string | null }>;
      if (editGuest && !cancelled) {
        const category = deriveSavedGuestCategory(editGuest, eventGuests);
        const groupName = editGuest.family_group?.trim();
        const otherMemberCount = groupName
          ? eventGuests.filter((guest) => guest.id !== editGuest.id && guest.family_group?.trim() === groupName).length
          : 0;
        setGuestType(category);
        setSavedGuestType(category);
        setExistingGroupMemberCount(category === 'individual' ? 0 : otherMemberCount);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, isEdit, eventId, editGuest, savedEventGuests]);

  const handleClose = () => {
    form.reset();
    setRelationSelectorOpen(false);
    setGuestType('individual');
    setSavedGuestType('individual');
    setExistingGroupMemberCount(0);
    setPartyMembers([]);
    resetMemberEditor();
    setShowGroupTypeDialog(false);
    setManualInviteStatus('not_sent');
    setPendingEditSaveData(null);
    setShowRelationAssignment(false);
    setPendingFormData(null);
    setPeopleToAssign([]);
    onClose();
  };

  // Handle group type selection from edit mode
  const handleGroupTypeConfirm = async (groupType: 'couple' | 'family') => {
    if (!pendingEditSaveData) return;
    const { data, editGuestId } = pendingEditSaveData;
    
    setShowGroupTypeDialog(false);
    setLoading(true);

    try {
      // Generate family group name
      let familyGroupName = '';
      
      // Fetch pending member names
      const { data: memberGuests } = await supabase
        .from('guests')
        .select('id, first_name, last_name')
        .in('id', pendingFamilyMembers);

      if (groupType === 'couple' && memberGuests && memberGuests.length === 1) {
        const member = memberGuests[0];
        if (data.last_name === member.last_name) {
          familyGroupName = `${data.last_name} Couple`;
        } else {
          familyGroupName = `${data.last_name} & ${member.last_name}`;
        }
      } else {
        familyGroupName = `${data.last_name} Family`;
      }

      // Update current guest's family_group
      await supabase
        .from('guests')
        .update({ family_group: familyGroupName })
        .eq('id', editGuestId);

      // Update all pending members' family_group
      for (const memberId of pendingFamilyMembers) {
        await supabase
          .from('guests')
          .update({ family_group: familyGroupName })
          .eq('id', memberId);
      }

      // Upsert family_groups record
      const { data: familyGroup, error: fgError } = await supabase
        .from('family_groups')
        .upsert(
          { event_id: eventId, name: familyGroupName },
          { onConflict: 'event_id,name' }
        )
        .select('id')
        .single();

      if (!fgError && familyGroup) {
        // Insert memberships
        const membershipInserts = [
          { group_id: familyGroup.id, guest_id: editGuestId },
          ...pendingFamilyMembers.map(id => ({ group_id: familyGroup.id, guest_id: id }))
        ];

        await supabase
          .from('family_group_members')
          .upsert(membershipInserts, { onConflict: 'group_id,guest_id' });
      }

      toast({
        title: groupType === 'couple' ? "Couple Created" : "Family Created",
        description: `${data.first_name} ${data.last_name} and ${pendingFamilyMembers.length} member(s) have been grouped as a ${groupType}.`,
      });

      setPendingFamilyMembers([]);
      setPendingEditSaveData(null);
      onGuestAdded();
      handleClose();
    } catch (error) {
      console.error('Error creating family group from edit:', error);
      toast({
        title: "Error",
        description: "Guest updated but there was an issue creating the group.",
        variant: "destructive",
      });
      onGuestAdded();
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const addPartyMember = () => {
    let normalizedMobile: string;
    try {
      normalizedMobile = normalizeGuestPhone(memberForm.mobile);
    } catch (error) {
      toast({ title: 'Check mobile number', description: (error as Error).message, variant: 'destructive' });
      return;
    }
    if (!memberForm.first_name || !memberForm.last_name) {
      toast({
        title: "Missing information",
        description: "Please enter first and last name for the party member",
        variant: "destructive"
      });
      return;
    }

    const savedMember = { ...memberForm, mobile: normalizedMobile };
    if (editingMemberIndex === null) {
      setPartyMembers(prev => [...prev, savedMember]);
    } else {
      setPartyMembers(prev => prev.map((member, index) => index === editingMemberIndex ? savedMember : member));
    }
    const wasEditing = editingMemberIndex !== null;
    resetMemberEditor();
    
    toast({
      title: wasEditing ? "Member updated" : "Member added",
      description: wasEditing
        ? `${memberForm.first_name} ${memberForm.last_name} updated`
        : `${memberForm.first_name} ${memberForm.last_name} added to the party`
    });
  };

  const removeMember = (index: number) => {
    setPartyMembers(prev => prev.filter((_, i) => i !== index));
    if (editingMemberIndex === index) {
      resetMemberEditor();
    } else if (editingMemberIndex !== null && editingMemberIndex > index) {
      setEditingMemberIndex(editingMemberIndex - 1);
    }
  };

  const editMember = (index: number) => {
    const member = partyMembers[index];
    if (!member) return;
    setEditingMemberIndex(index);
    setMemberForm({
      first_name: member.first_name,
      last_name: member.last_name,
      mobile: member.mobile || '',
      email: member.email || '',
      dietary: member.dietary || 'None',
    });
    setShowAddMemberForm(true);
  };

  const selectGuestType = (nextType: GuestGroupType) => {
    setGuestType(nextType);
    resetMemberEditor();

    if (nextType === 'individual') {
      setPartyMembers([]);
      return;
    }

    if (nextType === 'couple') {
      const availableNewMemberSlots = Math.max(0, 1 - existingGroupMemberCount);
      setPartyMembers((members) => members.slice(0, availableNewMemberSlots));
    }
  };

  const handleRelationChange = (partner: RelationPartner, role: RelationRole) => {
    form.setValue('relation_partner', partner);
    form.setValue('relation_role', role);
    if (isHostRelation(role)) form.setValue('rsvp', 'Attending');
    form.clearErrors(['relation_partner', 'relation_role']);
  };

  // Fetch taken seats for a specific table
  const fetchTakenSeats = useCallback(async (tableId: string) => {
    if (!tableId || tableId === "none") {
      setTakenSeats(prev => ({ ...prev, [tableId]: [] }));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('guests')
        .select('seat_no, first_name, last_name, id')
        .eq('event_id', eventId)
        .eq('table_id', tableId)
        .not('seat_no', 'is', null);

      if (error) throw error;

      const allGuests = (data || []).map(guest => ({
        seatNo: guest.seat_no!,
        guestName: `${guest.first_name} ${guest.last_name || ''}`.trim(),
        guestId: guest.id
      }));

      const taken = allGuests
        .filter(guest => 
          // Exclude current guest when editing
          isEdit && editGuest ? guest.guestId !== editGuest.id : true
        );

      setTakenSeats(prev => ({ ...prev, [tableId]: taken }));
    } catch (error) {
      console.error('Error fetching taken seats:', error);
      setTakenSeats(prev => ({ ...prev, [tableId]: [] }));
    }
  }, [eventId, isEdit, editGuest]);

  const getAvailableSeatNumbers = useCallback((tableId: string): number[] => {
    const selectedTable = tables.find(t => t.id === tableId);
    if (!selectedTable) return [];

    const totalSeats = selectedTable.limit_seats;
    return Array.from({ length: totalSeats }, (_, i) => i + 1);
  }, [tables]);

  const getSeatDisplayInfo = useCallback((tableId: string, seatNo: number) => {
    const taken = takenSeats[tableId] || [];
    const takenSeat = taken.find(seat => seat.seatNo === seatNo);
    const isCurrentSeat = isEdit && editGuest && editGuest.table_id === tableId && editGuest.seat_no === seatNo;
    
    if (isCurrentSeat) {
      return {
        label: `Seat ${seatNo} — Current`,
        disabled: false
      };
    } else if (takenSeat) {
      return {
        label: `Seat ${seatNo} — Taken (${takenSeat.guestName})`,
        disabled: true
      };
    } else {
      return {
        label: `Seat ${seatNo}`,
        disabled: false
      };
    }
  }, [takenSeats, isEdit, editGuest]);

  // Fetch same-table guests when editing and table has a seat
  useEffect(() => {
    if (isEdit && editGuest?.table_id && editGuest?.seat_no) {
      fetchTakenSeats(editGuest.table_id);
    }
  }, [isEdit, editGuest?.table_id, editGuest?.seat_no, fetchTakenSeats]);

  // Auto-select first free seat when table is chosen
  const handleTableChange = useCallback((newTableId: string) => {
    if (newTableId) {
      fetchTakenSeats(newTableId).then(() => {
        // Only auto-select if guest doesn't already have a seat
        const currentSeat = form.getValues('seat_no');
        if (!currentSeat || (isEdit && editGuest && !editGuest.seat_no)) {
          const availableSeats = getAvailableSeatNumbers(newTableId);
          const taken = takenSeats[newTableId] || [];
          
          // Find first free seat
          const firstFreeSeat = availableSeats.find(seatNo => {
            const takenSeat = taken.find(seat => seat.seatNo === seatNo);
            return !takenSeat;
          });
          
          if (firstFreeSeat) {
            form.setValue('seat_no', firstFreeSeat);
          }
        }
      });
    } else {
      form.setValue('seat_no', undefined);
    }
  }, [fetchTakenSeats, getAvailableSeatNumbers, takenSeats, form, isEdit, editGuest]);


  // Keep legacy group records in sync when a group collapses to one person.
  const cleanupSingleMemberFamily = async (oldGroup: string | null | undefined) => {
    const g = (oldGroup || '').trim();
    if (!g) return;
    const { data: remaining } = await supabase
      .from('guests')
      .select('id')
      .eq('event_id', eventId)
      .eq('family_group', g)
      .throwOnError();
    if (!remaining || remaining.length > 1) return;

    if (remaining.length === 1) {
      await supabase
        .from('guests')
        .update({ family_group: null })
        .eq('event_id', eventId)
        .eq('id', remaining[0].id)
        .throwOnError();
    }

    const { data: obsoleteGroups } = await supabase
      .from('family_groups')
      .select('id')
      .eq('event_id', eventId)
      .eq('name', g);
    const obsoleteGroupIds = (obsoleteGroups || []).map((group) => group.id);
    if (obsoleteGroupIds.length > 0) {
      await supabase.from('family_group_members').delete().in('group_id', obsoleteGroupIds).throwOnError();
      await supabase.from('family_groups').delete().in('id', obsoleteGroupIds).throwOnError();
    }
  };

  const onInvalid = () => {requestAnimationFrame(()=>{const firstInvalid=document.querySelector<HTMLElement>('.ww-edit-guest-panel [aria-invalid="true"]');firstInvalid?.scrollIntoView({behavior:'smooth',block:'center'});firstInvalid?.focus();});};

  const onSubmit = async (data: AddGuestFormData) => {
    const guestsBeingAdded = (isEdit ? 0 : 1) + partyMembers.length;
    if (allowedGuestLimit != null && currentGuestCount + guestsBeingAdded > allowedGuestLimit) {
      onGuestLimitReached?.();
      return;
    }
    if (isEdit && editGuest) {
      const categoryError = validateEditedGuestCategory(
        guestType,
        savedGuestType === 'individual' ? 0 : existingGroupMemberCount,
        partyMembers.length,
      );
      if (categoryError) {
        toast({ title: 'Complete the guest category', description: categoryError, variant: 'destructive' });
        return;
      }
      if (allowedGuestLimit != null && currentGuestCount + partyMembers.length > allowedGuestLimit) {
        onGuestLimitReached?.();
        return;
      }
    }
    setLoading(true);
    
    try {
      data.mobile = normalizeGuestPhone(data.mobile);
      // Get current user for rate limiting and security monitoring
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      
      // Check rate limiting for guest creation
      if (!guestAddRateLimiter.isAllowed(userId || 'anonymous')) {
        toast({
          title: "Too many requests",
          description: "Please slow down. You're adding guests too quickly.",
          variant: "destructive",
        });
        logSecurityEvent.suspiciousDataAccess('guest_creation', 'Rate limit exceeded', userId);
        setLoading(false);
        return;
      }

      // Detect potentially malicious input
      const fieldsToCheck = [data.first_name, data.last_name, data.notes || '', data.family_group || ''];
      for (const field of fieldsToCheck) {
        if (InputSanitizer.detectMaliciousInput(field)) {
          toast({
            title: "Invalid input detected",
            description: "Please check your input for invalid characters.",
            variant: "destructive",
          });
          logSecurityEvent.validationFailure('malicious_input', field, userId);
          setLoading(false);
          return;
        }
      }
      // Relationship is optional. Only open assignment when the user requests it.

      // Validate table and seat
      if (data.table_id && data.seat_no) {
        const selectedTable = tables.find(t => t.id === data.table_id);
        if (selectedTable && data.seat_no > selectedTable.limit_seats) {
          form.setError('seat_no', {
            type: 'manual',
            message: `Seat number cannot exceed ${selectedTable.limit_seats}`
          });
          setLoading(false);
          return;
        }
      }

      // Prepare guest data
      const eventOwnerId = getGuestEventOwnerId(selectedEvent, eventId);
      const hasAnyAddress = !!(
        (data as any).mailing_address?.trim() ||
        (data as any).mailing_suburb?.trim() ||
        (data as any).mailing_state?.trim() ||
        (data as any).mailing_postcode?.trim()
      );

      const guestData = {
        event_id: eventId,
        user_id: eventOwnerId,
        first_name: data.first_name,
        last_name: data.last_name,
        table_id: data.table_id || null,
        seat_no: data.seat_no || null,
        rsvp_date: data.rsvp_date?.toISOString().split('T')[0] || null,
        rsvp: data.rsvp,
        dietary: data.dietary,
        mobile: data.mobile || null,
        email: data.email || null,
        family_group: data.family_group || null,
        notes: data.notes || null,
        assigned: !!(data.table_id),
        mailing_address: (data as any).mailing_address || null,
        mailing_suburb: (data as any).mailing_suburb || null,
        mailing_state: (data as any).mailing_state || null,
        mailing_postcode: (data as any).mailing_postcode || null,
        address_received: hasAnyAddress,
      };

      // Compute relation_display using current event's partner names
      let relationDisplay = '';
      if (data.relation_partner && data.relation_role) {
        relationDisplay = computeRelationDisplay(
          data.relation_partner as RelationPartner,
          data.relation_role as RelationRole,
          selectedEvent?.partner1_name,
          selectedEvent?.partner2_name,
          relationSettings.custom_roles
        );
      }

      // Get table number if table is selected
      let table_no = null;
      if (data.table_id) {
        const selectedTable = tables.find(t => t.id === data.table_id);
        table_no = selectedTable?.table_no || null;
      }

      const finalGuestData = {
        ...guestData,
        table_no,
        ...buildPrimaryGuestRelationshipFields(
          data.relation_partner,
          data.relation_role,
          relationDisplay,
        ),
        ...(isEdit ? {
          rsvp_invite_status: manualInviteStatus,
          allow_plus_one: allowPlusOne,
          family_group: guestType === savedGuestType && savedGuestType !== 'individual' && editGuest?.family_group
            ? editGuest.family_group
            : buildEditedGuestGroupName(
                guestType,
                data.first_name,
                data.last_name,
                partyMembers[0]?.first_name,
                partyMembers[0]?.last_name,
              ),
        } : {}),
      };

      if (isEdit && editGuest) {
        // Update existing guest
        const { error } = await supabase
          .from('guests')
          .update(finalGuestData)
          .eq('id', editGuest.id);

        if (error) {
          console.error('Error updating guest:', error);
          
          // Handle unique constraint violation
          if (error.code === '23505' && error.message?.includes('uniq_event_table_seat')) {
            // Refresh taken seats data
            if (data.table_id) {
              await fetchTakenSeats(data.table_id);
            }
            
            toast({
              title: "Seat Unavailable",
              description: "That seat was just taken. Please choose another.",
              variant: "destructive",
            });
            form.setError('seat_no', { type: 'manual', message: 'Seat unavailable. Please choose another.' });
            setLoading(false);
            return;
          }
          
          toast({
            title: "Error",
            description: "Failed to update guest. Please try again.",
            variant: "destructive",
          });
        } else {
          let insertedMemberIds: string[] = [];
          if (partyMembers.length > 0) {
            const memberInserts = partyMembers.map((member) => ({
              event_id: eventId,
              user_id: eventOwnerId,
              first_name: member.first_name,
              last_name: member.last_name,
              mobile: member.mobile || null,
              email: member.email || null,
              dietary: member.dietary || 'None',
              table_id: finalGuestData.table_id || null,
              table_no: finalGuestData.table_no || null,
              seat_no: null,
              assigned: !!finalGuestData.table_id,
              family_group: finalGuestData.family_group,
              rsvp: 'Pending',
              ...buildNewPartyMemberRelationshipFields(),
            }));

            const { data: insertedMembers, error: memberError } = await supabase
              .from('guests')
              .insert(memberInserts)
              .select('id');

            if (memberError) {
              await supabase
                .from('guests')
                .update({ family_group: editGuest.family_group || null })
                .eq('id', editGuest.id);
              if (isGuestCapacityError(memberError)) {
                onGuestLimitReached?.();
              } else {
                toast({
                  title: 'Unable to add group members',
                  description: memberError.code === '23505'
                    ? 'One of these guests already exists in this event.'
                    : 'The guest was updated, but the new group members were not added.',
                  variant: 'destructive',
                });
              }
              setLoading(false);
              return;
            }

            insertedMemberIds = (insertedMembers || []).map((member) => member.id);
          }

          const previousGroup = editGuest.family_group?.trim() || null;
          const nextGroup = finalGuestData.family_group?.trim() || null;

          try {
            const { data: eventFamilyGroups } = await supabase
              .from('family_groups')
              .select('id')
              .eq('event_id', eventId);
            const eventFamilyGroupIds = (eventFamilyGroups || []).map((group) => group.id);
            if (eventFamilyGroupIds.length > 0) {
              const { error: oldMembershipError } = await supabase
                .from('family_group_members')
                .delete()
                .eq('guest_id', editGuest.id)
                .in('group_id', eventFamilyGroupIds);
              if (oldMembershipError) throw oldMembershipError;
            }

            if (nextGroup) {
              const { data: familyGroup, error: familyGroupError } = await supabase
                .from('family_groups')
                .upsert({ event_id: eventId, name: nextGroup }, { onConflict: 'event_id,name' })
                .select('id')
                .single();

              if (familyGroupError) throw familyGroupError;
              const membershipGuestIds = [editGuest.id, ...insertedMemberIds];
              const { error: membershipError } = await supabase
                .from('family_group_members')
                .upsert(
                  membershipGuestIds.map((guestId) => ({ group_id: familyGroup.id, guest_id: guestId })),
                  { onConflict: 'group_id,guest_id' },
                );
              if (membershipError) throw membershipError;
            }

            if (previousGroup && previousGroup !== nextGroup) {
              await cleanupSingleMemberFamily(previousGroup);
            }
          } catch (groupError) {
            const rollbackGuestIds = [editGuest.id, ...insertedMemberIds];
            const { data: rollbackGroups } = await supabase
              .from('family_groups')
              .select('id')
              .eq('event_id', eventId);
            const rollbackGroupIds = (rollbackGroups || []).map((group) => group.id);
            if (rollbackGroupIds.length > 0) {
              await supabase
                .from('family_group_members')
                .delete()
                .in('guest_id', rollbackGuestIds)
                .in('group_id', rollbackGroupIds);
            }
            if (insertedMemberIds.length > 0) {
              await supabase.from('guests').delete().in('id', insertedMemberIds);
            }
            await supabase
              .from('guests')
              .update({ family_group: editGuest.family_group || null })
              .eq('id', editGuest.id);
            if (previousGroup) {
              const { data: restoredGroup } = await supabase
                .from('family_groups')
                .upsert({ event_id: eventId, name: previousGroup }, { onConflict: 'event_id,name' })
                .select('id')
                .single();
              if (restoredGroup) {
                await supabase
                  .from('family_group_members')
                  .upsert(
                    { group_id: restoredGroup.id, guest_id: editGuest.id },
                    { onConflict: 'group_id,guest_id' },
                  );
              }
            }
            throw groupError;
          }

          // If there are pending family members, show the group type dialog
          if (pendingFamilyMembers.length > 0) {
            // Fetch member names for dialog display
            const { data: memberGuests } = await supabase
              .from('guests')
              .select('first_name, last_name')
              .in('id', pendingFamilyMembers);
            setPendingMemberNames(
              (memberGuests || []).map(g => `${g.first_name} ${g.last_name || ''}`.trim())
            );
            setPendingEditSaveData({ data, editGuestId: editGuest.id });
            setShowGroupTypeDialog(true);
            setLoading(false);
            return;
          }
          
          toast({
            title: "Guest Updated",
            description: `${data.first_name} ${data.last_name} has been updated successfully.`,
          });
          onGuestAdded();
          handleClose();
        }
      } else {
        const resolvedMembers = partyMembers;
        const guestsBeingAdded = 1 + resolvedMembers.length;
        if (allowedGuestLimit != null && currentGuestCount + guestsBeingAdded > allowedGuestLimit) {
          setLoading(false);
          onGuestLimitReached?.();
          return;
        }
        
        // Auto-generate family group name for couples and families
        let autoFamilyGroup = '';
        if (guestType === 'couple' && resolvedMembers.length === 1) {
          autoFamilyGroup = `${data.last_name} & ${resolvedMembers[0].last_name}`;
        } else if (guestType === 'family' && resolvedMembers.length >= 1) {
          autoFamilyGroup = `${data.last_name} Family`;
        }

        const primaryGuestData = {
          ...finalGuestData,
          family_group: autoFamilyGroup || finalGuestData.family_group
        };

        // Create new guest
        const { data: newGuest, error: guestError } = await supabase
          .from('guests')
          .insert([primaryGuestData])
          .select('id')
          .single();

        if (guestError) {
          console.error('Error adding guest:', guestError);
          if (isGuestCapacityError(guestError)) {
            onGuestLimitReached?.();
            setLoading(false);
            return;
          }
          
          // Handle unique constraint violation
          if (guestError.code === '23505' && guestError.message?.includes('uniq_event_table_seat')) {
            // Refresh taken seats data
            if (finalGuestData.table_id) {
              await fetchTakenSeats(finalGuestData.table_id);
            }
            
            toast({
              title: "Seat Unavailable",
              description: "That seat was just taken. Please choose another.",
              variant: "destructive",
            });
            form.setError('seat_no', { type: 'manual', message: 'Seat unavailable. Please choose another.' });
            setLoading(false);
            return;
          }

          if (guestError.code === '23505' && guestError.message?.includes('uniq_guest_name_per_event')) {
            toast({
              title: "Duplicate Guest",
              description: `A guest named "${data.first_name} ${data.last_name}" already exists in this event.`,
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
          
          toast({
            title: "Error",
            description: "Failed to add guest. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Save party members if any
        if (resolvedMembers.length > 0 && autoFamilyGroup) {
          // Fetch taken seats for the selected table to avoid collisions
          let takenSeatNumbers: number[] = [];
          let tableSeatLimit = 0;
          if (finalGuestData.table_id) {
            const { data: existingGuests } = await supabase
              .from('guests')
              .select('seat_no')
              .eq('table_id', finalGuestData.table_id)
              .not('seat_no', 'is', null);
            
            takenSeatNumbers = (existingGuests || []).map(g => g.seat_no!);
            // Add the primary guest's seat as taken
            if (finalGuestData.seat_no) {
              takenSeatNumbers.push(finalGuestData.seat_no);
            }
            
            const selectedTable = tables.find(t => t.id === finalGuestData.table_id);
            tableSeatLimit = selectedTable?.limit_seats || 0;
          }

          // Calculate sequential available seats for members
          const getNextAvailableSeat = (startFrom: number): number | null => {
            let candidate = startFrom;
            while (candidate <= tableSeatLimit) {
              if (!takenSeatNumbers.includes(candidate)) {
                return candidate;
              }
              candidate++;
            }
            return null; // No available seat
          };

          let nextSeatStart = (finalGuestData.seat_no || 0) + 1;
          let unseatedMembers: string[] = [];

          const memberInserts = resolvedMembers.map((member, memberIndex) => {
            let memberSeatNo: number | null = null;
            let memberTableId = finalGuestData.table_id || null;
            let memberTableNo = finalGuestData.table_no || null;
            let memberAssigned = false;

            if (memberTableId && tableSeatLimit > 0) {
              const availableSeat = getNextAvailableSeat(nextSeatStart);
              if (availableSeat !== null) {
                memberSeatNo = availableSeat;
                takenSeatNumbers.push(availableSeat);
                nextSeatStart = availableSeat + 1;
                memberAssigned = true;
              } else {
                unseatedMembers.push(`${member.first_name} ${member.last_name}`);
                // Still assign to same table, just no seat
                memberAssigned = true;
              }
            } else if (memberTableId) {
              memberAssigned = true;
            }

            return {
              event_id: eventId,
              user_id: eventOwnerId,
              first_name: member.first_name,
              last_name: member.last_name,
              mobile: member.mobile || null,
              email: member.email || null,
              dietary: member.dietary || 'None',
              table_id: memberTableId,
              table_no: memberTableNo,
              seat_no: memberSeatNo,
              assigned: memberAssigned,
              family_group: autoFamilyGroup,
              rsvp: 'Pending',
              ...buildNewPartyMemberRelationshipFields(),
            };
          });

          const { error: membersError } = await supabase
            .from('guests')
            .insert(memberInserts);

          if (membersError) {
            console.error('Error adding party members:', membersError);
            if (isGuestCapacityError(membersError)) {
              onGuestLimitReached?.();
            }
            if (membersError.code === '23505' && membersError.message?.includes('uniq_guest_name_per_event')) {
              toast({
                title: "Duplicate Party Member",
                description: "One or more party members already exist in this event's guest list.",
                variant: "destructive",
              });
            }
          }

          // Warn if some members couldn't get a seat
          if (unseatedMembers.length > 0) {
            toast({
              title: "Some Members Unseated",
              description: `${unseatedMembers.join(', ')} could not be assigned a seat — table is at capacity. You can reassign them manually.`,
              variant: "destructive",
            });
          }
        }

        // Handle family group membership if family group is specified
        if (data.family_group && data.family_group.trim()) {
          try {
            // Step 1: Upsert family group
            const { data: familyGroup, error: familyGroupError } = await supabase
              .from('family_groups')
              .upsert(
                { event_id: eventId, name: data.family_group.trim() },
                { onConflict: 'event_id,name' }
              )
              .select('id')
              .single();

            if (familyGroupError) {
              console.error('Error creating family group:', familyGroupError);
              throw familyGroupError;
            }

            // Step 2: Insert memberships for new guest and pending members
            const membershipInserts = [
              { group_id: familyGroup.id, guest_id: newGuest.id }
            ];

            // Add pending family members to the group
            for (const memberId of pendingFamilyMembers) {
              membershipInserts.push({ group_id: familyGroup.id, guest_id: memberId });
            }

            const { error: membershipError } = await supabase
              .from('family_group_members')
              .upsert(membershipInserts, { onConflict: 'group_id,guest_id' });

            if (membershipError) {
              console.error('Error creating family memberships:', membershipError);
              throw membershipError;
            }

            if (pendingFamilyMembers.length > 0 || resolvedMembers.length > 0) {
              const totalMembers = pendingFamilyMembers.length + resolvedMembers.length;
              toast({
                title: guestType === 'couple' ? 'Couple added' : 'Family added',
                description: `${data.first_name} ${data.last_name} and ${totalMembers} member(s) have been grouped together.`,
              });
            } else {
              toast({
                title: "Guest Added",
                description: `${data.first_name} ${data.last_name} has been added to your guest list.`,
              });
            }
          } catch (familyError) {
            console.error('Error handling family group:', familyError);
            toast({
              title: "Guest Added",
              description: `${data.first_name} ${data.last_name} has been added, but there was an issue with the family group.`,
            });
          }
        } else {
          toast({
            title: "Guest Added",
            description: `${data.first_name} ${data.last_name} has been added to your guest list.`,
          });
        }

        // Clear pending family members and refresh
        setPendingFamilyMembers([]);
        onGuestAdded();
        handleClose();
      }
    } catch (error) {
      console.error('Error in onSubmit:', error);
      if (isGuestCapacityError(error)) { onGuestLimitReached?.(); return; }
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Sheet open={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <SheetContent
        side="right"
        className={cn("w-full sm:max-w-3xl p-0 flex flex-col overflow-hidden", "ww-edit-guest-panel ww-guest-list-drawer")}
      >
        <SheetHeader className={cn("px-4 sm:px-8 pt-6 pb-4 border-b max-lg:items-center max-lg:text-center lg:pr-12", isEdit && "ww-edit-guest-header", categoryStyles.drawerHeader)}>
          <SheetTitle className="text-xl sm:text-2xl font-medium text-primary max-lg:w-full max-lg:text-center inline-flex items-center gap-2 max-lg:justify-center">
            {isEdit
              ? <Pencil size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
              : <UserPlus size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />}
            {isEdit ? 'Edit Guest' : 'Add New Guest'}
          </SheetTitle>
          <SheetDescription className="sr-only">Enter guest details and seating preferences, then save or cancel your changes.</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 sm:space-y-4 px-4 sm:px-8 py-4 overflow-y-auto overflow-x-hidden flex-1 mobile-scroll-container">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit,onInvalid)} className={cn("space-y-3",categoryStyles.guestForm)}>
            {Object.keys(form.formState.errors).length>0&&<div role="alert" className={categoryStyles.validationSummary}><strong>Please check the highlighted fields.</strong><ul>{[...new Set(Object.values(form.formState.errors).map(error=>String(error?.message||'Check this field')))].map(message=><li key={message}>{message}</li>)}</ul></div>}
            
            {/* Guest category is the single source of truth in Add and Edit. */}
              <div className="pt-1 pb-2">
                <Label className="text-sm font-medium mb-2 block">Guest Category</Label>
                <div
                  className={categoryStyles.categoryTrack}
                  data-active-category={guestType}
                  role="group"
                  aria-label="Guest Category"
                >
                  <button
                    type="button"
                    onClick={() => selectGuestType('individual')}
                    className={cn("ww-guest-category-option", categoryStyles.categoryOption)}
                    data-active={guestType === 'individual'}
                    aria-pressed={guestType === 'individual'}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => selectGuestType('couple')}
                    className={cn("ww-guest-category-option", categoryStyles.categoryOption)}
                    data-active={guestType === 'couple'}
                    aria-pressed={guestType === 'couple'}
                  >
                    Couple
                  </button>
                  <button
                    type="button"
                    onClick={() => selectGuestType('family')}
                    className={cn("ww-guest-category-option", categoryStyles.categoryOption)}
                    data-active={guestType === 'family'}
                    aria-pressed={guestType === 'family'}
                  >
                    Family
                  </button>
                </div>
              </div>

            {/* Basic Information - Stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><UserRound size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />First Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter first name" 
                        className="rounded-full border-2 border-primary focus-visible:border-primary focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><UserRound size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Last Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter last name" 
                        className="rounded-full border-2 border-primary focus-visible:border-primary focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information - Stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Phone size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Mobile</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter mobile number" 
                        type="tel"
                        autoComplete="tel"
                        className="rounded-full border-2 border-primary focus-visible:border-primary focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9"
                        {...field} 
                        onChange={(event) => {
                          const value = event.target.value;
                          try { field.onChange(normalizeGuestPhone(value)); }
                          catch { field.onChange(value); }
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{guestPhoneHint()}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Mail size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter email address" 
                        className="rounded-full border-2 border-primary focus-visible:border-primary focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {(selectedEvent as any)?.collect_guest_addresses === true && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name={"mailing_address" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><MapPin size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Mailing Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Street address"
                          className="rounded-full border-2 border-primary focus-visible:border-primary focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name={"mailing_suburb" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suburb</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Suburb"
                            className="rounded-full border-2 border-primary focus-visible:border-primary focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={"mailing_state" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="State"
                            className="rounded-full border-2 border-primary focus-visible:border-primary focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <FormField
                    control={form.control}
                    name={"mailing_postcode" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postcode</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Postcode"
                            className="rounded-full border-2 border-primary focus-visible:border-primary focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
            )}

            {/* Table Assignment - Stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                control={form.control}
                name="table_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Table2 size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      Table *
                    </FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      handleTableChange(value);
                    }} value={field.value} disabled={tablesLoading && tables.length === 0}>
                      <FormControl>
                        <SelectTrigger className="w-full border-2 border-primary hover:border-primary focus:border-primary focus:border-[3px] focus:ring-0 focus:outline-none rounded-full h-9">
                          <SelectValue placeholder={tablesLoading && tables.length === 0 ? "Loading tables..." : "Select table"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="ww-guest-list-menu">
                        {tables.map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            {table.table_no ? `Table ${table.table_no}${table.name && table.name !== String(table.table_no) ? ` - ${table.name}` : ''}` : table.name}
                            <Badge variant="secondary" className="ml-2">
                              {table.guest_count}/{table.limit_seats}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seat_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Users size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Seat Number *</FormLabel>
                    <Select
                      onValueChange={(value) => { field.onChange(!value || value === "none" ? undefined : Number(value)); form.clearErrors('seat_no'); }}
                      value={field.value?.toString() || "none"}
                      disabled={!form.watch('table_id')}
                    >
                      <FormControl>
                        <SelectTrigger className={`w-full border-2 ${form.formState.errors.seat_no ? 'border-destructive hover:border-destructive focus:border-destructive' : 'border-primary hover:border-primary focus:border-primary'} focus:border-[3px] focus:ring-0 focus:outline-none rounded-full h-9`}>
                          <SelectValue placeholder="Select seat" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="ww-guest-list-menu">
                        {form.watch('table_id') && 
                          getAvailableSeatNumbers(form.watch('table_id')!).map((seatNum) => {
                            const seatInfo = getSeatDisplayInfo(form.watch('table_id')!, seatNum);
                            return (
                              <SelectItem 
                                key={seatNum} 
                                value={seatNum.toString()}
                                disabled={seatInfo.disabled}
                              >
                                {seatInfo.label}
                              </SelectItem>
                            );
                          })
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            {isEdit && editGuest && (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={allowPlusOne} onChange={(event) => setAllowPlusOne(event.target.checked)} />
                Allow + Guest
              </label>
            )}

            {isEdit && editGuest && (
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">RSVP Invite Status</Label>
                <Select value={manualInviteStatus} onValueChange={setManualInviteStatus}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="ww-guest-list-menu">
                    <SelectItem value="not_sent">Not Sent</SelectItem>
                    <SelectItem value="email_sent">Email Sent</SelectItem>
                    <SelectItem value="sms_sent">SMS Sent</SelectItem>
                    <SelectItem value="both_sent">Both Sent</SelectItem>
                    <SelectItem value="mail_sent">Physical Mail Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Relation - visible in BOTH Add and Edit modes (hidden only when relations turned off). Placed BELOW Seat Number, ABOVE Dietary. */}
            {!(relationsHiddenProp ?? ((selectedEvent as any)?.relation_mode === 'off')) && (() => {
              const hasRelation = !!(form.watch('relation_partner') && form.watch('relation_role'));
              return (
                <div className="space-y-1">
                  <Label>
                    Relation
                     <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="w-full px-3 py-2 text-sm rounded-full border-2 border-primary/30 bg-muted/30">
                      {hasRelation
                        ? computeRelationDisplay(
                            form.watch('relation_partner') as RelationPartner,
                            form.watch('relation_role') as RelationRole,
                            selectedEvent?.partner1_name,
                            selectedEvent?.partner2_name,
                            relationSettings.custom_roles
                          )
                        : <span className="text-muted-foreground">No relation set</span>
                      }
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn("w-full h-9 rounded-full border-primary text-primary hover:bg-primary/10", isEdit && "ww-edit-assign-relation")}
                      onClick={() => {
                        const firstName = form.getValues('first_name') || 'New guest';
                        const lastName = form.getValues('last_name') || '';
                        const name = `${firstName} ${lastName}`.trim();
                        setPeopleToAssign([{ name, index: -1 }]);
                        // In Add mode we do NOT set pendingFormData — that would trigger auto-submit on dialog complete.
                        if (isEdit) {
                          setPendingFormData(form.getValues());
                        }
                        setShowRelationAssignment(true);
                      }}
                    >
                      {hasRelation ? 'Assign Relation' : 'Assign Relation'}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* RSVP and Dietary - Stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="rsvp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ClipboardCheck size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      RSVP Status
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full border-2 border-primary hover:border-primary focus:border-primary focus:border-[3px] focus:ring-0 focus:outline-none rounded-full h-9">
                          <SelectValue placeholder="Select RSVP status" />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent className="ww-guest-list-menu">
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Attending">Accept</SelectItem>
                          <SelectItem value="Not Attending">Decline</SelectItem>
                       </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dietary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Utensils size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      Dietary Requirements
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full border-2 border-primary hover:border-primary focus:border-primary focus:border-[3px] focus:ring-0 focus:outline-none rounded-full h-9">
                          <SelectValue placeholder="Select dietary requirements" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="ww-guest-list-menu">
                        <SelectItem value="NA">Not Applicable</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Kids Meal">Kids Meal</SelectItem>
                        <SelectItem value="Pescatarian">Pescatarian</SelectItem>
                        <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="Vegan">Vegan</SelectItem>
                        <SelectItem value="Seafood Free">Seafood Free</SelectItem>
                        <SelectItem value="Gluten Free">Gluten Free</SelectItem>
                        <SelectItem value="Dairy Free">Dairy Free</SelectItem>
                        <SelectItem value="Nut Free">Nut Free</SelectItem>
                        <SelectItem value="Halal">Halal</SelectItem>
                        <SelectItem value="Kosha">Kosha</SelectItem>
                        <SelectItem value="Vendor">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Party Members Section - Show for Couple/Family */}
            {(guestType === 'couple' || guestType === 'family') && (
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between max-lg:flex-col max-lg:items-stretch max-lg:gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium text-green-500 rounded-full px-3 py-1 max-lg:self-start",
                      categoryStyles.memberCountBadge,
                    )}
                    data-has-members={existingGroupMemberCount + partyMembers.length > 0}
                  >
                    <Users className="w-4 h-4" />
                    <span>Members ({existingGroupMemberCount + partyMembers.length})</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingMemberIndex(null);
                      setMemberForm({ first_name: '', last_name: '', mobile: '', email: '', dietary: 'None' });
                      setShowAddMemberForm(true);
                    }}
                    disabled={guestType === 'couple' && existingGroupMemberCount + partyMembers.length >= 1}
                    data-member-category={guestType}
                    className={cn("lv-premium-shade rounded-full text-white border-0 max-lg:w-full max-lg:whitespace-normal max-lg:h-auto max-lg:py-2 max-lg:text-center max-lg:leading-snug",categoryStyles.memberAction)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {guestType === 'couple' ? 'Add your partner to make you a couple' : 'Add another member to this family'}
                  </Button>
                </div>

                {/* Add Member Form */}
                {showAddMemberForm && (
                  <div className="bg-[#F5F0EB] p-4 max-lg:p-3 rounded-lg space-y-3 border border-[#967A59]/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="party-member-first-name" className="text-xs">First Name *</Label>
                        <Input id="party-member-first-name"
                          value={memberForm.first_name}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, first_name: e.target.value }))}
                          placeholder="First name"
                          className="rounded-full border-[#967A59] text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="party-member-last-name" className="text-xs">Last Name *</Label>
                        <Input id="party-member-last-name"
                          value={memberForm.last_name}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, last_name: e.target.value }))}
                          placeholder="Last name"
                          className="rounded-full border-[#967A59] text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="party-member-mobile" className="text-xs">Mobile</Label>
                        <Input id="party-member-mobile"
                          value={memberForm.mobile}
                          type="tel"
                          onChange={(e) => {
                            let mobile = e.target.value;
                            try { mobile = normalizeGuestPhone(mobile); } catch { /* Keep incomplete typing. */ }
                            setMemberForm(prev => ({ ...prev, mobile }));
                          }}
                          placeholder="Mobile (optional)"
                          className="rounded-full border-[#967A59] text-sm"
                        />
                        <p className="text-xs text-muted-foreground">{guestPhoneHint()}</p>
                      </div>
                      <div>
                        <Label htmlFor="party-member-email" className="text-xs">Email</Label>
                        <Input id="party-member-email"
                          value={memberForm.email}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Email (optional)"
                          className="rounded-full border-[#967A59] text-sm"
                        />
                      </div>
                    </div>
                    <div className={`grid grid-cols-2 gap-2 ${categoryStyles.actionFooter}`}>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={addPartyMember}
                        className="ww-emboss-green lv-premium-shade rounded-full bg-green-500 hover:bg-green-600 text-white w-full"
                      >
                        {editingMemberIndex === null ? 'Add Member' : 'Save Changes'}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={resetMemberEditor}
                        className="ww-emboss-red lv-premium-shade rounded-full bg-red-600 hover:bg-red-700 text-white w-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Display Added Members */}
                {partyMembers.length > 0 && (
                  <div className="space-y-1">
                    {partyMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between gap-2 bg-white py-1 px-2 rounded-lg border border-gray-200">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-primary">{member.first_name} {member.last_name}</p>
                          {(member.mobile || member.email) && (
                            <p className="text-xs text-muted-foreground break-words">
                              {member.mobile && member.mobile}
                              {member.email && ` • ${member.email}`}
                            </p>
                          )}
                        </div>
                        <TooltipProvider>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  aria-label="Edit Guest"
                                  onClick={() => editMember(index)}
                                  className="ww-emboss-green ww-emboss-green-soft h-9 w-9 rounded-full border-0 bg-green-500 p-0 text-white hover:bg-green-600 hover:text-white"
                                >
                                  <Pencil className="h-4 w-4 text-white" strokeWidth={2} aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Guest</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  aria-label="Delete Guest"
                                  onClick={() => removeMember(index)}
                                  className="ww-emboss-red h-9 w-9 rounded-full border-0 bg-red-600 p-0 text-white hover:bg-red-700 hover:text-white"
                                >
                                  <Trash2 className="h-4 w-4 text-white" strokeWidth={2} aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Guest</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </div>
                    ))}
                  </div>
                )}

                {guestType === 'couple' && partyMembers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Add one more person to create a couple
                  </p>
                )}
                {guestType === 'family' && partyMembers.length < 2 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Add two or more people to create a family
                  </p>
                )}
              </div>
            )}


            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => {
                const rawValue = field.value || '';
                const separatorMatch = rawValue.match(/────+/);
                const hasAlertNote = /has added:/i.test(rawValue);
                
                let alertSection = '';
                let userNotes = rawValue;
                
                if (hasAlertNote && separatorMatch) {
                  const sepIndex = rawValue.indexOf(separatorMatch[0]);
                  alertSection = rawValue.substring(0, sepIndex).trim();
                  userNotes = rawValue.substring(sepIndex + separatorMatch[0].length).trim();
                }

                return (
                  <FormItem className={cn(isEdit && "ww-edit-notes")}>
                    <FormLabel className="flex items-center gap-1.5"><StickyNote size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Notes</FormLabel>
                    <div className="space-y-0">
                        {alertSection && (
                          <div className="rounded-t-3xl border-2 border-b-0 border-[#967A59] px-3 py-2 bg-background">
                            <p className="text-red-600 font-bold text-sm whitespace-pre-wrap">{alertSection}</p>
                            <hr className="border-t-[3px] border-black mt-2" />
                          </div>
                        )}
                        <FormControl>
                        <Textarea 
                          placeholder="Add any additional notes about this guest..."
                          className={cn(
                            "border-2 border-[#967A59] focus-visible:border-[#967A59] focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none resize-y min-h-[80px]",
                            alertSection ? "rounded-t-none rounded-b-3xl border-t-0" : "rounded-3xl"
                          )}
                          value={hasAlertNote && separatorMatch ? userNotes : rawValue}
                          onChange={(e) => {
                            if (hasAlertNote && separatorMatch) {
                              const sep = separatorMatch[0];
                              field.onChange(`${alertSection}\n${sep}\n${e.target.value}`);
                            } else {
                              field.onChange(e.target.value);
                            }
                          }}
                        />
                    </FormControl>
                      </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

          </form>
        </Form>
        </div>

        <div className={`border-t px-4 sm:px-8 py-4 flex flex-col-reverse gap-3 max-lg:grid max-lg:grid-cols-2 max-lg:gap-3 sm:flex-row sm:justify-end sm:space-x-2 sm:gap-0 ${categoryStyles.actionFooter}`}>
          <Button
            type="submit"
            variant="default"
            size="xs"
            className="inline-flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white max-lg:order-1 max-lg:w-full max-lg:h-11 sm:order-1 lv-premium-shade bg-green-400 lg:h-12 lg:px-8 lg:text-base lg:font-semibold"
            disabled={loading}
            onClick={form.handleSubmit(onSubmit,onInvalid)}
          >
            <Save size={18} strokeWidth={1.8} className="inline-block mr-2 text-white" aria-hidden="true" />
            {loading ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Guest' : 'Add Guest')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="xs"
            className="inline-flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white max-lg:order-2 max-lg:w-full max-lg:h-11 sm:order-2 lv-premium-shade lg:h-12 lg:px-8 lg:text-base lg:font-semibold"
            onClick={handleClose}
            disabled={loading}
          >
            <X size={18} strokeWidth={1.8} className="inline-block mr-2 text-white" aria-hidden="true" />
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>

      <GroupTypeDialog
        isOpen={showGroupTypeDialog}
        onClose={() => {
          setShowGroupTypeDialog(false);
          setPendingEditSaveData(null);
          // Still complete the edit without grouping
          if (pendingEditSaveData) {
            toast({
              title: "Guest Updated",
              description: `Guest has been updated (no group created).`,
            });
            onGuestAdded();
            handleClose();
          }
        }}
        onConfirm={handleGroupTypeConfirm}
        guestNames={[
          pendingEditSaveData ? `${pendingEditSaveData.data.first_name} ${pendingEditSaveData.data.last_name}` : '',
          ...pendingMemberNames
        ].filter(Boolean)}
        totalMembers={1 + pendingFamilyMembers.length}
      />

      {/* Relation Assignment Step-by-Step Dialog */}
      <RelationAssignmentDialog
        isOpen={showRelationAssignment}
        onClose={() => {
          setShowRelationAssignment(false);
          setPendingFormData(null);
          setPeopleToAssign([]);
        }}
        onComplete={(assignments) => {
          // Apply main guest relation
          const mainAssignment = assignments[0];
          if (mainAssignment) {
            form.setValue('relation_partner', mainAssignment.partner);
            form.setValue('relation_role', mainAssignment.role);
            if (isHostRelation(mainAssignment.role)) form.setValue('rsvp', 'Attending');
          }
          
          // For edit mode, just update form values — don't re-submit
          if (isEdit) {
            setShowRelationAssignment(false);
            setPeopleToAssign([]);
            setPendingFormData(null);
            return;
          }
          
          // Add mode opened via "Set" button (no pending submission) — just write values and close.
          if (!pendingFormData) {
            setShowRelationAssignment(false);
            setPeopleToAssign([]);
            return;
          }
          
          setShowRelationAssignment(false);
          setPeopleToAssign([]);
          
          // Re-submit with the primary guest's relation only. Additional couple
          // and family members intentionally start without a relationship.
          const updatedData = {
            ...pendingFormData!,
            relation_partner: mainAssignment?.partner || '',
            relation_role: mainAssignment?.role || '',
          };
          setPendingFormData(null);
          
          // Call onSubmit directly with the updated data
          onSubmit(updatedData);
        }}
        people={peopleToAssign}
        partner1Name={selectedEvent?.partner1_name}
        partner2Name={(selectedEvent as any)?.relation_mode === 'two' ? selectedEvent?.partner2_name : undefined}
        customRoles={relationSettings.custom_roles}
        allowCustomRoles={relationSettings.relation_allow_custom_role}
        isSinglePerson={(selectedEvent as any)?.relation_mode === 'single'}
        eventId={eventId}
        relationRequired={false}
        onCustomRoleAdded={(updatedRoles) => {
          setRelationSettings(prev => ({
            ...prev,
            custom_roles: updatedRoles
          }));
        }}
      />
    </>
  );
};
