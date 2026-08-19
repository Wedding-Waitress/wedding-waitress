// 🔒 PRODUCTION-LOCKED — Change Password Modal (2026-04-18)
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import styles from './AccountDialog.module.css';
import controlStyles from './AccountControls.module.css';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChangePasswordModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (pw.length < 8) {
      toast({ title: 'Too short', description: 'Password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (pw !== confirm) {
      toast({ title: 'Mismatch', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Password updated', description: 'Your new password is now active.' });
    setPw('');
    setConfirm('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-appearance="espresso-glass" className={`sm:max-w-md ${styles.dialog}`} overlayClassName={styles.overlay}>
        <DialogHeader>
          <DialogTitle className={styles.title}>Change Password</DialogTitle>
        </DialogHeader>
        <div className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="newpw">New password</Label>
            <Input id="newpw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <div className={styles.actions}>
            <Button variant="ghost" className={controlStyles.secondaryButton} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className={controlStyles.primaryButton}
            >
              {saving ? 'Saving…' : 'Update Password'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
