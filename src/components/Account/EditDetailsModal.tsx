// 🔒 PRODUCTION-LOCKED — Edit Details Modal (2026-04-18)
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditDetailsModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setMobile(profile.mobile || '');
    }
  }, [open, profile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName, mobile })
      .eq('id', profile.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    // Refresh profile from DB so AccountInfoCard updates instantly
    const { data: fresh } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .single();
    if (fresh) {
      // Mutate the cached profile object in place so all consumers see the new values
      Object.assign(profile, fresh);
    }
    toast({ title: 'Saved', description: 'Your details have been updated.' });
    onOpenChange(false);
    // Soft refresh — re-render consumers without full reload
    window.dispatchEvent(new Event('profile-updated'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="first">First name</Label>
            <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="last">Last name</Label>
            <Input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mob">Phone</Label>
            <Input id="mob" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+61..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#967A59] hover:bg-[#7d6649] text-white"
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
