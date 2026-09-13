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
  const confirmationMatches = useMemo(() => confirmation.trim() === 'CLOSE' || (!!email && confirmation.trim().toLowerCase() === email.toLowerCase()), [confirmation, email]);

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
    setOtp('');
    setRecentlyAuthenticated(true);
  };

  const deleteAccount = async () => {
    if (!acknowledged || !confirmationMatches || !recentlyAuthenticated) return;
    setBusy(true); setError('');
    const { data, error: invokeError } = await supabase.functions.invoke('close-account', { body: { confirmation: confirmation.trim(), operation: 'ordinary_closure' } });
    if (invokeError || data?.error) { setBusy(false); setError(data?.error || invokeError?.message || 'Account closure could not be completed.'); return; }
    await supabase.auth.signOut();
    toast({ title: 'Account closed', description: 'Your saved information remains retained. Your original paid expiry date has not changed.' });
    navigate('/', { replace: true });
  };

  return <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
    <DialogContent data-appearance="espresso-glass" className={`sm:max-w-2xl ${dialogStyles.dialog}`} overlayClassName={dialogStyles.overlay}>
      <DialogHeader>
        <div className={dialogStyles.iconWrap}><AlertTriangle aria-hidden="true" /></div>
        <DialogTitle className={dialogStyles.title}>Close Account</DialogTitle>
        <DialogDescription className={dialogStyles.description}>Deactivate access without deleting your saved information.</DialogDescription>
      </DialogHeader>
      <div className={dialogStyles.form}>
        <ul className="list-disc space-y-2 pl-5 text-sm text-[#684b40]">
          <li>Account and team access will close immediately. Your saved account and event information remains retained.</li>
          <li>Closure does not pause, restart or extend your original paid term or free trial.</li>
          <li>If your original paid term is still valid when you return, you may reopen for its remaining time without paying again.</li>
          <li>After expiry, choose one of the three existing packages. Paid access resumes only after a successful verified payment.</li>
          <li>This is not a personal-data erasure request. Contact Wedding Waitress support for privacy requests.</li>
          <li>Billing, invoice, transaction, fraud-prevention, security and legal records may be retained longer where Australian law requires it.</li>
          <li>Closing an account does not automatically create a refund. Refund rights remain subject to applicable plan terms and Australian law.</li>
        </ul>
        <label className="flex items-start gap-3 text-sm text-[#684b40]">
          <Checkbox checked={acknowledged} onCheckedChange={(value) => setAcknowledged(value === true)} aria-label="Acknowledge account closure consequences" />
          <span>I understand access closes immediately, my saved information remains retained, and the original entitlement expiry does not change.</span>
        </label>
        <div className={dialogStyles.field}>
          <Label htmlFor="delete-confirmation">Type CLOSE or your account email</Label>
          <Input id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
        </div>
        {!recentlyAuthenticated && <div className={dialogStyles.field}>
          {!otpSent ? <Button type="button" className={controlStyles.secondaryButton} disabled={!email || !acknowledged || !confirmationMatches || busy} onClick={() => void sendCode()}>Confirm recent authentication</Button> : <>
            <Label htmlFor="delete-auth-code">6-digit authentication code</Label>
            <Input id="delete-auth-code" inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} />
            <Button type="button" className={controlStyles.secondaryButton} disabled={busy || otp.length !== 6} onClick={() => void verifyCode()}>Verify Code</Button>
          </>}
        </div>}
        {recentlyAuthenticated && <p role="status" className="text-sm text-green-700">Recent authentication confirmed.</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className={dialogStyles.actions}>
          <Button type="button" className={controlStyles.primaryButton} disabled={busy || !acknowledged || !confirmationMatches || !recentlyAuthenticated} onClick={() => void deleteAccount()}>{busy ? 'Closing Account…' : 'Close My Account'}</Button>
          <Button type="button" className={controlStyles.secondaryButton} disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
};
