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
  family_group?: string | null;
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
  allGuests?: any[];
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
  const [initialRsvp, setInitialRsvp] = useState('Pending');
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
      const currentRsvp = guest.rsvp || 'Pending';
      setInitialRsvp(currentRsvp);
      setFormData({
        rsvp: currentRsvp,
        first_name: guest.first_name || '',
        last_name: guest.last_name || '',
        mobile: guest.mobile || '',
        email: guest.email || '',
        dietary: guest.dietary || 'NA',
        notes: guest.notes || ''
      });
    }
}, [guest, open]);

  // Fetch the freshest guest row when the modal opens to avoid stale data
  useEffect(() => {
    const fetchLatestGuest = async () => {
      if (!open || !guest?.id) return;
      const { data, error } = await supabase
        .from('guests')
        .select('first_name, last_name, mobile, email, dietary, notes, rsvp')
        .eq('id', guest.id)
        .maybeSingle();
      if (!error && data) {
        const currentRsvp = data.rsvp || 'Pending';
        setInitialRsvp(currentRsvp);
        setFormData({
          rsvp: currentRsvp,
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          mobile: data.mobile || '',
          email: data.email || '',
          dietary: data.dietary || 'NA',
          notes: data.notes || ''
        });
      }
    };
    fetchLatestGuest();
  }, [open, guest?.id]);

  const handleSave = async () => {
    if (!guest) return;

    setSaving(true);
    try {
      console.log('🔄 [Guest Update] Starting update for guest:', guest.id);
      console.log('📝 [Guest Update] Form data:', {
        rsvp: formData.rsvp,
        dietary: formData.dietary,
        mobile: formData.mobile,
        email: formData.email,
        notes: formData.notes
      });

      // Use RPC function to bypass RLS for public updates
      const { data, error } = await supabase.rpc('update_guest_rsvp_public', {
        _guest_id: guest.id,
        _event_id: guest.event_id || event?.id,
        _rsvp: formData.rsvp !== initialRsvp ? formData.rsvp : null,
        _dietary: formData.dietary,
        _mobile: formData.mobile?.trim() || null,
        _email: formData.email?.trim() || null,
        _notes: formData.notes?.trim() || null
      });

      if (error) {
        console.error('❌ [Guest Update] RPC error:', error);
        throw error;
      }
      if (!data) {
        console.error('❌ [Guest Update] No data returned - event may not allow public updates');
        throw new Error('Update failed - event may not allow public updates');
      }

      console.log('✅ [Guest Update] Successfully updated guest data');
      console.log('📤 [Guest Update] Triggering realtime sync...');

      toast({
        title: 'Saved and sent to organiser',
        description: 'Your information has been updated successfully.'
      });

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ [Guest Update] Fatal error:', error);
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
          <DialogTitle className="text-primary">Update Your Information</DialogTitle>
          <DialogDescription className="text-sm text-foreground space-y-1">
            <span className="block">{helperText || "Please update, edit your details & save below."}</span>
            <span className="block">You're info will automatically be sent to the event organiser</span>
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
            {/* RSVP Status removed - handled by Accept/Decline buttons on home screen */}

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

        <DialogFooter className="flex flex-row gap-3 sm:flex-row sm:justify-center">
          {isEditable && (
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-full py-2"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className={`${isEditable ? 'flex-1' : 'w-full'} bg-red-500 hover:bg-red-600 text-white rounded-full py-2`}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
