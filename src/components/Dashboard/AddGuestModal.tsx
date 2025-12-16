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

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { secureGuestSchema, type SecureGuestData } from "@/lib/security/validation";
import { logSecurityEvent, guestAddRateLimiter } from "@/lib/security/monitoring";
import { sanitize, InputSanitizer } from "@/lib/security/inputSanitizer";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { X, AlertCircle, Users, Utensils, Calendar, MapPin, Plus, RefreshCw } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTables } from "@/hooks/useTables";
import { computeRelationDisplay, RelationPartner, RelationRole } from "@/lib/relationUtils";
import { cn } from "@/lib/utils";
import { normalizeRsvp } from "@/lib/rsvp";
import { useEvents } from "@/hooks/useEvents";
import { RelationSelector } from "./RelationSelector";
import { FamilyGroupCombobox } from "./FamilyGroupCombobox";

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
    relation_partner: string;
    relation_role: string;
    relation_display: string;
  } | null;
  isEdit?: boolean;
}

export const AddGuestModal: React.FC<AddGuestModalProps> = ({
  isOpen,
  onClose,
  onGuestAdded,
  eventId,
  editGuest,
  isEdit = false,
}) => {
  const { toast } = useToast();
  const { tables } = useTables(eventId);
  const { events } = useEvents();
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
  
  // Swap seat functionality
  const [swapWithGuestId, setSwapWithGuestId] = useState<string | null>(null);
  const [sameTableGuests, setSameTableGuests] = useState<{id: string, name: string, seat_no: number}[]>([]);

  // Guest type selection state
  const [guestType, setGuestType] = useState<'individual' | 'couple' | 'family'>('individual');
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
  const [memberForm, setMemberForm] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
    email: '',
    dietary: 'None'
  });

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
        });
      }
    }
  }, [isOpen, isEdit, editGuest, form]);

  const handleClose = () => {
    form.reset();
    setRelationSelectorOpen(false);
    setGuestType('individual');
    setPartyMembers([]);
    setShowAddMemberForm(false);
    setMemberForm({ first_name: '', last_name: '', mobile: '', email: '', dietary: 'None' });
    setSwapWithGuestId(null);
    setSameTableGuests([]);
    onClose();
  };

  const addPartyMember = () => {
    if (!memberForm.first_name || !memberForm.last_name) {
      toast({
        title: "Missing information",
        description: "Please enter first and last name for the party member",
        variant: "destructive"
      });
      return;
    }

    setPartyMembers(prev => [...prev, memberForm]);
    setMemberForm({ first_name: '', last_name: '', mobile: '', email: '', dietary: 'None' });
    setShowAddMemberForm(false);
    
    toast({
      title: "Member added",
      description: `${memberForm.first_name} ${memberForm.last_name} added to the party`
    });
  };

  const removeMember = (index: number) => {
    setPartyMembers(prev => prev.filter((_, i) => i !== index));
  };

  const handleRelationChange = (partner: RelationPartner, role: RelationRole) => {
    form.setValue('relation_partner', partner);
    form.setValue('relation_role', role);
    form.clearErrors(['relation_partner', 'relation_role']);
  };

  // Fetch taken seats for a specific table
  const fetchTakenSeats = useCallback(async (tableId: string) => {
    if (!tableId || tableId === "none") {
      setTakenSeats(prev => ({ ...prev, [tableId]: [] }));
      setSameTableGuests([]);
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

      // For swap dropdown: show all other guests on the same table (exclude current guest)
      if (isEdit && editGuest) {
        const otherGuests = allGuests
          .filter(g => g.guestId !== editGuest.id)
          .map(g => ({
            id: g.guestId,
            name: g.guestName,
            seat_no: g.seatNo
          }));
        setSameTableGuests(otherGuests);
      }

      const taken = allGuests
        .filter(guest => 
          // Exclude current guest when editing
          isEdit && editGuest ? guest.guestId !== editGuest.id : true
        );

      setTakenSeats(prev => ({ ...prev, [tableId]: taken }));
    } catch (error) {
      console.error('Error fetching taken seats:', error);
      setTakenSeats(prev => ({ ...prev, [tableId]: [] }));
      setSameTableGuests([]);
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
    const isCurrentSeat = isEdit && editGuest && editGuest.seat_no === seatNo;
    
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

  const onSubmit = async (data: AddGuestFormData) => {
    setLoading(true);
    
    try {
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
      // Get current event's relation mode (type assertion needed as types haven't been regenerated yet)
      const relationMode = (selectedEvent as any)?.relation_mode || 'two';
      
      // Validate required relation if setting is enabled AND relation mode is not 'off'
      if (relationMode !== 'off' && relationSettings.relation_required) {
        if (!data.relation_partner || !data.relation_role) {
          form.setError('relation_partner', {
            type: 'manual',
            message: 'Partner and role are required'
          });
          form.setError('relation_role', {
            type: 'manual',
            message: 'Partner and role are required'
          });

          // Scroll to the field
          const relationField = document.querySelector('[data-field="relation"]');
          if (relationField) {
            relationField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }

          setLoading(false);
          return;
        }
      }

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
      const guestData = {
        event_id: eventId,
        user_id: (await supabase.auth.getUser()).data.user?.id!,
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
        relation_partner: data.relation_partner,
        relation_role: data.relation_role,
        relation_display: relationDisplay,
      };

      if (isEdit && editGuest) {
        // Handle seat swap if selected
        if (swapWithGuestId && editGuest.seat_no) {
          const swapGuest = sameTableGuests.find(g => g.id === swapWithGuestId);
          if (swapGuest) {
            // Update the other guest to take current guest's seat
            const { error: swapError } = await supabase
              .from('guests')
              .update({ seat_no: editGuest.seat_no })
              .eq('id', swapWithGuestId);
            
            if (swapError) {
              console.error('Error swapping seat:', swapError);
              toast({
                title: "Swap Failed",
                description: "Failed to swap seats. Please try again.",
                variant: "destructive",
              });
              setLoading(false);
              return;
            }
            
            // Update current guest to take the other guest's seat
            finalGuestData.seat_no = swapGuest.seat_no;
          }
        }

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
            setLoading(false);
            return;
          }
          
          toast({
            title: "Error",
            description: "Failed to update guest. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Guest Updated",
            description: `${data.first_name} ${data.last_name} has been updated successfully.`,
          });
          onGuestAdded();
          handleClose();
        }
      } else {
        // Auto-generate family group name for couples and families
        let autoFamilyGroup = '';
        if (guestType === 'couple' && partyMembers.length === 1) {
          autoFamilyGroup = `${data.last_name} & ${partyMembers[0].last_name}`;
        } else if (guestType === 'family' && partyMembers.length >= 1) {
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
        if (partyMembers.length > 0 && autoFamilyGroup) {
          const { data: authData } = await supabase.auth.getUser();
          const memberInserts = partyMembers.map(member => ({
            event_id: eventId,
            user_id: authData.user?.id!,
            first_name: member.first_name,
            last_name: member.last_name,
            mobile: member.mobile || null,
            email: member.email || null,
            dietary: member.dietary || 'None',
            table_id: member.table_id || null,
            seat_no: member.seat_no || null,
            family_group: autoFamilyGroup,
            rsvp: 'Pending',
            relation_partner: '',
            relation_role: '',
            relation_display: ''
          }));

          const { error: membersError } = await supabase
            .from('guests')
            .insert(memberInserts);

          if (membersError) {
            console.error('Error adding party members:', membersError);
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

            if (pendingFamilyMembers.length > 0 || partyMembers.length > 0) {
              const totalMembers = pendingFamilyMembers.length + partyMembers.length;
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col px-10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium text-[#7248e6]">
            {isEdit ? 'Edit Guest' : 'Add New Guest'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Guest Type Selector - Only show for new guests */}
            {!isEdit && (
              <div className="pt-2 pb-4">
                <div className="flex items-center justify-center gap-0 bg-[#7248e6]/10 border-2 border-[#7248e6] rounded-full p-1 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setGuestType('individual');
                      setPartyMembers([]);
                    }}
                    className={cn(
                      "flex-1 py-2 px-6 rounded-full text-sm font-medium transition-all duration-200",
                      guestType === 'individual'
                        ? "bg-[#ff1493] text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGuestType('couple');
                      if (partyMembers.length > 1) {
                        setPartyMembers([partyMembers[0]]);
                      }
                    }}
                    className={cn(
                      "flex-1 py-2 px-6 rounded-full text-sm font-medium transition-all duration-200",
                      guestType === 'couple'
                        ? "bg-[#FF5F1F] text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Couple
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestType('family')}
                    className={cn(
                      "flex-1 py-2 px-6 rounded-full text-sm font-medium transition-all duration-200",
                      guestType === 'family'
                        ? "bg-[#0000FF] text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Family
                  </button>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter first name" 
                        className="rounded-full border-2 border-[#7248e6] focus-visible:border-[#7248e6] focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none"
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
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter last name" 
                        className="rounded-full border-2 border-[#7248e6] focus-visible:border-[#7248e6] focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter mobile number" 
                        className="rounded-full border-2 border-[#7248e6] focus-visible:border-[#7248e6] focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter email address" 
                        className="rounded-full border-2 border-[#7248e6] focus-visible:border-[#7248e6] focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Table Assignment */}
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="table_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Table *
                    </FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      handleTableChange(value);
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full border-2 border-[#7248e6] hover:border-[#7248e6] focus:border-[#7248e6] focus:border-[3px] focus:ring-0 focus:outline-none rounded-full">
                          <SelectValue placeholder="Select table" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tables.map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            {table.table_no ? `Table ${table.table_no}` : table.name} - {table.name}
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
                    <FormLabel>Seat Number *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(!value || value === "none" ? undefined : Number(value))}
                      value={field.value?.toString() || "none"}
                      disabled={!form.watch('table_id')}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full border-2 border-[#7248e6] hover:border-[#7248e6] focus:border-[#7248e6] focus:border-[3px] focus:ring-0 focus:outline-none rounded-full">
                          <SelectValue placeholder="Select seat" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

            {/* Swap Seat With - Only shown when editing a seated guest */}
            {isEdit && editGuest?.seat_no && sameTableGuests.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <RefreshCw className="w-4 h-4" />
                  Swap Seat With
                </Label>
                <Select 
                  value={swapWithGuestId || "none"} 
                  onValueChange={(value) => setSwapWithGuestId(value === "none" ? null : value)}
                >
                  <SelectTrigger className="w-full border-2 border-[#7248e6] hover:border-[#7248e6] focus:border-[#7248e6] focus:border-[3px] focus:ring-0 focus:outline-none rounded-full">
                    <SelectValue placeholder="Select guest to swap seats with..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Don't swap</SelectItem>
                    {sameTableGuests.map(guest => (
                      <SelectItem key={guest.id} value={guest.id}>
                        {guest.name} — Seat {guest.seat_no}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a guest to swap seats with. Both guests' seat numbers will be exchanged.
                </p>
              </div>
            )}

            {/* RSVP Date */}
            <FormField
              control={form.control}
              name="rsvp_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RSVP Date</FormLabel>
                  <FormControl>
                    <EventDatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select RSVP date"
                      dateFormat="dd/MM/yyyy"
                      allowPastDates={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* RSVP and Dietary */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rsvp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      RSVP Status
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full border-2 border-[#7248e6] hover:border-[#7248e6] focus:border-[#7248e6] focus:border-[3px] focus:ring-0 focus:outline-none rounded-full">
                          <SelectValue placeholder="Select RSVP status" />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent>
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
                      <Utensils className="w-4 h-4" />
                      Dietary Requirements
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full border-2 border-[#7248e6] hover:border-[#7248e6] focus:border-[#7248e6] focus:border-[3px] focus:ring-0 focus:outline-none rounded-full">
                          <SelectValue placeholder="Select dietary requirements" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                        <SelectItem value="Vendor Meal">Vendor Meal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Party Members Section - Show for Couple/Family */}
            {!isEdit && (guestType === 'couple' || guestType === 'family') && (
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#7248e6]">
                    <Users className="w-4 h-4" />
                    <span>Party Members ({partyMembers.length})</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddMemberForm(true)}
                    disabled={guestType === 'couple' && partyMembers.length >= 1}
                    className="rounded-full border-[#7248e6] text-[#7248e6] hover:bg-[#7248e6]/10"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add a member to this party
                  </Button>
                </div>

                {/* Add Member Form */}
                {showAddMemberForm && (
                  <div className="bg-purple-50 p-4 rounded-lg space-y-3 border border-[#7248e6]/20">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">First Name *</Label>
                        <Input
                          value={memberForm.first_name}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, first_name: e.target.value }))}
                          placeholder="First name"
                          className="rounded-full border-[#7248e6] text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Last Name *</Label>
                        <Input
                          value={memberForm.last_name}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, last_name: e.target.value }))}
                          placeholder="Last name"
                          className="rounded-full border-[#7248e6] text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Mobile</Label>
                        <Input
                          value={memberForm.mobile}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, mobile: e.target.value }))}
                          placeholder="Mobile (optional)"
                          className="rounded-full border-[#7248e6] text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Email</Label>
                        <Input
                          value={memberForm.email}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Email (optional)"
                          className="rounded-full border-[#7248e6] text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAddMemberForm(false);
                          setMemberForm({ first_name: '', last_name: '', mobile: '', email: '', dietary: 'None' });
                        }}
                        className="rounded-full"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={addPartyMember}
                        className="rounded-full bg-[#7248e6] hover:bg-[#7248e6]/90"
                      >
                        Add Member
                      </Button>
                    </div>
                  </div>
                )}

                {/* Display Added Members */}
                {partyMembers.length > 0 && (
                  <div className="space-y-2">
                    {partyMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{member.first_name} {member.last_name}</p>
                          {(member.mobile || member.email) && (
                            <p className="text-xs text-muted-foreground">
                              {member.mobile && member.mobile}
                              {member.email && ` • ${member.email}`}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(index)}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
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

            {/* Family Group */}
            <FormField
              control={form.control}
              name="family_group"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Family Group</FormLabel>
                  <FormControl>
                    <FamilyGroupCombobox
                      eventId={eventId}
                      value={field.value || ""}
                      onChange={(familyName: string, memberIds: string[]) => {
                        field.onChange(familyName);
                        setPendingFamilyMembers(memberIds);
                      }}
                      currentGuestId={editGuest?.id}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Relation Field - Only show if relation mode is not 'off' */}
            {(selectedEvent as any)?.relation_mode !== 'off' && (
              <div data-field="relation">
                <FormField
                  control={form.control}
                  name="relation_partner"
                  render={() => (
                    <FormItem>
                      <FormLabel>
                        Relation
                        {relationSettings.relation_required && <span className="text-red-500 ml-1">*</span>}
                      </FormLabel>
                      <FormControl>
                        <div>
                          <RelationSelector
                            value={{
                              partner: form.watch('relation_partner') as RelationPartner,
                              role: form.watch('relation_role') as RelationRole,
                            }}
                            onChange={handleRelationChange}
                            partner1Name={selectedEvent?.partner1_name}
                            partner2Name={(selectedEvent as any)?.relation_mode === 'two' ? selectedEvent?.partner2_name : undefined}
                            customRoles={relationSettings.custom_roles}
                            allowCustomRoles={relationSettings.relation_allow_custom_role}
                            isSinglePerson={(selectedEvent as any)?.relation_mode === 'single'}
                            isOpen={relationSelectorOpen}
                            onToggle={() => setRelationSelectorOpen(!relationSelectorOpen)}
                            error={form.formState.errors.relation_partner?.message || form.formState.errors.relation_role?.message}
                            eventId={eventId}
                            onCustomRoleAdded={(updatedRoles) => {
                              setRelationSettings(prev => ({
                                ...prev,
                                custom_roles: updatedRoles
                              }));
                            }}
                          />
                        </div>
                      </FormControl>
                      {(form.formState.errors.relation_partner || form.formState.errors.relation_role) && (
                        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {form.formState.errors.relation_partner?.message || form.formState.errors.relation_role?.message}
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional notes about this guest..."
                      className="rounded-3xl border-2 border-[#7248e6] focus-visible:border-[#7248e6] focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </form>
        </Form>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="destructive" 
            size="xs" 
            className="rounded-full bg-red-600 hover:bg-red-700 text-white" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="default" 
            size="xs" 
            className="rounded-full bg-green-500 hover:bg-green-600 text-white" 
            disabled={loading}
            onClick={form.handleSubmit(onSubmit)}
          >
            {loading ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Guest' : 'Add Guest')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};