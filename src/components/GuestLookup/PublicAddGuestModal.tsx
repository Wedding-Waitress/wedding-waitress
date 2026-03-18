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
  rsvp: string;
  dietary: string;
  notes: string;
}

const emptyMember = (): PartyMember => ({
  first_name: '',
  last_name: '',
  mobile: '',
  email: '',
  rsvp: 'Pending',
  dietary: 'None',
  notes: '',
});

interface PublicAddGuestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onGuestAdded: () => void;
  addedByGuestId?: string;
  addedByGuestName?: string;
  addedByGuestFamilyGroup?: string;
  addedByGuestTableId?: string;
  addedByGuestTableNo?: number;
}

const inputClasses = "rounded-full border-[3px] border-primary focus-visible:border-primary focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9";
const selectTriggerClasses = "w-full border-[3px] border-primary hover:border-primary focus:border-primary focus:border-[3px] focus:ring-0 focus:outline-none rounded-full h-9";

export const PublicAddGuestModal: React.FC<PublicAddGuestModalProps> = ({
  open,
  onOpenChange,
  eventId,
  onGuestAdded,
  addedByGuestId,
  addedByGuestName,
  addedByGuestFamilyGroup,
  addedByGuestTableId,
  addedByGuestTableNo,
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
    if (guestType === 'individual') {
      // Individual: validate and save from main form
      if (!guest.first_name.trim() || !guest.last_name.trim() || !guest.mobile.trim() || !guest.email.trim()) {
        toast({ title: 'Please fill in all required fields (First Name, Last Name, Mobile, Email)', variant: 'destructive' });
        return;
      }

      setSaving(true);
      try {
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

        // For individual/single: no group management needed
        toast({ title: 'Guest Added', description: '1 guest added successfully' });
        resetForm();
        onOpenChange(false);
        onGuestAdded();
      } catch (err) {
        console.error('Error adding guest:', err);
        toast({ title: 'Error', description: 'Failed to add guest. Please try again.', variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    } else {
      // Couple/Family: save each party member then manage group
      if (partyMembers.length === 0) {
        toast({ title: guestType === 'couple' ? 'Please add your partner first' : 'Please add at least one member', variant: 'destructive' });
        return;
      }

      setSaving(true);
      try {
        const newGuestIds: string[] = [];
        
        for (const m of partyMembers) {
          const { data: newGuestId, error: memberError } = await supabase.rpc('add_guest_public', {
            _event_id: eventId,
            _first_name: m.first_name.trim(),
            _last_name: m.last_name.trim() || '',
            _rsvp: m.rsvp,
            _dietary: m.dietary === 'None' ? 'NA' : m.dietary,
            _mobile: m.mobile.trim() || null,
            _email: m.email.trim() || null,
            _added_by_guest_id: addedByGuestId || null,
          } as any);
          if (memberError) throw memberError;
          if (newGuestId) newGuestIds.push(newGuestId);
        }

        // Call public_manage_guest_group for each new guest
        if (addedByGuestId) {
          for (const newGuestId of newGuestIds) {
            const { error: groupError } = await (supabase.rpc as any)('public_manage_guest_group', {
              _event_id: eventId,
              _new_guest_id: newGuestId,
              _referring_guest_id: addedByGuestId,
              _guest_type: guestType,
            });
            if (groupError) {
              console.error('Error managing guest group:', groupError);
              throw new Error(`Failed to assign guest to ${guestType} group: ${groupError.message}`);
            }
          }
        }

        const total = partyMembers.length;
        toast({ title: 'Guest(s) Added', description: `${total} guest${total > 1 ? 's' : ''} added successfully` });
        resetForm();
        onOpenChange(false);
        onGuestAdded();
      } catch (err) {
        console.error('Error adding guest:', err);
        toast({ title: 'Error', description: 'Failed to add guest. Please try again.', variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col px-4 sm:px-10 [&>button:last-child]:hidden" fullScreenOnMobile>
        {/* Custom purple circle close button */}
        <DialogPrimitive.Close className="absolute right-4 top-4 z-10 w-9 h-9 aspect-square rounded-full bg-white border-[3px] border-primary flex items-center justify-center hover:opacity-90 transition-opacity">
          <X className="w-5 h-5 text-primary" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>

        <DialogHeader className="pt-4">
          <DialogTitle className="text-xl sm:text-2xl font-medium text-primary">
            Add Extra Guest
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-3 pr-12">
            Choose if the extra guest is an<br />
            <span className="text-pink-500 font-medium">Single</span>, your partner (<span className="text-orange-500 font-medium">Couple</span>) or <span className="text-blue-600 font-medium">Family</span>.
          </p>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-4 overflow-y-auto flex-1 mobile-scroll-container px-3 sm:px-2">
          {/* Guest Type Selector */}
          <div className="pt-1 pb-2">
            <Label className="text-sm font-medium mb-1.5 block">Guest Category <span className="text-destructive">*</span></Label>
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
                Single
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

          {/* Party Members Section - Couple/Family */}
          {(guestType === 'couple' || guestType === 'family') && (
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-green-500 border border-green-500 rounded-full px-3 py-1">
                  <Users className="w-4 h-4" />
                  <span>Members ({
                    guestType === 'couple' && addedByGuestName ? 1 + partyMembers.length :
                    guestType === 'family' && addedByGuestName ? 1 + partyMembers.length :
                    partyMembers.length
                  })</span>
                </div>
                {/* Couple: show add button until partner added (max 1 member) */}
                {guestType === 'couple' && partyMembers.length < 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddMemberForm(true)}
                    className="rounded-full bg-green-500 hover:bg-green-600 text-white border-0"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add your partner to make you a couple
                  </Button>
                )}
                {/* Family: always show add button */}
                {guestType === 'family' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddMemberForm(true)}
                    className="rounded-full bg-green-500 hover:bg-green-600 text-white border-0"
                  >
                    <Plus className="w-4 h-4 mr-0.5" />
                    Add another member to this family
                  </Button>
                )}
              </div>

              {/* Auto-populated referring guest (read-only) */}
              {addedByGuestName && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between bg-purple-50 py-1.5 px-3 rounded-lg border border-primary/20">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-primary">{addedByGuestName}</p>
                      <p className="text-xs text-muted-foreground">Referring guest</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Member Form (enhanced with RSVP, Dietary, Notes) */}
              {showAddMemberForm && (
                <div className="bg-purple-50 p-4 rounded-lg space-y-3 border border-primary/20">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">First Name *</Label>
                      <Input
                        value={memberForm.first_name}
                        onChange={e => setMemberForm(prev => ({ ...prev, first_name: e.target.value }))}
                        placeholder="First name"
                        className="rounded-full border-primary text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Last Name *</Label>
                      <Input
                        value={memberForm.last_name}
                        onChange={e => setMemberForm(prev => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Last name"
                        className="rounded-full border-primary text-sm"
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
                        className="rounded-full border-primary text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input
                        value={memberForm.email}
                        onChange={e => setMemberForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Email (optional)"
                        className="rounded-full border-primary text-sm"
                      />
                    </div>
                  </div>
                  {/* RSVP Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">RSVP Status</Label>
                      <Select value={memberForm.rsvp} onValueChange={val => setMemberForm(prev => ({ ...prev, rsvp: val }))}>
                        <SelectTrigger className={cn(selectTriggerClasses, "h-9 text-sm", memberForm.rsvp === 'Pending' && 'text-[#FF5F1F]', memberForm.rsvp === 'Attending' && 'text-green-600', memberForm.rsvp === 'Not Attending' && 'text-red-600')}>
                          <SelectValue placeholder="Select RSVP" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending" className="text-[#FF5F1F]">Pending</SelectItem>
                          <SelectItem value="Attending" className="text-green-600">Accept</SelectItem>
                          <SelectItem value="Not Attending" className="text-red-600">Decline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Dietary Requirements */}
                    <div>
                      <Label className="text-xs">Dietary Requirements</Label>
                      <Select value={memberForm.dietary} onValueChange={val => setMemberForm(prev => ({ ...prev, dietary: val }))}>
                        <SelectTrigger className={cn(selectTriggerClasses, "h-9 text-sm")}>
                          <SelectValue placeholder="Select dietary" />
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
                  {/* Notes */}
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Textarea
                      value={memberForm.notes}
                      onChange={e => setMemberForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add any notes..."
                      className="rounded-3xl border-2 border-primary focus-visible:border-primary focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none resize-none text-sm"
                    />
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => { setShowAddMemberForm(false); setMemberForm(emptyMember()); }}
                      className="rounded-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={addPartyMember}
                      className="rounded-full bg-green-500 hover:bg-green-600 text-white"
                    >
                      {guestType === 'couple' ? 'Add Partner' : 'Add Member'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Display manually added Members */}
              {partyMembers.length > 0 && (
                <div className="space-y-1">
                  {partyMembers.map((member, index) => (
                    <div key={index} className="flex items-center justify-between bg-white py-0.5 px-2 rounded-lg border border-border">
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
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Helper text only when no referring guest */}
              {!addedByGuestName && guestType === 'couple' && partyMembers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Add one more person to create a couple
                </p>
              )}
              {!addedByGuestName && guestType === 'family' && partyMembers.length < 2 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Add two or more people to create a family
                </p>
              )}

              {/* Save button for couple/family */}
              {partyMembers.length > 0 && (
                <div className="flex gap-3 pt-3">
                  <Button
                    type="button"
                    className="flex-1 rounded-full bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => { resetForm(); onOpenChange(false); }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 rounded-full bg-green-500 hover:bg-green-600 text-white"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    {saving ? 'Adding...' : 'Add Guest'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Individual form fields - only shown for Individual type */}
          {guestType === 'individual' && (
            <>
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
                  <Label className="text-sm font-medium">Last Name <span className="text-destructive">*</span></Label>
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
                  <Label className="text-sm font-medium">Mobile <span className="text-destructive">*</span></Label>
                  <Input
                    value={guest.mobile}
                    onChange={e => setGuest(prev => ({ ...prev, mobile: e.target.value }))}
                    placeholder="Enter mobile number"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Email <span className="text-destructive">*</span></Label>
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
                  <Label className="text-sm font-medium">RSVP Status <span className="text-destructive">*</span></Label>
                  <Select value={guest.rsvp} onValueChange={val => setGuest(prev => ({ ...prev, rsvp: val }))}>
                    <SelectTrigger className={cn(selectTriggerClasses, guest.rsvp === 'Pending' && 'text-[#FF5F1F]', guest.rsvp === 'Attending' && 'text-green-600', guest.rsvp === 'Not Attending' && 'text-red-600')}>
                      <SelectValue placeholder="Select RSVP status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending" className="text-[#FF5F1F]">Pending</SelectItem>
                      <SelectItem value="Attending" className="text-green-600">Accept</SelectItem>
                      <SelectItem value="Not Attending" className="text-red-600">Decline</SelectItem>
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

              {/* Action Buttons */}
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
