import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
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
import { X, AlertCircle, Users, Utensils, Calendar, MapPin } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTables } from "@/hooks/useTables";
import { computeRelationDisplay, RelationPartner, RelationRole } from "@/lib/relationUtils";
import { useEvents } from "@/hooks/useEvents";
import { RelationSelector } from "./RelationSelector";
import { FamilyGroupCombobox } from "./FamilyGroupCombobox";

const addGuestSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  table_id: z.string().optional(),
  seat_no: z.coerce.number().optional(),
  rsvp: z.string(),
  dietary: z.string(),
  mobile: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  family_group: z.string().optional(),
  notes: z.string().optional(),
  relation_partner: z.string().min(1, "Please choose one partner and one role."),
  relation_role: z.string().min(1, "Please choose one partner and one role."),
});

type AddGuestFormData = z.infer<typeof addGuestSchema>;

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
  const [relationSettings, setRelationSettings] = useState({
    relation_required: true,
    relation_allow_custom_role: false,
    relation_allow_single_partner: true,
    relation_disable_first_guest_alert: false,
    custom_roles: [] as string[]
  });

  const form = useForm<AddGuestFormData>({
    resolver: zodResolver(addGuestSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      table_id: "none",
      seat_no: undefined,
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
          table_id: editGuest.table_id || "none",
          seat_no: editGuest.seat_no || undefined,
          rsvp: editGuest.rsvp,
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
          table_id: "none",
          seat_no: undefined,
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
    onClose();
  };

  const handleRelationChange = (partner: RelationPartner, role: RelationRole) => {
    form.setValue('relation_partner', partner);
    form.setValue('relation_role', role);
    form.clearErrors(['relation_partner', 'relation_role']);
  };

  const getAvailableSeatNumbers = useCallback((tableId: string): number[] => {
    const selectedTable = tables.find(t => t.id === tableId);
    if (!selectedTable) return [];

    const totalSeats = selectedTable.limit_seats;
    return Array.from({ length: totalSeats }, (_, i) => i + 1);
  }, [tables]);

  const onSubmit = async (data: AddGuestFormData) => {
    setLoading(true);
    
    try {
      // Validate required relation if setting is enabled
      if (relationSettings.relation_required) {
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

      // Validate table and seat if provided
      if (data.table_id && data.table_id !== "none" && data.seat_no) {
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
        table_id: data.table_id === "none" ? null : data.table_id || null,
        seat_no: data.seat_no || null,
        rsvp: data.rsvp,
        dietary: data.dietary,
        mobile: data.mobile || null,
        email: data.email || null,
        family_group: data.family_group || null,
        notes: data.notes || null,
        assigned: !!(data.table_id && data.table_id !== "none"),
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
      if (data.table_id && data.table_id !== "none") {
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
        // Update existing guest
        const { error } = await supabase
          .from('guests')
          .update(finalGuestData)
          .eq('id', editGuest.id);

        if (error) {
          console.error('Error updating guest:', error);
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
        // Create new guest
        const { error } = await supabase
          .from('guests')
          .insert([finalGuestData]);

        if (error) {
          console.error('Error adding guest:', error);
          toast({
            title: "Error",
            description: "Failed to add guest. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Guest Added",
            description: `${data.first_name} ${data.last_name} has been added to your guest list.`,
          });
          onGuestAdded();
          handleClose();
        }
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {isEdit ? 'Edit Guest' : 'Add New Guest'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter first name" {...field} />
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
                      <Input placeholder="Enter last name" {...field} />
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
                      <Input placeholder="Enter mobile number" {...field} />
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
                      <Input placeholder="Enter email address" {...field} />
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
                      Table
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select table" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No table assigned</SelectItem>
                        {tables.map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            Table {table.table_no} - {table.name}
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
                    <FormLabel>Seat Number</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                      value={field.value?.toString() || ""}
                      disabled={!form.watch('table_id') || form.watch('table_id') === "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select seat" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No seat assigned</SelectItem>
                        {form.watch('table_id') && form.watch('table_id') !== "none" && 
                          getAvailableSeatNumbers(form.watch('table_id')!).map((seatNum) => (
                            <SelectItem key={seatNum} value={seatNum.toString()}>
                              Seat {seatNum}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                        <SelectTrigger>
                          <SelectValue placeholder="Select RSVP status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="Declined">Declined</SelectItem>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Select dietary requirements" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NA">None</SelectItem>
                        <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="Vegan">Vegan</SelectItem>
                        <SelectItem value="Gluten-Free">Gluten-Free</SelectItem>
                        <SelectItem value="Halal">Halal</SelectItem>
                        <SelectItem value="Kosher">Kosher</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Relation Field */}
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
                          partner2Name={selectedEvent?.partner2_name}
                          customRoles={relationSettings.custom_roles}
                          allowCustomRoles={relationSettings.relation_allow_custom_role}
                          isOpen={relationSelectorOpen}
                          onToggle={() => setRelationSelectorOpen(!relationSelectorOpen)}
                          error={form.formState.errors.relation_partner?.message || form.formState.errors.relation_role?.message}
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
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" disabled={loading}>
                {loading ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Guest' : 'Add Guest')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};