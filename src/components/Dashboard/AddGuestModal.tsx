import React, { useEffect } from 'react';
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

const addGuestSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  table_no: z.number().min(1, "Table number is required"),
  seat_no: z.number().optional(),
  rsvp: z.enum(['Pending', 'Attending', 'Not Attending']),
  dietary: z.enum(['NA', 'Vegan', 'Vegetarian', 'Gluten Free', 'Dairy Free', 'Nut Free', 'Seafood Free', 'Kosher', 'Halal']),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
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
    table_no: number | null;
    seat_no: number | null;
    rsvp: string;
    dietary: string;
    mobile: string | null;
    email: string | null;
    notes: string | null;
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
  
  const form = useForm<AddGuestFormData>({
    resolver: zodResolver(addGuestSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      table_no: undefined,
      seat_no: undefined,
      rsvp: 'Pending',
      dietary: 'NA',
      mobile: '',
      email: '',
      notes: '',
    },
  });

  // Reset form when guest prop changes (for edit mode)
  useEffect(() => {
    if (isOpen) {
      if (guest && isEdit) {
        form.reset({
          first_name: guest.first_name || '',
          last_name: guest.last_name || '',
          table_no: guest.table_no || undefined,
          seat_no: guest.seat_no || undefined,
          rsvp: (guest.rsvp as 'Pending' | 'Attending' | 'Not Attending') || 'Pending',
          dietary: (guest.dietary as 'NA' | 'Vegan' | 'Vegetarian' | 'Gluten Free' | 'Dairy Free' | 'Nut Free' | 'Seafood Free' | 'Kosher' | 'Halal') || 'NA',
          mobile: guest.mobile || '',
          email: guest.email || '',
          notes: guest.notes || '',
        });
      } else {
        form.reset({
          first_name: '',
          last_name: '',
          table_no: undefined,
          seat_no: undefined,
          rsvp: 'Pending',
          dietary: 'NA',
          mobile: '',
          email: '',
          notes: '',
        });
      }
    }
  }, [isOpen, guest, isEdit, form]);

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

      const guestData = {
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        table_no: data.table_no || null,
        seat_no: data.seat_no || null,
        rsvp: data.rsvp,
        dietary: data.dietary,
        mobile: data.mobile || null,
        email: data.email || null,
        notes: data.notes || null,
      };

      if (isEdit && guest) {
        const { error } = await supabase
          .from('guests')
          .update(guestData)
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

        toast({
          title: "Success",
          description: "Guest updated successfully",
        });
      } else {
        const fullGuestData = {
          ...guestData,
          event_id: eventId,
          user_id: user.user.id,
        };

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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Guest' : 'Add Guest'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="table_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table No.</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seat_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seat No.</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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