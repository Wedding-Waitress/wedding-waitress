import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { User, Mail, Phone, Utensils } from 'lucide-react';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  table_no: number | null;
  table_id: string | null;
  relation_display?: string;
  rsvp: string;
  dietary?: string;
  mobile?: string;
  email?: string;
  notes?: string;
}

interface GuestProfileModalProps {
  guest: Guest | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const GuestProfileModal: React.FC<GuestProfileModalProps> = ({
  guest,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [formData, setFormData] = useState({
    dietary: guest?.dietary || '',
    mobile: guest?.mobile || '',
    email: guest?.email || '',
    notes: guest?.notes || '',
    rsvp: guest?.rsvp || 'Pending'
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (guest) {
      setFormData({
        dietary: guest.dietary || '',
        mobile: guest.mobile || '',
        email: guest.email || '',
        notes: guest.notes || '',
        rsvp: guest.rsvp || 'Pending'
      });
    }
  }, [guest]);

  const handleSave = async () => {
    if (!guest) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('guests')
        .update({
          dietary: formData.dietary || null,
          mobile: formData.mobile || null,
          email: formData.email || null,
          notes: formData.notes || null,
          rsvp: formData.rsvp
        })
        .eq('id', guest.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your information has been saved successfully.",
      });
      
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating guest profile:', error);
      toast({
        title: "Error",
        description: "Failed to update your information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!guest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Update Your Information
          </DialogTitle>
          <DialogDescription>
            Update your contact information and preferences for{' '}
            <span className="font-medium">{guest.first_name} {guest.last_name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* RSVP Status */}
          <div className="space-y-2">
            <Label htmlFor="rsvp">RSVP Status</Label>
            <Select value={formData.rsvp} onValueChange={(value) => setFormData(prev => ({ ...prev, rsvp: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select RSVP status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter your email address"
            />
          </div>

          {/* Mobile */}
          <div className="space-y-2">
            <Label htmlFor="mobile" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Mobile Number
            </Label>
            <Input
              id="mobile"
              type="tel"
              value={formData.mobile}
              onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
              placeholder="Enter your mobile number"
            />
          </div>

          {/* Dietary Requirements */}
          <div className="space-y-2">
            <Label htmlFor="dietary" className="flex items-center gap-2">
              <Utensils className="w-4 h-4" />
              Dietary Requirements
            </Label>
            <Select 
              value={formData.dietary} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, dietary: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select dietary requirements" />
              </SelectTrigger>
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
          </div>

          {/* Special Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Special Requests or Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any special requests, allergies, or additional information..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};