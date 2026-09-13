// 🔒 PRODUCTION-LOCKED — Edit Details Modal (2026-04-18)
import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile, type UserProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import styles from './AccountDialog.module.css';
import controlStyles from './AccountControls.module.css';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
}

type ModalStep = 'edit' | 'review' | 'email-pending' | 'complete';
type EditableField = 'firstName' | 'lastName' | 'email' | 'mobile';

interface ReviewedChange {
  field: EditableField;
  label: string;
  before: string;
  after: string;
}

const displayedValue = (value: string) => value || 'Not provided';
const normalEmail = (value: string) => value.trim().toLowerCase();

export const EditDetailsModal: React.FC<Props> = ({ open, onOpenChange, initialEmail = '' }) => {
  const { profile, updateCachedProfile } = useProfile();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [currentAuthEmail, setCurrentAuthEmail] = useState('');
  const [step, setStep] = useState<ModalStep>('edit');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!open || !profile) return;
    let cancelled = false;

    setFirstName(profile.first_name || '');
    setLastName(profile.last_name || '');
    setMobile(profile.mobile || '');
    const knownEmail = initialEmail || profile.email || '';
    setCurrentAuthEmail(knownEmail);
    setEmail(knownEmail);
    setStep('edit');
    setErrorMessage('');

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const authEmail = data.user?.email || initialEmail || profile.email || '';
      setCurrentAuthEmail(authEmail);
      setEmail(authEmail);
    });

    return () => { cancelled = true; };
  }, [initialEmail, open, profile]);

  const changes = useMemo<ReviewedChange[]>(() => {
    if (!profile) return [];
    const candidates: Array<[EditableField, string, string, string]> = [
      ['firstName', 'First name', profile.first_name?.trim() || '', firstName.trim()],
      ['lastName', 'Last name', profile.last_name?.trim() || '', lastName.trim()],
      ['email', 'Login email', normalEmail(currentAuthEmail || profile.email || ''), normalEmail(email)],
      ['mobile', 'Phone', profile.mobile?.trim() || '', mobile.trim()],
    ];
    return candidates
      .filter(([, , before, after]) => before !== after)
      .map(([field, label, before, after]) => ({ field, label, before, after }));
  }, [currentAuthEmail, email, firstName, lastName, mobile, profile]);

  const emailChanged = changes.some((change) => change.field === 'email');
  const phoneChanged = changes.some((change) => change.field === 'mobile');
  const profileChanged = changes.some((change) => change.field !== 'email');

  const handleReview = () => {
    setErrorMessage('');
    if (!changes.length) {
      setErrorMessage('No changes to review.');
      return;
    }
    if (!normalEmail(email) || !/^\S+@\S+\.\S+$/.test(normalEmail(email))) {
      setErrorMessage('Enter a valid login email address.');
      return;
    }
    setStep('review');
  };

  const refreshCachedProfile = async () => {
    if (!profile) return;
    const { data: fresh } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .single();
    if (fresh) {
      updateCachedProfile({
        ...fresh,
        profile_image_fit: fresh.profile_image_fit === 'contain' ? 'contain' : 'cover',
        profile_image_url: null,
      } satisfies UserProfile);
    }
  };

  const handleApprove = async () => {
    if (!profile || !changes.length) return;
    setSaving(true);
    setErrorMessage('');

    if (profileChanged) {
      const profileUpdates: Pick<UserProfile, 'first_name' | 'last_name' | 'mobile'> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        mobile: mobile.trim(),
      };
      const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', profile.id);
      if (error) {
        setSaving(false);
        setErrorMessage(error.message);
        return;
      }
      await refreshCachedProfile();
      window.dispatchEvent(new Event('profile-updated'));
    }

    if (emailChanged) {
      const requestedEmail = normalEmail(email);
      const { data, error } = await supabase.auth.updateUser(
        { email: requestedEmail },
        { emailRedirectTo: `${window.location.origin}/account/account-info` },
      );
      if (error) {
        setSaving(false);
        setErrorMessage(
          profileChanged
            ? `Your name or phone changes were saved, but the login email change could not be requested: ${error.message}`
            : error.message,
        );
        return;
      }

      const activeEmail = normalEmail(data.user?.email || currentAuthEmail);
      setSaving(false);
      window.dispatchEvent(new Event('account-auth-updated'));
      if (activeEmail === requestedEmail) {
        setCurrentAuthEmail(requestedEmail);
        updateCachedProfile({ email: requestedEmail });
        setStep('complete');
        toast({ title: 'Details updated', description: 'Your new email is now used to sign in.' });
      } else {
        setStep('email-pending');
        toast({ title: 'Verification required', description: 'Your current login email remains active until the email change is confirmed.' });
      }
      return;
    }

    setSaving(false);
    setStep('complete');
    toast({ title: 'Details updated', description: 'Your approved changes have been saved.' });
  };

  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent data-appearance="espresso-glass" className={`sm:max-w-md ${styles.dialog}`} overlayClassName={styles.overlay}>
        <DialogHeader>
          <DialogTitle className={styles.title}>
            {step === 'review' ? 'Review changes' : step === 'email-pending' ? 'Verify your new email' : step === 'complete' ? 'Details updated' : 'Edit Details'}
          </DialogTitle>
          <DialogDescription className="sr-only">Review and approve changes to your Wedding Waitress account details.</DialogDescription>
        </DialogHeader>

        {step === 'edit' && (
          <div className={styles.form}>
            <div className={styles.field}><Label htmlFor="first">First name</Label><Input id="first" value={firstName} onChange={(event) => setFirstName(event.target.value)} /></div>
            <div className={styles.field}><Label htmlFor="last">Last name</Label><Input id="last" value={lastName} onChange={(event) => setLastName(event.target.value)} /></div>
            <div className={styles.field}>
              <Label htmlFor="account-email">Login email</Label>
              <Input id="account-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              <p className={styles.fieldHint}>Changing this requests a secure Supabase Auth email change. Your current email remains your login until verification is complete.</p>
            </div>
            <div className={styles.field}>
              <Label htmlFor="mob">Phone</Label>
              <Input id="mob" value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="+61..." />
              <p className={styles.fieldHint}>This is your messaging contact number. Changing it removes any previous phone verification and turns SMS alerts off until you verify the new number separately.</p>
            </div>
            {errorMessage && <p role="alert" className={styles.errorMessage}>{errorMessage}</p>}
            <div className={`${styles.actions} ${styles.confirmActions}`}>
              <Button onClick={handleReview} className={controlStyles.primaryButton}>Review changes</Button>
              <Button variant="ghost" className={controlStyles.secondaryButton} onClick={close}>Cancel</Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className={styles.form}>
            <p className={styles.description}>Nothing has been changed yet. Check each item below, then approve once to apply all listed changes.</p>
            <dl className={styles.reviewList}>
              {changes.map((change) => (
                <div className={styles.reviewItem} key={change.field}>
                  <dt>{change.label}</dt>
                  <dd>
                    <div className={styles.reviewValue}>
                      <span className={styles.reviewValueLabel}>Current</span>
                      <span>{displayedValue(change.before)}</span>
                    </div>
                    <div className={`${styles.reviewValue} ${styles.reviewValueNew}`}>
                      <span className={styles.reviewValueLabel}>New</span>
                      <strong>{displayedValue(change.after)}</strong>
                    </div>
                  </dd>
                </div>
              ))}
            </dl>
            {emailChanged && <p className={styles.notice}>Approving requests the email change only. Your current login remains active until Supabase verification confirms the new address.</p>}
            {phoneChanged && <p className={styles.notice}>The new phone number will be saved as your messaging contact, but it will not be marked verified. Existing SMS-alert enrolment will be disabled until the new number is verified separately.</p>}
            {errorMessage && <p role="alert" className={styles.errorMessage}>{errorMessage}</p>}
            <div className={`${styles.actions} ${styles.confirmActions}`}>
              <Button onClick={handleApprove} disabled={saving} className={controlStyles.primaryButton}>{saving ? 'Applying…' : 'Approve'}</Button>
              <Button variant="ghost" className={controlStyles.secondaryButton} disabled={saving} onClick={() => { setErrorMessage(''); setStep('edit'); }}>Back</Button>
            </div>
          </div>
        )}

        {step === 'email-pending' && (
          <div className={styles.form}>
            <p className={styles.description}>Your approved profile changes were saved and the login email change was requested.</p>
            <p className={styles.notice}>Follow the confirmation instructions sent by Supabase. Until verification finishes, <strong>{currentAuthEmail}</strong> remains your active login email. No phone number was marked verified by this change.</p>
            <div className={`${styles.actions} ${styles.confirmActions}`}><Button onClick={close} className={controlStyles.primaryButton}>Done</Button></div>
          </div>
        )}

        {step === 'complete' && (
          <div className={styles.form}>
            <p className={styles.description}>{emailChanged ? 'Your new email is now active and is used to sign in.' : 'All approved changes have been saved.'}</p>
            {phoneChanged && <p className={styles.notice}>Your phone number is saved as a contact number and remains unverified until you complete the separate SMS verification flow.</p>}
            <div className={`${styles.actions} ${styles.confirmActions}`}><Button onClick={close} className={controlStyles.primaryButton}>Done</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
