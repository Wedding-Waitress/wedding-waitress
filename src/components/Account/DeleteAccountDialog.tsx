import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import dialogStyles from './AccountDialog.module.css';
import controlStyles from './AccountControls.module.css';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; email: string }

export const DeleteAccountDialog: React.FC<Props> = ({ open, onOpenChange, email }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [recentlyAuthenticated, setRecentlyAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const confirmationMatches = useMemo(() => confirmation.trim() === 'DELETE' || confirmation.trim().toLowerCase() === email.toLowerCase(), [confirmation, email]);

  useEffect(() => {
    if (open) return;
    setAcknowledged(false); setConfirmation(''); setOtp(''); setOtpSent(false); setRecentlyAuthenticated(false); setError(''); setBusy(false);
  }, [open]);

  const sendCode = async () => {
    if (!email || !acknowledged || !confirmationMatches) return;
    setBusy(true); setError('');
    const { error: sendError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setBusy(false);
    if (sendError) { setError(sendError.message); return; }
    setOtpSent(true);
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(otp)) { setError('Enter the complete 6-digit authentication code.'); return; }
    setBusy(true); setError('');
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    setBusy(false);
    if (verifyError) { setError(verifyError.message); return; }
    setRecentlyAuthenticated(true);
  };

  const deleteAccount = async () => {
    if (!acknowledged || !confirmationMatches || !recentlyAuthenticated) return;
    setBusy(true); setError('');
    const { data, error: invokeError } = await supabase.functions.invoke('close-account', { body: { confirmation: confirmation.trim() } });
    if (invokeError || data?.error) { setBusy(false); setError(data?.error || invokeError?.message || 'Account closure could not be completed.'); return; }
    await supabase.auth.signOut();
    toast({ title: 'Account closed', description: 'Your account information will be retained securely for 12 months.' });
    navigate('/', { replace: true });
  };

  return <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
    <DialogContent data-appearance="espresso-glass" className={`sm:max-w-2xl ${dialogStyles.dialog}`} overlayClassName={dialogStyles.overlay}>
      <DialogHeader>
        <div className={dialogStyles.iconWrap}><AlertTriangle aria-hidden="true" /></div>
        <DialogTitle className={dialogStyles.title}>Delete Account</DialogTitle>
        <DialogDescription className={dialogStyles.description}>This closes access immediately and starts a 12-month recovery period.</DialogDescription>
      </DialogHeader>
      <div className={dialogStyles.form}>
        <ul className="list-disc space-y-2 pl-5 text-sm text-[#f4dfc2]">
          <li>Account access will close immediately, and the current plan and its entitlements will stop.</li>
          <li>Future recurring renewals will be cancelled where applicable. Your previous plan will not resume if you return.</li>
          <li>Eligible account and event information will be retained securely for 12 months.</li>
          <li>You may sign in during those 12 months and explicitly reactivate, then select and purchase a new plan.</li>
          <li>After 12 months, eligible operational personal and event data will be permanently deleted or de-identified.</li>
          <li>Billing, invoice, transaction, fraud-prevention, security and legal records may be retained longer where Australian law requires it.</li>
          <li>Deleting an account does not automatically create a refund. Refund rights remain subject to applicable plan terms and Australian law.</li>
        </ul>
        <label className="flex items-start gap-3 text-sm text-[#f4dfc2]">
          <Checkbox checked={acknowledged} onCheckedChange={(value) => setAcknowledged(value === true)} aria-label="Acknowledge account deletion consequences" />
          <span>I understand the immediate closure, plan cancellation and 12-month recovery terms.</span>
        </label>
        <div className={dialogStyles.field}>
          <Label htmlFor="delete-confirmation">Type DELETE or your account email</Label>
          <Input id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
        </div>
        {!recentlyAuthenticated && <div className={dialogStyles.field}>
          {!otpSent ? <Button type="button" className={controlStyles.secondaryButton} disabled={!acknowledged || !confirmationMatches || busy} onClick={() => void sendCode()}>Confirm recent authentication</Button> : <>
            <Label htmlFor="delete-auth-code">6-digit authentication code</Label>
            <Input id="delete-auth-code" inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} />
            <Button type="button" className={controlStyles.secondaryButton} disabled={busy || otp.length !== 6} onClick={() => void verifyCode()}>Verify Code</Button>
          </>}
        </div>}
        {recentlyAuthenticated && <p role="status" className="text-sm text-green-300">Recent authentication confirmed.</p>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <div className={dialogStyles.actions}>
          <Button type="button" className={controlStyles.secondaryButton} disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" className={controlStyles.destructiveButton} disabled={busy || !acknowledged || !confirmationMatches || !recentlyAuthenticated} onClick={() => void deleteAccount()}>{busy ? 'Closing Account…' : 'Delete My Account'}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
};
