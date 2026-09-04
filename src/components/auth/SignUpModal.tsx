import React, { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, Mail, Phone, Send, UserPlus, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { beginGuidedSetup, GUIDED_SETUP_ROUTE } from '@/lib/guidedEventSetup';
import { getSafeAuthenticatedReturnTo } from '@/lib/authNavigation';
import { AuthError, AuthLegal, AuthModalHeader, VerificationCodeForm, authModalStyles as styles } from './AuthModalParts';
import { SignInModal } from './SignInModal';

export interface SignUpPlanContext {
  key: 'essential' | 'premium' | 'unlimited' | 'vendor_pro';
  name: 'Essential' | 'Premium' | 'Ultimate' | 'Vendor Pro';
  currency?: import('@/lib/currencyPricing').CurrencyCode;
}

interface SignUpModalProps {
  children: React.ReactNode;
  selectedPlan?: SignUpPlanContext;
  redirectTo?: string;
}

interface FormData { first_name: string; last_name: string; email: string; mobile: string; }

const emptyCode = () => ['', '', '', '', '', ''];
const emptyForm = (): FormData => ({ first_name: '', last_name: '', email: '', mobile: '' });
const mapVerificationError = (message?: string) => {
  if (!message) return 'Verification failed. Please try again.';
  if (/expired/i.test(message)) return 'This code has expired. Request a new code and try again.';
  if (/invalid|token/i.test(message)) return 'That code is incorrect. Check the code and try again.';
  return message;
};

export const SignUpModal: React.FC<SignUpModalProps> = ({ children, selectedPlan, redirectTo }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [verificationCode, setVerificationCode] = useState(emptyCode);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [signInOpen, setSignInOpen] = useState(false);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const requestInFlightRef = useRef(false);
  const signupRequestStartedAtRef = useRef<number | null>(null);
  const idPrefix = useId();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open && step === 'form') window.setTimeout(() => firstNameRef.current?.focus(), 100);
  }, [open, step]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = window.setInterval(() => setResendTimer((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendTimer > 0]);

  const requestCode = async () => {
    const { error: requestError } = await supabase.auth.signInWithOtp({
      email: formData.email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        data: {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          mobile: formData.mobile.trim(),
          ...(selectedPlan ? { intended_plan: selectedPlan.key, intended_currency: selectedPlan.currency || 'AUD' } : {}),
        },
      },
    });
    return requestError;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if ([formData.first_name, formData.last_name, formData.email, formData.mobile].some((value) => !value.trim())) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    requestInFlightRef.current = true;
    signupRequestStartedAtRef.current = Date.now();
    setLoading(true);
    try {
      const requestError = await requestCode();
      if (requestError) { signupRequestStartedAtRef.current = null; setError(requestError.message); return; }
      if (selectedPlan) {
        sessionStorage.setItem('ww_intended_plan', selectedPlan.key);
        sessionStorage.setItem('ww_intended_currency', selectedPlan.currency || 'AUD');
      }
      setStep('verify');
      setResendTimer(30);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) { setError('Please enter the complete 6-digit code.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: formData.email.trim().toLowerCase(), token: code, type: 'email',
      });
      if (verifyError) { setError(mapVerificationError(verifyError.message)); return; }
      if (!data.user) return;
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: formData.mobile.trim(),
      });
      if (profileError) console.error('Profile creation error:', profileError);
      const createdAt = Date.parse(data.user.created_at || '');
      const isGenuinelyNew = signupRequestStartedAtRef.current !== null && Number.isFinite(createdAt) && createdAt >= signupRequestStartedAtRef.current - 60_000;
      if (isGenuinelyNew) await beginGuidedSetup(data.user.id, 'first_event', {
          customerFirstName: formData.first_name.trim(), customerSurname: formData.last_name.trim(),
          organiserName: formData.first_name.trim(), country: 'Australia',
        });
      setOpen(false);
      toast({ title: 'Welcome to Wedding Waitress', description: 'Your account has been created successfully!' });
      navigate(isGenuinelyNew ? `${GUIDED_SETUP_ROUTE}?mode=first&new=1` : getSafeAuthenticatedReturnTo(redirectTo));
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || loading) return;
    setLoading(true);
    setError('');
    try {
      const requestError = await requestCode();
      if (requestError) { setError(requestError.message); return; }
      setResendTimer(30);
      toast({ title: 'Code sent!', description: 'A new verification code has been sent to your email.' });
    } catch {
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('form'); setFormData(emptyForm()); setVerificationCode(emptyCode()); setError(''); setResendTimer(0); signupRequestStartedAtRef.current = null;
  };
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (requestInFlightRef.current || loading)) return;
    setOpen(nextOpen);
    if (!nextOpen) reset();
  };
  const correctEmail = () => {
    setStep('form'); setVerificationCode(emptyCode()); setError(''); setResendTimer(0);
  };
  const navigateFromModal = (path: string) => { setOpen(false); navigate(path); };
  const updateField = (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={styles.dialog} overlayClassName="bg-black/75" onEscapeKeyDown={(event) => { if (loading) event.preventDefault(); }}>
        {step === 'form' ? (
          <>
            <AuthModalHeader icon={UserPlus} title="Create your free account" description="Start planning your wedding in one connected place." signUpReassurance selectedPlan={selectedPlan?.name} />
            <form onSubmit={handleSubmit} className={styles.body} noValidate>
              <div className={styles.fieldStack}>
                <div className={styles.fieldGroup}>
                  <Label htmlFor={`${idPrefix}-first-name`} className={styles.label}><UserRound aria-hidden />First name *</Label>
                  <Input ref={firstNameRef} id={`${idPrefix}-first-name`} className={styles.input} value={formData.first_name} onChange={updateField('first_name')} autoComplete="given-name" required disabled={loading} aria-invalid={Boolean(error && !formData.first_name.trim())} />
                </div>
                <div className={styles.fieldGroup}>
                  <Label htmlFor={`${idPrefix}-last-name`} className={styles.label}><UserRound aria-hidden />Last name *</Label>
                  <Input id={`${idPrefix}-last-name`} className={styles.input} value={formData.last_name} onChange={updateField('last_name')} autoComplete="family-name" required disabled={loading} aria-invalid={Boolean(error && !formData.last_name.trim())} />
                </div>
                <div className={styles.fieldGroup}>
                  <Label htmlFor={`${idPrefix}-email`} className={styles.label}><Mail aria-hidden />Email *</Label>
                  <Input id={`${idPrefix}-email`} type="email" className={styles.input} value={formData.email} onChange={updateField('email')} autoComplete="email" required disabled={loading} aria-invalid={Boolean(error && !formData.email.trim())} />
                </div>
                <div className={styles.fieldGroup}>
                  <Label htmlFor={`${idPrefix}-mobile`} className={styles.label}><Phone aria-hidden />Mobile *</Label>
                  <Input id={`${idPrefix}-mobile`} type="tel" inputMode="tel" placeholder="04XX XXX XXX" className={styles.input} value={formData.mobile} onChange={updateField('mobile')} autoComplete="tel" required disabled={loading} aria-invalid={Boolean(error && !formData.mobile.trim())} />
                </div>
              </div>
              <AuthError message={error} />
              <button type="submit" className={styles.primaryButton} disabled={loading} aria-live="polite">
                {loading ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Send size={18} aria-hidden />}
                {loading ? 'Creating your account…' : 'Create Free Account & Continue'}
              </button>
              <AuthLegal onNavigate={navigateFromModal} />
              <p className={styles.switchLine}>Already have an account?{' '}<button type="button" className={styles.linkButton} onClick={() => { setOpen(false); setSignInOpen(true); }}>Sign in</button></p>
            </form>
          </>
        ) : (
          <>
            <AuthModalHeader icon={CheckCircle2} title="Check your email" description={`We sent a 6-digit verification code to ${formData.email.trim().toLowerCase()}.`} selectedPlan={selectedPlan?.name} />
            <VerificationCodeForm email={formData.email.trim().toLowerCase()} code={verificationCode} setCode={setVerificationCode} loading={loading} error={error} resendTimer={resendTimer} onVerify={handleVerifyCode} onResend={handleResend} onCorrectEmail={correctEmail} />
          </>
        )}
      </DialogContent>
      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} onBackToSignUp={() => { setSignInOpen(false); setOpen(true); }} redirectTo={redirectTo} />
    </Dialog>
  );
};
