import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type GuestType = 'individual' | 'couple' | 'family';

interface GuestEntry {
  first_name: string;
  last_name: string;
  dietary: string;
  mobile: string;
}

const emptyGuest = (): GuestEntry => ({
  first_name: '',
  last_name: '',
  dietary: '',
  mobile: '',
});

interface PublicAddGuestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onGuestAdded: () => void;
  addedByGuestId?: string;
}

export const PublicAddGuestModal: React.FC<PublicAddGuestModalProps> = ({
  open,
  onOpenChange,
  eventId,
  onGuestAdded,
  addedByGuestId,
}) => {
  const [guestType, setGuestType] = useState<GuestType>('individual');
  const [guest1, setGuest1] = useState<GuestEntry>(emptyGuest());
  const [guest2, setGuest2] = useState<GuestEntry>(emptyGuest());
  const [familyMembers, setFamilyMembers] = useState<GuestEntry[]>([emptyGuest()]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setGuestType('individual');
    setGuest1(emptyGuest());
    setGuest2(emptyGuest());
    setFamilyMembers([emptyGuest()]);
  };

  const addFamilyMember = () => {
    setFamilyMembers(prev => [...prev, emptyGuest()]);
  };

  const removeFamilyMember = (index: number) => {
    if (familyMembers.length <= 1) return;
    setFamilyMembers(prev => prev.filter((_, i) => i !== index));
  };

  const updateFamilyMember = (index: number, field: keyof GuestEntry, value: string) => {
    setFamilyMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const handleSave = async () => {
    const guestsToAdd: GuestEntry[] = [];

    if (guestType === 'individual') {
      if (!guest1.first_name.trim()) {
        toast({ title: 'First name is required', variant: 'destructive' });
        return;
      }
      guestsToAdd.push(guest1);
    } else if (guestType === 'couple') {
      if (!guest1.first_name.trim() || !guest2.first_name.trim()) {
        toast({ title: 'Both first names are required', variant: 'destructive' });
        return;
      }
      guestsToAdd.push(guest1, guest2);
    } else {
      const valid = familyMembers.filter(m => m.first_name.trim());
      if (valid.length === 0) {
        toast({ title: 'At least one family member name is required', variant: 'destructive' });
        return;
      }
      guestsToAdd.push(...valid);
    }

    setSaving(true);
    try {
      for (const g of guestsToAdd) {
        const { data, error } = await supabase.rpc('add_guest_public', {
          _event_id: eventId,
          _first_name: g.first_name.trim(),
          _last_name: g.last_name.trim() || '',
          _rsvp: 'Attending',
          _dietary: g.dietary.trim() || 'NA',
          _mobile: g.mobile.trim() || null,
          _email: null,
          _added_by_guest_id: addedByGuestId || null,
        } as any);

        if (error) throw error;
        if (!data) throw new Error('Failed to add guest — event may not allow public additions');
      }

      toast({
        title: 'Guest(s) Added',
        description: `${guestsToAdd.length} guest(s) added successfully`,
      });
      resetForm();
      onOpenChange(false);
      onGuestAdded();
    } catch (err) {
      console.error('Error adding guest:', err);
      toast({
        title: 'Error',
        description: 'Failed to add guest. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const typeOptions: { value: GuestType; label: string }[] = [
    { value: 'individual', label: 'Individual' },
    { value: 'couple', label: 'Couple' },
    { value: 'family', label: 'Family' },
  ];

  const renderGuestFields = (guest: GuestEntry, setGuest: (g: GuestEntry) => void, label?: string) => (
    <div className="space-y-3">
      {label && <p className="text-sm font-semibold text-foreground">{label}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">First Name *</Label>
          <Input
            value={guest.first_name}
            onChange={e => setGuest({ ...guest, first_name: e.target.value })}
            placeholder="First name"
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Last Name</Label>
          <Input
            value={guest.last_name}
            onChange={e => setGuest({ ...guest, last_name: e.target.value })}
            placeholder="Last name"
            className="h-9"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Dietary Requirements</Label>
          <Input
            value={guest.dietary}
            onChange={e => setGuest({ ...guest, dietary: e.target.value })}
            placeholder="e.g. Vegetarian"
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Mobile (optional)</Label>
          <Input
            value={guest.mobile}
            onChange={e => setGuest({ ...guest, mobile: e.target.value })}
            placeholder="Mobile number"
            className="h-9"
          />
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="w-5 h-5 text-primary" />
            Add New Guest
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Add an extra individual, your partner <span className="font-semibold">(couple)</span>, or a family member.
          </p>
        </DialogHeader>

        {/* Guest Type Selector */}
        <div className="flex gap-2 mt-2">
          {typeOptions.map(opt => (
            <Button
              key={opt.value}
              variant={guestType === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGuestType(opt.value)}
              className={`flex-1 rounded-full ${
                guestType === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'border-primary text-primary hover:bg-primary/10'
              }`}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Form Fields */}
        <div className="space-y-4 mt-4">
          {guestType === 'individual' && renderGuestFields(guest1, setGuest1)}

          {guestType === 'couple' && (
            <>
              {renderGuestFields(guest1, setGuest1, 'Person 1')}
              <div className="border-t border-border" />
              {renderGuestFields(guest2, setGuest2, 'Person 2')}
            </>
          )}

          {guestType === 'family' && (
            <div className="space-y-3">
              {familyMembers.map((member, index) => (
                <div key={index} className="relative border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-primary">
                      Member {index + 1}
                    </p>
                    {familyMembers.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive/80"
                        onClick={() => removeFamilyMember(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={member.first_name}
                      onChange={e => updateFamilyMember(index, 'first_name', e.target.value)}
                      placeholder="First name *"
                      className="h-9"
                    />
                    <Input
                      value={member.last_name}
                      onChange={e => updateFamilyMember(index, 'last_name', e.target.value)}
                      placeholder="Last name"
                      className="h-9"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input
                      value={member.dietary}
                      onChange={e => updateFamilyMember(index, 'dietary', e.target.value)}
                      placeholder="Dietary"
                      className="h-9"
                    />
                    <Input
                      value={member.mobile}
                      onChange={e => updateFamilyMember(index, 'mobile', e.target.value)}
                      placeholder="Mobile"
                      className="h-9"
                    />
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addFamilyMember}
                className="w-full border-dashed border-primary text-primary hover:bg-primary/10"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Another Family Member
              </Button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => { resetForm(); onOpenChange(false); }}
            className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-success text-success-foreground hover:bg-success/90"
          >
            {saving ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-1" />
            )}
            Save Guest{guestType !== 'individual' ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
