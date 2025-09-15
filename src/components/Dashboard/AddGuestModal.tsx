import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/enhanced-button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTables } from "@/hooks/useTables";
import { computeWhoIsDisplay, WhoIsPartner, WhoIsRole } from "@/lib/whoIsUtils";
import { useEvents } from "@/hooks/useEvents";
import { WhoIsSelector } from "./WhoIsSelector";
import { FamilyGroupCombobox } from "./FamilyGroupCombobox";

const addGuestSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  table_id: z.string().min(1, "Table is required"),
  seat_no: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return null;
    return Number(val);
  }, z.number().int().positive().optional().nullable()),
  rsvp: z.enum(['Pending', 'Attending', 'Not Attending']),
  dietary: z.enum(['NA', 'Vegan', 'Vegetarian', 'Gluten Free', 'Dairy Free', 'Nut Free', 'Seafood Free', 'Kosher', 'Halal']),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  family_group: z.string().optional(),
  notes: z.string().optional(),
  who_is_partner: z.string().min(1, "Please choose one partner and one role."),
  who_is_role: z.string().min(1, "Please choose one partner and one role."),
});

type AddGuestFormData = z.infer<typeof addGuestSchema>;

interface AddGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess: () => void;
  guest?: {
    id: string;
    first_name: string;
    last_name: string;
    table_id: string | null;
    seat_no: number | null;
    rsvp: string;
    dietary: string;
    mobile: string | null;
    email: string | null;
    notes: string | null;
    family_group?: string | null;
    who_is_partner: string;
    who_is_role: string;
    who_is_display: string;
  } | null;
  isEdit?: boolean;
}

export const AddGuestModal: React.FC<AddGuestModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onSuccess,
  guest = null,
  isEdit = false,
}) => {
  const { toast } = useToast();
  const { tables, getCurrentCount } = useTables(eventId);
  const { events } = useEvents();
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [seatOptions, setSeatOptions] = useState<number[]>([]);
  const [takenSeats, setTakenSeats] = useState<number[]>([]);
  const [tableError, setTableError] = useState<string>('');
  const [seatError, setSeatError] = useState<string>('');
  const [whoIsSelectorOpen, setWhoIsSelectorOpen] = useState(false);
  const [familyMemberIds, setFamilyMemberIds] = useState<string[]>([]);
  const [whoIsSettings, setWhoIsSettings] = useState({
    who_is_required: true,
    who_is_allow_custom_role: false,
    who_is_allow_single_partner: true,
    who_is_disable_first_guest_alert: false,
    custom_roles: [] as string[]
  });
  
  // Find current event for partner names
  const currentEvent = events.find(e => e.id === eventId);

  // Fetch Who Is settings for the current event
  useEffect(() => {
    if (currentEvent?.id) {
      const fetchWhoIsSettings = async () => {
        try {
          const { data, error } = await supabase
            .from('events')
            .select('who_is_required, who_is_allow_custom_role, who_is_allow_single_partner, who_is_disable_first_guest_alert, custom_roles')
            .eq('id', currentEvent.id)
            .single();

          if (!error && data) {
            setWhoIsSettings({
              who_is_required: data.who_is_required ?? true,
              who_is_allow_custom_role: data.who_is_allow_custom_role ?? false,
              who_is_allow_single_partner: data.who_is_allow_single_partner ?? true,
              who_is_disable_first_guest_alert: data.who_is_disable_first_guest_alert ?? false,
              custom_roles: Array.isArray(data.custom_roles) ? data.custom_roles as string[] : [],
            });
          }
        } catch (error) {
          console.error('Error fetching Who Is settings:', error);
        }
      };

      fetchWhoIsSettings();
    }
  }, [currentEvent?.id]);
  
  const form = useForm<AddGuestFormData>({
    resolver: zodResolver(addGuestSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      table_id: '',
      seat_no: null,
      rsvp: 'Pending',
      dietary: 'NA',
      mobile: '',
      email: '',
      family_group: '',
      notes: '',
      who_is_partner: '',
      who_is_role: '',
    },
  });

  // Fetch seat availability for selected table
  const fetchSeatAvailability = async (tableId: string) => {
    if (!tableId) {
      setSeatOptions([]);
      setTakenSeats([]);
      return;
    }

    const selectedTable = tables.find(t => t.id === tableId);
    if (!selectedTable) return;

    // Generate seat options (1 to limit)
    const allSeats = Array.from({ length: selectedTable.limit_seats }, (_, i) => i + 1);
    setSeatOptions(allSeats);

    // Fetch taken seats for this table
    const { data: occupiedSeats } = await supabase
      .from('guests')
      .select('seat_no')
      .eq('event_id', eventId)
      .eq('table_id', tableId)
      .not('seat_no', 'is', null);

    const taken = occupiedSeats?.map(g => g.seat_no).filter(s => s !== null) || [];
    
    // If editing, exclude current guest's seat from taken seats
    if (isEdit && guest && guest.table_id === tableId && guest.seat_no) {
      const filteredTaken = taken.filter(seat => seat !== guest.seat_no);
      setTakenSeats(filteredTaken);
    } else {
      setTakenSeats(taken);
    }
  };

  // Function to fetch family members when editing
  const fetchFamilyMembers = async (familyGroup: string, currentGuestId: string) => {
    if (!familyGroup) {
      setFamilyMemberIds([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('guests')
        .select('id')
        .eq('event_id', eventId)
        .eq('family_group', familyGroup)
        .neq('id', currentGuestId);

      if (error) {
        console.error('Error fetching family members:', error);
        return;
      }

      const memberIds = data?.map(g => g.id) || [];
      setFamilyMemberIds(memberIds);
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  // Reset form when guest prop changes (for edit mode)
  useEffect(() => {
    if (isOpen) {
      setTableError('');
      setSeatError('');
      setWhoIsSelectorOpen(false);
      
      if (guest && isEdit) {
        const guestTableId = guest.table_id || '';
        setSelectedTableId(guestTableId);
        
        form.reset({
          first_name: guest.first_name || '',
          last_name: guest.last_name || '',
          table_id: guestTableId,
          seat_no: guest.seat_no || null,
          rsvp: (guest.rsvp as 'Pending' | 'Attending' | 'Not Attending') || 'Pending',
          dietary: (guest.dietary as 'NA' | 'Vegan' | 'Vegetarian' | 'Gluten Free' | 'Dairy Free' | 'Nut Free' | 'Seafood Free' | 'Kosher' | 'Halal') || 'NA',
          mobile: guest.mobile || '',
          email: guest.email || '',
          family_group: guest.family_group || '',
          notes: guest.notes || '',
          who_is_partner: guest.who_is_partner || '',
          who_is_role: guest.who_is_role || '',
        });
        
        // Fetch family members if guest has a family group
        if (guest.family_group) {
          fetchFamilyMembers(guest.family_group, guest.id);
        } else {
          setFamilyMemberIds([]);
        }
        
        if (guestTableId) {
          fetchSeatAvailability(guestTableId);
        }
      } else {
        setSelectedTableId('');
        setFamilyMemberIds([]); // Reset family members for new guest
        form.reset({
          first_name: '',
          last_name: '',
          table_id: '',
          seat_no: null,
          rsvp: 'Pending',
          dietary: 'NA',
          mobile: '',
          email: '',
          family_group: '',
          notes: '',
          who_is_partner: '',
          who_is_role: '',
        });
      }
    }
  }, [isOpen, guest, isEdit, form, tables, eventId]);

  // Handle table selection change
  const handleTableChange = (tableId: string) => {
    setSelectedTableId(tableId);
    setTableError('');
    setSeatError('');
    
    // Reset seat selection when table changes
    form.setValue('seat_no', null);
    
    // Check if table is full
    const selectedTable = tables.find(t => t.id === tableId);
    if (selectedTable && selectedTable.guest_count >= selectedTable.limit_seats) {
      setTableError('Table reached guest limit — You can change the limit in each table.');
    }
    
    fetchSeatAvailability(tableId);
  };

  // Handle Who Is selector change
  const handleWhoIsChange = (partner: WhoIsPartner, role: WhoIsRole) => {
    form.setValue('who_is_partner', partner);
    form.setValue('who_is_role', role);
    form.clearErrors(['who_is_partner', 'who_is_role']);
  };

  // Handle family group change
  const handleFamilyGroupChange = (familyName: string, memberIds: string[]) => {
    form.setValue('family_group', familyName);
    setFamilyMemberIds(memberIds);
  };

  const onSubmit = async (data: AddGuestFormData) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Error",
          description: "You must be logged in to manage guests",
          variant: "destructive",
        });
        return;
      }

      // Validate table capacity using centralized count function
      const selectedTable = tables.find(t => t.id === data.table_id);
      if (!selectedTable) {
        setTableError('Please select a valid table');
        return;
      }

      // Get fresh count using single source of truth
      const currentCount = await getCurrentCount(data.table_id);
      
      // If editing, exclude current guest from count when checking capacity
      const adjustedCount = isEdit && guest && guest.table_id === data.table_id 
        ? currentCount - 1 
        : currentCount;

      if (adjustedCount >= selectedTable.limit_seats) {
        setTableError('Table reached guest limit — You can change the limit in each table.');
        return;
      }

      // Fresh check for seat availability - only if a seat is selected
      if (data.seat_no !== null) {
        const { data: seatCheck } = await supabase
          .from('guests')
          .select('id')
          .eq('event_id', eventId)
          .eq('table_id', data.table_id)
          .eq('seat_no', data.seat_no);

        // If editing, exclude current guest from seat check
        const seatTaken = seatCheck?.filter(g => !isEdit || g.id !== guest?.id).length > 0;
        
        if (seatTaken) {
          setSeatError('This seat is already taken');
          return;
        }
      }

      // Validate Who Is fields
      if (!data.who_is_partner || !data.who_is_role) {
        form.setError('who_is_partner', {
          type: 'manual',
          message: 'Please choose one partner and one role.'
        });
        form.setError('who_is_role', {
          type: 'manual',
          message: 'Please choose one partner and one role.'
        });
        
        // Scroll to Who Is field
        const whoIsField = document.querySelector('[data-field="who-is"]');
        if (whoIsField) {
          whoIsField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // Check for duplicate guests (same first and last name, case-insensitive)
      const { data: existingGuests, error: checkError } = await supabase
        .from('guests')
        .select('id, first_name, last_name')
        .eq('event_id', eventId)
        .ilike('first_name', data.first_name.trim())
        .ilike('last_name', data.last_name.trim());

      if (checkError) {
        console.error('Error checking for duplicates:', checkError);
        toast({
          title: "Error",
          description: "Failed to validate guest information",
          variant: "destructive",
        });
        return;
      }

      // Filter out the current guest if editing
      const duplicates = existingGuests?.filter(existingGuest => 
        existingGuest.first_name.toLowerCase().trim() === data.first_name.toLowerCase().trim() &&
        existingGuest.last_name.toLowerCase().trim() === data.last_name.toLowerCase().trim() &&
        (!isEdit || existingGuest.id !== guest?.id)
      ) || [];

      if (duplicates.length > 0) {
        form.setError('first_name', {
          type: 'manual',
          message: 'Guest already added – duplicate listing.'
        });
        form.setError('last_name', {
          type: 'manual',
          message: 'Guest already added – duplicate listing.'
        });
        toast({
          title: "Error",
          description: "Guest already added – duplicate listing.",
          variant: "destructive",
        });
        return;
      }

      // Compute who_is_display using current event's partner names
      const whoIsDisplay = computeWhoIsDisplay(
        data.who_is_partner as WhoIsPartner,
        data.who_is_role as WhoIsRole,
        currentEvent?.partner1_name,
        currentEvent?.partner2_name
      );

      const guestData = {
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        table_id: data.table_id,
        seat_no: data.seat_no,
        rsvp: data.rsvp,
        dietary: data.dietary,
        mobile: data.mobile || null,
        email: data.email || null,
        notes: data.notes || null,
        who_is_partner: data.who_is_partner,
        who_is_role: data.who_is_role,
        who_is_display: whoIsDisplay,
      } as any;

      // Add family_group if it exists
      if (data.family_group) {
        guestData.family_group = data.family_group;
      }

      if (isEdit && guest) {
        const { error } = await supabase
          .from('guests')
          .update(guestData as any)
          .eq('id', guest.id);

        if (error) {
          console.error('Error updating guest:', error);
          // Check if it's a unique constraint violation
          if (error.code === '23505' && error.message.includes('uniq_guest_name_per_event')) {
            form.setError('first_name', {
              type: 'manual',
              message: 'Guest already added – duplicate listing.'
            });
            form.setError('last_name', {
              type: 'manual',
              message: 'Guest already added – duplicate listing.'
            });
            toast({
              title: "Error",
              description: "Guest already added – duplicate listing.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: "Failed to update guest. Please try again.",
              variant: "destructive",
            });
          }
          return;
        }

        // Update family group for selected members if any
        if (familyMemberIds.length > 0 && data.family_group?.trim()) {
          await supabase
            .from('guests')
            .update({ family_group: data.family_group.trim() } as any)
            .in('id', familyMemberIds);
        }

        toast({
          title: "Success",
          description: "Guest updated successfully",
        });
      } else {
        const fullGuestData = {
          ...guestData,
          event_id: eventId,
          user_id: user.user.id,
        } as any;

        const { error } = await supabase
          .from('guests')
          .insert(fullGuestData);

        if (error) {
          console.error('Error adding guest:', error);
          // Check if it's a unique constraint violation
          if (error.code === '23505' && error.message.includes('uniq_guest_name_per_event')) {
            form.setError('first_name', {
              type: 'manual',
              message: 'Guest already added – duplicate listing.'
            });
            form.setError('last_name', {
              type: 'manual',
              message: 'Guest already added – duplicate listing.'
            });
            toast({
              title: "Error",
              description: "Guest already added – duplicate listing.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: "Failed to add guest. Please try again.",
              variant: "destructive",
            });
          }
          return;
        }

        // Update family group for selected members if any
        if (familyMemberIds.length > 0 && data.family_group?.trim()) {
          await supabase
            .from('guests')
            .update({ family_group: data.family_group.trim() } as any)
            .in('id', familyMemberIds);
        }

        toast({
          title: "Success",
          description: "Guest added successfully",
        });
      }

      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error managing guest:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Guest' : 'Add Guest'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Row 1: First Name & Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Table & Seat No. */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="table_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleTableChange(value);
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select table" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tables.map((table) => {
                          const currentCount = table.guest_count;
                          const isCurrentTable = isEdit && guest && guest.table_id === table.id;
                          
                          // Calculate display count including this guest
                          const displayCount = isEdit && isCurrentTable 
                            ? currentCount // If editing and same table, don't add 1
                            : currentCount + (field.value === table.id ? 1 : 0); // Add 1 if this table is selected
                          
                          const wouldBeFull = displayCount >= table.limit_seats;
                          const isAtCapacity = currentCount >= table.limit_seats;
                          
                          return (
                            <SelectItem 
                              key={table.id} 
                              value={table.id}
                              disabled={isAtCapacity && !isCurrentTable}
                            >
                              {isAtCapacity && !isCurrentTable 
                                ? `${table.name} — Full`
                                : `${table.name} — ${displayCount}/${table.limit_seats}`
                              }
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {tableError && (
                      <p className="text-sm text-red-600 mt-1">{tableError}</p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seat_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seat No.</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value === "" ? null : (value ? parseInt(value) : null));
                        setSeatError('');
                      }} 
                      value={field.value?.toString() || ""}
                      disabled={!selectedTableId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedTableId ? "(Optional)" : "Choose table first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {seatOptions.map((seatNum) => {
                          const isTaken = takenSeats.includes(seatNum);
                          
                          return (
                            <SelectItem 
                              key={seatNum} 
                              value={seatNum.toString()}
                              disabled={isTaken}
                            >
                              Seat {seatNum}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {seatError && (
                      <p className="text-sm text-red-600 mt-1">{seatError}</p>
                    )}
                    {selectedTableId && takenSeats.length === seatOptions.length && (
                      <p className="text-sm text-muted-foreground mt-1">All seats are taken for this table, but you can save without assigning a seat.</p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: RSVP & Dietary */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rsvp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RSVP</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Attending">Attending</SelectItem>
                        <SelectItem value="Not Attending">Not Attending</SelectItem>
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
                    <FormLabel>Dietary</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NA">NA</SelectItem>
                        <SelectItem value="Vegan">Vegan</SelectItem>
                        <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="Gluten Free">Gluten Free</SelectItem>
                        <SelectItem value="Dairy Free">Dairy Free</SelectItem>
                        <SelectItem value="Nut Free">Nut Free</SelectItem>
                        <SelectItem value="Seafood Free">Seafood Free</SelectItem>
                        <SelectItem value="Kosher">Kosher</SelectItem>
                        <SelectItem value="Halal">Halal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 4: Mobile & Email */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" />
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
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 5: Family/Group */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="family_group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Family/Group</FormLabel>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add members to your Family/Group. Type to search and select guests.
                    </p>
                    <FormControl>
                      <FamilyGroupCombobox
                        value={field.value || ''}
                        selectedMembers={familyMemberIds}
                        onChange={handleFamilyGroupChange}
                        eventId={eventId}
                        currentGuestId={guest?.id}
                        placeholder="Enter family/group name or search members..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 6: Who Is & Notes */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="who_is_partner"
                render={() => (
                  <FormItem data-field="who-is">
                    <FormLabel>Who Is*</FormLabel>
                    <p className="text-xs text-muted-foreground mb-2">
                      Choose which partner they're related to, then select exactly one role.
                    </p>
                    <FormControl>
                      <WhoIsSelector
                        value={{
                          partner: form.watch('who_is_partner') as WhoIsPartner,
                          role: form.watch('who_is_role') as WhoIsRole,
                        }}
                        onChange={handleWhoIsChange}
                        partner1Name={currentEvent?.partner1_name || 'Partner 1'}
                         partner2Name={currentEvent?.partner2_name || 'Partner 2'}
                         customRoles={whoIsSettings.custom_roles}
                         allowCustomRoles={whoIsSettings.who_is_allow_custom_role}
                        isOpen={whoIsSelectorOpen}
                        onToggle={() => setWhoIsSelectorOpen(!whoIsSelectorOpen)}
                        error={form.formState.errors.who_is_partner?.message || form.formState.errors.who_is_role?.message}
                      />
                    </FormControl>
                    <FormMessage />
                    {(form.formState.errors.who_is_partner || form.formState.errors.who_is_role) && (
                      <p className="text-sm text-destructive mt-1">
                        Please choose one partner and one role.
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient">
                {isEdit ? 'Save Changes' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};