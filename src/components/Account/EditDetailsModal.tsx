// 🔒 PRODUCTION-LOCKED — Edit Details Modal (2026-04-18)
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import styles from './AccountDialog.module.css';
import controlStyles from './AccountControls.module.css';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditDetailsModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const { profile, updateCachedProfile } = useProfile();
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
    if (fresh) updateCachedProfile(fresh);
    toast({ title: 'Saved', description: 'Your details have been updated.' });
    onOpenChange(false);
    // Soft refresh — re-render consumers without full reload
    window.dispatchEvent(new Event('profile-updated'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-appearance="espresso-glass" className={`sm:max-w-md ${styles.dialog}`} overlayClassName={styles.overlay}>
        <DialogHeader>
          <DialogTitle className={styles.title}>Edit Details</DialogTitle>
        </DialogHeader>
        <div className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="first">First name</Label>
            <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="last">Last name</Label>
            <Input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="mob">Phone</Label>
            <Input id="mob" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+61..." />
          </div>
          <div className={styles.actions}>
            <Button variant="ghost" className={controlStyles.secondaryButton} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className={controlStyles.primaryButton}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
