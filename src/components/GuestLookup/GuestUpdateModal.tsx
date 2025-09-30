import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Guest {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  mobile?: string;
  email?: string;
  dietary?: string;
  notes?: string;
  rsvp: string;
}

interface Event {
  id: string;
  date?: string;
  event_timezone?: string;
}

interface GuestUpdateModalProps {
  guest: Guest | null;
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  helperText?: string;
  allowNameEdit?: boolean;
  showMessageField?: boolean;
  isEditable?: boolean;
}

const dietaryOptions = [
  'NA',
  'Vegetarian',
  'Vegan',
  'Gluten Free',
  'Dairy Free',
  'Nut Allergy',
  'Shellfish Allergy',
  'Halal',
  'Kosher',
  'Other'
];

export const GuestUpdateModal: React.FC<GuestUpdateModalProps> = ({
  guest,
  event,
  open,
  onOpenChange,
  onUpdate,
  helperText,
  allowNameEdit = false,
  showMessageField = true,
  isEditable = true
}) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    rsvp: 'Pending',
    first_name: '',
    last_name: '',
    mobile: '',
    email: '',
    dietary: 'NA',
    notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (guest) {
      setFormData({
        rsvp: guest.rsvp || 'Pending',
        first_name: guest.first_name || '',
        last_name: guest.last_name || '',
        mobile: guest.mobile || '',
        email: guest.email || '',
        dietary: guest.dietary || 'NA',
        notes: guest.notes || ''
      });
    }
  }, [guest]);

  const handleSave = async () => {
    if (!guest) return;

    setSaving(true);
    try {
      // Update guest record
      const { error: updateError } = await supabase
        .from('guests')
        .update({
          rsvp: formData.rsvp,
          first_name: formData.first_name,
          last_name: formData.last_name,
          mobile: formData.mobile || null,
          email: formData.email || null,
          dietary: formData.dietary,
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
          rsvp_date: formData.rsvp !== guest.rsvp ? new Date().toISOString() : undefined
        })
        .eq('id', guest.id);

      if (updateError) throw updateError;

      // Log the change
      const { error: logError } = await supabase
        .from('guest_update_logs')
        .insert({
          event_id: guest.event_id,
          guest_id: guest.id,
          changed_by: 'guest_live_view',
          payload: {
            previous: {
              rsvp: guest.rsvp,
              first_name: guest.first_name,
              last_name: guest.last_name,
              mobile: guest.mobile,
              email: guest.email,
              dietary: guest.dietary,
              notes: guest.notes
            },
            updated: formData
          }
        });

      if (logError) console.error('Error logging update:', logError);

      toast({
        title: 'Saved and sent to organiser',
        description: 'Your information has been updated successfully.'
      });

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating guest:', error);
      toast({
        title: 'Error',
        description: 'Failed to update information. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!guest) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Your Information</DialogTitle>
          <DialogDescription className="text-sm">
            {helperText || "Please update-edit your details and save. It will automatically be sent to the event organiser."}
          </DialogDescription>
        </DialogHeader>

        {!isEditable ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm font-medium text-destructive">
              RSVP date has passed. Please contact the organiser to make changes.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* RSVP Status */}
            <div className="space-y-2">
              <Label htmlFor="rsvp">RSVP Status</Label>
              <Select
                value={formData.rsvp}
                onValueChange={(value) => setFormData({ ...formData, rsvp: value })}
                disabled={!isEditable}
              >
                <SelectTrigger id="rsvp">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Attending">Accept</SelectItem>
                  <SelectItem value="Not Attending">Decline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email address"
                disabled={!isEditable}
              />
            </div>

            {/* Mobile */}
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="0411569505"
                disabled={!isEditable}
              />
            </div>

            {/* Dietary Requirements */}
            <div className="space-y-2">
              <Label htmlFor="dietary">Dietary Requirements</Label>
              <Select
                value={formData.dietary}
                onValueChange={(value) => setFormData({ ...formData, dietary: value })}
                disabled={!isEditable}
              >
                <SelectTrigger id="dietary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dietaryOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message / Special Requests */}
            {showMessageField && (
              <div className="space-y-2">
                <Label htmlFor="notes">Special Requests or Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any special requests, allergies, or additional information..."
                  rows={3}
                  disabled={!isEditable}
                />
              </div>
            )}

            {/* Full Name - Only show if allowed */}
            {allowNameEdit && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Last name"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          {isEditable && (
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
