/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, LoaderCircle, Mail, Phone, Send, UserPlus, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SignInModal } from './SignInModal';
import { AuthError, AuthLegal, VerificationCodeForm, authModalStyles as styles } from './AuthModalParts';

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  mobile?: string;
}

export const EmbeddedSignUpForm: React.FC = () => {
  const { t } = useTranslation('common');
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [loading, setLoading] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    mobile: ''
  });
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.mobile) {
      setError(t('form.fillRequired'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(t('form.validEmail'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          shouldCreateUser: true,
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            mobile: formData.mobile || null
          }
        }
      });
      if (error) {
        setError(error.message);
      } else {
        setStep('verify');
        startResendTimer();
      }
    } catch {
      setError(t('form.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError(t('form.completeCode'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: code,
        type: 'email'
      });
      if (error) {
        setError(error.message);
      } else if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          mobile: formData.mobile || null
        });

        // Fire-and-forget welcome + admin-signup emails. Failures must NOT block signup.
        const userId = data.user.id;
        const fullName = `${formData.first_name} ${formData.last_name}`.trim();
        const nowIso = new Date().toISOString();
        try {
          supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'welcome',
              recipientEmail: formData.email,
              idempotencyKey: `welcome-${userId}`,
              templateData: { firstName: formData.first_name },
            },
          }).then(({ error }) => {
            if (error) console.error('welcome email failed', error);
          }).catch((e) => console.error('welcome email failed', e));

          supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'admin-new-signup',
              recipientEmail: 'support@weddingwaitress.com.au',
              idempotencyKey: `admin-signup-${userId}`,
              templateData: { fullName, email: formData.email, date: nowIso },
            },
          }).then(({ error }) => {
            if (error) console.error('admin signup email failed', error);
          }).catch((e) => console.error('admin signup email failed', e));
        } catch (e) {
          console.error('email dispatch failed', e);
        }

        toast({
          title: t('form.welcomeTitle'),
          description: t('form.welcomeDesc')
        });
        navigate('/dashboard');
      }
    } catch {
      setError(t('form.verificationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          shouldCreateUser: true,
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            mobile: formData.mobile || null
          }
        }
      });
      if (!error) {
        toast({ title: t('form.codeSent'), description: t('form.codeSentDesc') });
        startResendTimer();
      } else {
        setError(error.message);
      }
    } catch {
      setError(t('form.failedResend'));
    } finally {
      setLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(30);
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <>
    <div className={styles.dialog}>
      <h2 className={styles.title}>
        <span className={styles.titleRow}>{step === 'form' ? <UserPlus className={styles.titleIcon} aria-hidden /> : <CheckCircle2 className={styles.titleIcon} aria-hidden />}{step === 'form' ? 'Create your free account' : 'Check your email'}</span>
      </h2>
      {step === 'form' && (
        <div className="text-center">
          <span className={styles.reassurance}><CheckCircle2 size={16} aria-hidden />No credit card required</span>
          <p className={styles.trial}>7-day free trial · Up to 20 guests</p>
          <p className={styles.description}>Start planning your wedding in one connected place.</p>
        </div>
      )}
      {step === 'verify' && (
        <p className={styles.description}>We sent a 6-digit verification code to {formData.email}.</p>
      )}

      {step === 'form' ? (
        <form onSubmit={handleSubmit} className={styles.body}>
          <div className={styles.fieldStack}>
            <div className={styles.fieldGroup}>
              <Label htmlFor="feat_first_name" className={styles.label}><UserRound aria-hidden />First name *</Label>
              <Input id="feat_first_name" type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className={styles.input} autoComplete="given-name" required disabled={loading} />
            </div>
            <div className={styles.fieldGroup}>
              <Label htmlFor="feat_last_name" className={styles.label}><UserRound aria-hidden />Last name *</Label>
              <Input id="feat_last_name" type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className={styles.input} autoComplete="family-name" required disabled={loading} />
            </div>
            <div className={styles.fieldGroup}>
              <Label htmlFor="feat_email" className={styles.label}><Mail aria-hidden />Email *</Label>
              <Input id="feat_email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={styles.input} autoComplete="email" required disabled={loading} />
            </div>
            <div className={styles.fieldGroup}>
              <Label htmlFor="feat_mobile" className={styles.label}><Phone aria-hidden />Mobile *</Label>
              <Input id="feat_mobile" type="tel" placeholder="04XX XXX XXX" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className={styles.input} autoComplete="tel" required disabled={loading} />
            </div>
          </div>

          <AuthError message={error} />
          <button type="submit" className={styles.primaryButton} disabled={loading}>{loading ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Send size={18} aria-hidden />}{loading ? 'Creating your account…' : 'Create Free Account & Continue'}</button>
          <AuthLegal onNavigate={(path) => navigate(path)} />
          <p className={styles.switchLine}>Already have an account? <button type="button" onClick={() => setSignInOpen(true)} className={styles.linkButton}>Sign in</button></p>
        </form>
      ) : (
        <VerificationCodeForm email={formData.email} code={verificationCode} setCode={setVerificationCode} loading={loading} error={error} resendTimer={resendTimer} onVerify={handleVerifyCode} onResend={handleResend} onCorrectEmail={() => { setStep('form'); setVerificationCode(['', '', '', '', '', '']); setError(''); }} />
      )}
    </div>
    <SignInModal open={signInOpen} onOpenChange={setSignInOpen} onBackToSignUp={() => setSignInOpen(false)} />
    </>
  );
};
