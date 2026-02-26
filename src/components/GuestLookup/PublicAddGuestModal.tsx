import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, UserPlus, Users } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type GuestType = 'individual' | 'couple' | 'family';

interface GuestEntry {
  first_name: string;
  last_name: string;
  mobile: string;
  email: string;
  rsvp: string;
  dietary: string;
  notes: string;
}

const emptyGuest = (): GuestEntry => ({
  first_name: '',
  last_name: '',
  mobile: '',
  email: '',
  rsvp: 'Pending',
  dietary: 'None',
  notes: '',
});

interface PartyMember {
  first_name: string;
  last_name: string;
  mobile: string;
  email: string;
  dietary: string;
}

const emptyMember = (): PartyMember => ({
  first_name: '',
  last_name: '',
  mobile: '',
  email: '',
  dietary: 'None',
});

interface PublicAddGuestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onGuestAdded: () => void;
  addedByGuestId?: string;
}

const inputClasses = "rounded-full border-2 border-primary focus-visible:border-primary focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9";
const selectTriggerClasses = "w-full border-2 border-primary hover:border-primary focus:border-primary focus:border-[3px] focus:ring-0 focus:outline-none rounded-full h-9";

export const PublicAddGuestModal: React.FC<PublicAddGuestModalProps> = ({
  open,
  onOpenChange,
  eventId,
  onGuestAdded,
  addedByGuestId,
}) => {
  const [guestType, setGuestType] = useState<GuestType>('individual');
  const [guest, setGuest] = useState<GuestEntry>(emptyGuest());
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([]);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState<PartyMember>(emptyMember());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setGuestType('individual');
    setGuest(emptyGuest());
    setPartyMembers([]);
    setShowAddMemberForm(false);
    setMemberForm(emptyMember());
  };

  const addPartyMember = () => {
    if (!memberForm.first_name.trim() || !memberForm.last_name.trim()) {
      toast({ title: 'First and last name are required', variant: 'destructive' });
      return;
    }
    setPartyMembers(prev => [...prev, { ...memberForm }]);
    setMemberForm(emptyMember());
    setShowAddMemberForm(false);
  };

  const removeMember = (index: number) => {
    setPartyMembers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!guest.first_name.trim()) {
      toast({ title: 'First name is required', variant: 'destructive' });
      return;
    }

    if (guestType === 'couple' && partyMembers.length === 0) {
      toast({ title: 'Add one more person to create a couple', variant: 'destructive' });
      return;
    }
    if (guestType === 'family' && partyMembers.length < 2) {
      toast({ title: 'Add at least two more people to create a family', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Add main guest
      const { data, error } = await supabase.rpc('add_guest_public', {
        _event_id: eventId,
        _first_name: guest.first_name.trim(),
        _last_name: guest.last_name.trim() || '',
        _rsvp: guest.rsvp,
        _dietary: guest.dietary === 'None' ? 'NA' : guest.dietary,
        _mobile: guest.mobile.trim() || null,
        _email: guest.email.trim() || null,
        _added_by_guest_id: addedByGuestId || null,
      } as any);

      if (error) throw error;
      if (!data) throw new Error('Failed to add guest — event may not allow public additions');

      // Add party members
      for (const m of partyMembers) {
        const { error: memberError } = await supabase.rpc('add_guest_public', {
          _event_id: eventId,
          _first_name: m.first_name.trim(),
          _last_name: m.last_name.trim() || '',
          _rsvp: 'Pending',
          _dietary: m.dietary === 'None' ? 'NA' : m.dietary,
          _mobile: m.mobile.trim() || null,
          _email: m.email.trim() || null,
          _added_by_guest_id: addedByGuestId || null,
        } as any);
        if (memberError) throw memberError;
      }

      const total = 1 + partyMembers.length;
      toast({
        title: 'Guest(s) Added',
        description: `${total} guest${total > 1 ? 's' : ''} added successfully`,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col px-4 sm:px-10 [&>button:last-child]:hidden" fullScreenOnMobile>
        {/* Custom purple circle close button */}
        <DialogPrimitive.Close className="absolute right-4 top-4 z-10 w-9 h-9 aspect-square rounded-full bg-primary border-2 border-primary flex items-center justify-center hover:opacity-90 transition-opacity">
          <X className="w-5 h-5 text-white" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>

        <DialogHeader className="pt-4">
          <DialogTitle className="text-xl sm:text-2xl font-medium text-primary">
            Add Extra Guest
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-3 pr-12">
            Choose if the extra guest is an<br />
            <span className="text-pink-500 font-medium">Individual</span>, your partner (<span className="text-orange-500 font-medium">Couple</span>) or <span className="text-blue-600 font-medium">Family</span>.
          </p>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-4 overflow-y-auto flex-1 mobile-scroll-container px-3 sm:px-2">
          {/* Guest Type Selector */}
          <div className="pt-1 pb-2">
            <Label className="text-sm font-medium mb-1.5 block">Guest Type <span className="text-destructive">*</span></Label>
            <div className="flex items-center justify-center gap-0 bg-[#7248e6]/10 border-2 border-[#7248e6] rounded-full p-1 w-full">
              <button
                type="button"
                onClick={() => { setGuestType('individual'); setPartyMembers([]); }}
                className={cn(
                  "flex-1 py-1.5 px-6 rounded-full text-sm font-medium transition-all duration-200",
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
                  if (partyMembers.length > 1) setPartyMembers([partyMembers[0]]);
                }}
                className={cn(
                  "flex-1 py-1.5 px-6 rounded-full text-sm font-medium transition-all duration-200",
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
                  "flex-1 py-1.5 px-6 rounded-full text-sm font-medium transition-all duration-200",
                  guestType === 'family'
                    ? "bg-[#0000FF] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Family
              </button>
            </div>
          </div>

          {/* First Name / Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">First Name *</Label>
              <Input
                value={guest.first_name}
                onChange={e => setGuest(prev => ({ ...prev, first_name: e.target.value }))}
                placeholder="Enter first name"
                className={inputClasses}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Last Name</Label>
              <Input
                value={guest.last_name}
                onChange={e => setGuest(prev => ({ ...prev, last_name: e.target.value }))}
                placeholder="Enter last name"
                className={inputClasses}
              />
            </div>
          </div>

          {/* Mobile / Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Mobile</Label>
              <Input
                value={guest.mobile}
                onChange={e => setGuest(prev => ({ ...prev, mobile: e.target.value }))}
                placeholder="Enter mobile number"
                className={inputClasses}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <Input
                value={guest.email}
                onChange={e => setGuest(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                className={inputClasses}
              />
            </div>
          </div>

          {/* RSVP Status / Dietary Requirements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">RSVP Status</Label>
              <Select value={guest.rsvp} onValueChange={val => setGuest(prev => ({ ...prev, rsvp: val }))}>
                <SelectTrigger className={selectTriggerClasses}>
                  <SelectValue placeholder="Select RSVP status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Attending">Accept</SelectItem>
                  <SelectItem value="Not Attending">Decline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Dietary Requirements</Label>
              <Select value={guest.dietary} onValueChange={val => setGuest(prev => ({ ...prev, dietary: val }))}>
                <SelectTrigger className={selectTriggerClasses}>
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
                  <SelectItem value="Kosher">Kosher</SelectItem>
                  <SelectItem value="Vendor Meal">Vendor Meal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Party Members Section - Couple/Family */}
          {(guestType === 'couple' || guestType === 'family') && (
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-green-500 border border-green-500 rounded-full px-3 py-1">
                  <Users className="w-4 h-4" />
                  <span>Party Members ({partyMembers.length})</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMemberForm(true)}
                  disabled={guestType === 'couple' && partyMembers.length >= 1}
                  className="rounded-full bg-green-500 hover:bg-green-600 text-white border-0"
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
                        onChange={e => setMemberForm(prev => ({ ...prev, first_name: e.target.value }))}
                        placeholder="First name"
                        className="rounded-full border-[#7248e6] text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Last Name *</Label>
                      <Input
                        value={memberForm.last_name}
                        onChange={e => setMemberForm(prev => ({ ...prev, last_name: e.target.value }))}
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
                        onChange={e => setMemberForm(prev => ({ ...prev, mobile: e.target.value }))}
                        placeholder="Mobile (optional)"
                        className="rounded-full border-[#7248e6] text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input
                        value={memberForm.email}
                        onChange={e => setMemberForm(prev => ({ ...prev, email: e.target.value }))}
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
                      onClick={() => { setShowAddMemberForm(false); setMemberForm(emptyMember()); }}
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
                <div className="space-y-1">
                  {partyMembers.map((member, index) => (
                    <div key={index} className="flex items-center justify-between bg-white py-0.5 px-2 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-primary">{member.first_name} {member.last_name}</p>
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

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea
              value={guest.notes}
              onChange={e => setGuest(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes about this guest..."
              className="rounded-3xl border-2 border-[#7248e6] focus-visible:border-[#7248e6] focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none resize-none"
            />
          </div>

          {/* Action Buttons - inline, scrollable with content */}
          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="destructive"
              className="flex-1 rounded-full bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { resetForm(); onOpenChange(false); }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              className="flex-1 rounded-full bg-green-500 hover:bg-green-600 text-white"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Adding...' : 'Add Guest'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
