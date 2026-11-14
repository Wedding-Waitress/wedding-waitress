import {useTranslation} from 'react-i18next';
import {signupCountryOptions,resolveSignupCountry} from '@/lib/signupCountries';
import {signupCountryCopy} from '@/i18n/publicSignupCountryCopy';
import { queueCustomerWelcomeEmail } from '@/lib/customerWelcomeEmail';
import { PublicCopy } from '@/i18n/PublicCopy';
import { usePublicCopy } from '@/i18n/usePublicCopy';
import React, { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, Mail, Phone, Send, UserPlus, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { beginGuidedSetup } from '@/lib/guidedEventSetup';
import { MY_EVENTS_ENTRY_ROUTE } from '@/lib/authNavigation';
import { AuthError, AuthLegal, AuthModalHeader, VerificationCodeForm, authModalStyles as styles } from './AuthModalParts';
import { SignInModal } from './SignInModal';
import { normalizeGuestPhone } from '@/lib/guestPhone';
import { PRELAUNCH_SIGNUP_HOLD, PRELAUNCH_NOTICE, savePrelaunchRegistration } from '@/lib/prelaunch';

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

interface FormData { first_name: string; last_name: string; email: string; mobile: string; country_code:string; }

const emptyCode = () => ['', '', '', '', '', ''];
const emptyForm = (): FormData => ({ first_name: '', last_name: '', email: '', mobile: '', country_code:'' });
const mapVerificationError = (message?: string) => {
  if (!message) return 'Verification failed. Please try again.';
  if (/expired/i.test(message)) return 'This code has expired. Request a new code and try again.';
  if (/invalid|token/i.test(message)) return 'That code is incorrect. Check the code and try again.';
  return message;
};

export const SignUpModal: React.FC<SignUpModalProps> = ({ children, selectedPlan, redirectTo }) => {
  const copy = usePublicCopy();
  const {i18n}=useTranslation();const language=i18n.resolvedLanguage||i18n.language||'en';
  const countryOptions=React.useMemo(()=>signupCountryOptions(language),[language]);
  const [countryQuery,setCountryQuery]=useState('');
  const verifiedUserRef=useRef<{id:string;email?:string;created_at?:string}|null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'verify' | 'launch-notice'>('form');
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
          mobile: normalizeGuestPhone(formData.mobile),
          country_code: formData.country_code,
          // Untrusted pending input only. Never an entitlement or redemption proof.
          ...(selectedPlan ? { intended_plan: selectedPlan.key, intended_currency: 'AUD' } : {}),
        },
      },
    });
    return requestError;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (requestInFlightRef.current || loading) return;
    setError('');
    if ([formData.first_name, formData.last_name, formData.email, formData.mobile].some((value) => !value.trim())) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!resolveSignupCountry(countryQuery,language)) {setError(signupCountryCopy(language,2));return;}
    requestInFlightRef.current = true;
    signupRequestStartedAtRef.current = Date.now();
    setLoading(true);
    try {
      if (PRELAUNCH_SIGNUP_HOLD) {
        await savePrelaunchRegistration({ ...formData, intended_plan: selectedPlan?.key });
        signupRequestStartedAtRef.current = null;
        setStep('launch-notice');
        return;
      }
      const requestError = await requestCode();
      if (requestError) { signupRequestStartedAtRef.current = null; setError(requestError.message); return; }
      if (selectedPlan) {
        sessionStorage.setItem('ww_intended_plan', selectedPlan.key);
        sessionStorage.setItem('ww_intended_currency', 'AUD');
      }
      setStep('verify');
      setResendTimer(30);
    } catch {
      setError(PRELAUNCH_SIGNUP_HOLD ? 'We couldn’t confirm your registration. Please check your details and try again.' : 'An unexpected error occurred. Please try again.');
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
      let user=verifiedUserRef.current;
      if(!user){
        const {data,error:verifyError}=await supabase.auth.verifyOtp({email:formData.email.trim().toLowerCase(),token:code,type:'email'});
        if(verifyError){setError(mapVerificationError(verifyError.message));return;}
        if(!data.user)return;user=data.user;verifiedUserRef.current=user;
      }
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: formData.mobile.trim(),
      });
      if(profileError){setError(signupCountryCopy(language,3));return;}
      const {error:countryError}=await supabase.from('profiles').update({country_code:formData.country_code}).eq('id',user.id).is('country_code',null);
      if(countryError){setError(signupCountryCopy(language,3));return;}
      const createdAt = Date.parse(user.created_at || '');
      const isGenuinelyNew = signupRequestStartedAtRef.current !== null && Number.isFinite(createdAt) && createdAt >= signupRequestStartedAtRef.current - 60_000;
      if (isGenuinelyNew) await beginGuidedSetup(user.id, 'first_event', {
          customerFirstName: formData.first_name.trim(), customerSurname: formData.last_name.trim(),
          organiserName: formData.first_name.trim(), country: 'Australia',
        });
      void queueCustomerWelcomeEmail(user.id, user.email || formData.email, formData.first_name)
        .catch(() => console.error('Welcome email acceptance is pending'));
      setOpen(false);reset();
      toast({ title: 'Welcome to Wedding Waitress', description: 'Your account has been created successfully!' });
      // The selection only chooses the consent screen; the server still validates
      // catalogue, price, eligibility and payment before granting any access.
      const checkoutPlan = selectedPlan && ['essential', 'premium', 'unlimited'].includes(selectedPlan.key)
        ? selectedPlan.key : null;
      sessionStorage.removeItem('ww_intended_plan');
      sessionStorage.removeItem('ww_intended_currency');
      navigate(checkoutPlan
        ? `/dashboard/upgrade/checkout?plan=${checkoutPlan}&currency=AUD`
        : MY_EVENTS_ENTRY_ROUTE);
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
    verifiedUserRef.current=null;setCountryQuery('');
    setStep('form'); setFormData(emptyForm()); setVerificationCode(emptyCode()); setError(''); setResendTimer(0); signupRequestStartedAtRef.current = null;
  };
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (requestInFlightRef.current || loading)) return;
    setOpen(nextOpen);
    if (!nextOpen) reset();
  };
  const correctEmail = () => {
    verifiedUserRef.current=null;
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
            <AuthModalHeader icon={UserPlus} title="Create your free account" description="" signUpReassurance={!PRELAUNCH_SIGNUP_HOLD} selectedPlan={selectedPlan?.name} />
            <form onSubmit={handleSubmit} className={styles.body} noValidate>
              <div className={styles.fieldStack}>
                <div className={styles.fieldGroup}>
                  <Label htmlFor={`${idPrefix}-first-name`} className={styles.label}><UserRound aria-hidden /><PublicCopy text={"First name *"} /></Label>
                  <Input ref={firstNameRef} id={`${idPrefix}-first-name`} className={styles.input} value={formData.first_name} onChange={updateField('first_name')} autoComplete="given-name" required disabled={loading} aria-invalid={Boolean(error && !formData.first_name.trim())} />
                </div>
                <div className={styles.fieldGroup}>
                  <Label htmlFor={`${idPrefix}-last-name`} className={styles.label}><UserRound aria-hidden /><PublicCopy text={"Last name *"} /></Label>
                  <Input id={`${idPrefix}-last-name`} className={styles.input} value={formData.last_name} onChange={updateField('last_name')} autoComplete="family-name" required disabled={loading} aria-invalid={Boolean(error && !formData.last_name.trim())} />
                </div>
                <div className={styles.fieldGroup}>
                  <Label htmlFor={`${idPrefix}-email`} className={styles.label}><Mail aria-hidden /><PublicCopy text={"Email *"} /></Label>
                  <Input id={`${idPrefix}-email`} type="email" dir="ltr" className={styles.input} value={formData.email} onChange={updateField('email')} autoComplete="email" required disabled={loading} aria-invalid={Boolean(error && !formData.email.trim())} />
                </div>
                <div className={styles.fieldGroup}>
                  <Label htmlFor={`${idPrefix}-mobile`} className={styles.label}><Phone aria-hidden /><PublicCopy text={"Mobile *"} /></Label>
                  <Input id={`${idPrefix}-mobile`} type="tel" dir="ltr" inputMode="tel" placeholder="04XX XXX XXX" className={styles.input} value={formData.mobile} onChange={updateField('mobile')} autoComplete="tel" required disabled={loading} aria-invalid={Boolean(error && !formData.mobile.trim())} />
                </div>
                <div className={styles.fieldGroup}>
                  <Label htmlFor={`${idPrefix}-country`} className={styles.label}>{signupCountryCopy(language,0)}</Label>
                  <Input id={`${idPrefix}-country`} list={`${idPrefix}-countries`} className={styles.input} value={countryQuery} onChange={event=>{const value=event.target.value;setCountryQuery(value);setFormData(current=>({...current,country_code:resolveSignupCountry(value,language)||''}));}} placeholder={signupCountryCopy(language,1)} autoComplete="country-name" required disabled={loading} aria-invalid={Boolean(error&&!formData.country_code)} />
                  <datalist id={`${idPrefix}-countries`}>{countryOptions.map(country=><option key={country.code} value={country.name}/>)}</datalist>
                </div>
              </div>
              <AuthError message={error} />
              <button type="submit" className={styles.primaryButton} disabled={loading} aria-live="polite">
                {loading ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Send size={18} aria-hidden />}
                {copy(loading ? (PRELAUNCH_SIGNUP_HOLD ? 'Saving your registration…' : 'Creating your account…') : 'Create Free Account & Continue')}
              </button>
              <AuthLegal onNavigate={navigateFromModal} />
              <p className={styles.switchLine}><PublicCopy text={"Already have an account?"} />{' '}<button type="button" className={styles.linkButton} onClick={() => { setOpen(false); setSignInOpen(true); }}><PublicCopy text={"Sign in"} /></button></p>
            </form>
          </>
        ) : step === 'launch-notice' ? (
          <>
            <AuthModalHeader icon={CheckCircle2} title="Thank you — you’re on our launch list" description={PRELAUNCH_NOTICE} />
            <div className={styles.body}>
              <p><PublicCopy text={"Your details are saved. No account access, trial, payment or promotional code has been activated, and no notification has been sent yet."} /></p>
              <button type="button" className={styles.primaryButton} onClick={() => handleOpenChange(false)}><PublicCopy text={"Done"} /></button>
            </div>
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

