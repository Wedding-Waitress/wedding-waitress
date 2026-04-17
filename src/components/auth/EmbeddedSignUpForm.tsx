import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SignInModal } from './SignInModal';

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
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.first_name || !formData.last_name || !formData.email) {
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

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pastedCode = value.slice(0, 6);
      const newCode = [...verificationCode];
      for (let i = 0; i < pastedCode.length && i + index < 6; i++) {
        newCode[i + index] = pastedCode[i];
      }
      setVerificationCode(newCode);
      const nextIndex = Math.min(index + pastedCode.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...verificationCode];
      newCode[index] = value;
      setVerificationCode(newCode);
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') handleVerifyCode();
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
    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-8 w-full max-w-[420px]">
      <h2 className="text-xl font-semibold text-center text-gray-900">
        {step === 'form' ? t('form.createFreeAccount') : t('form.enterCode')}
      </h2>
      {step === 'form' && (
        <p className="text-sm text-gray-500 text-center mt-2">
          {t('form.verificationSent')}
        </p>
      )}
      {step === 'verify' && (
        <p className="text-sm text-gray-500 text-center mt-2">
          {t('form.emailedCode', { email: formData.email })}
        </p>
      )}

      {step === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-3">
            <div>
              <Label htmlFor="feat_first_name" className="text-sm font-medium">{t('form.firstNameLabel')}</Label>
              <Input id="feat_first_name" type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="mt-1" disabled={loading} />
            </div>
            <div>
              <Label htmlFor="feat_last_name" className="text-sm font-medium">{t('form.lastNameLabel')}</Label>
              <Input id="feat_last_name" type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="mt-1" disabled={loading} />
            </div>
            <div>
              <Label htmlFor="feat_email" className="text-sm font-medium">{t('form.emailLabel')}</Label>
              <Input id="feat_email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-1" disabled={loading} />
            </div>
            <div>
              <Label htmlFor="feat_mobile" className="text-sm font-medium">{t('form.mobileLabel')}</Label>
              <Input id="feat_mobile" type="tel" placeholder={t('form.mobilePlaceholder')} value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className="mt-1" disabled={loading} />
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

          <div className="space-y-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('form.sendVerificationCode')}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              {t('form.termsAgree')}{' '}
              <a href="/terms" className="underline hover:text-gray-700">{t('form.termsOfServiceLink')}</a>
              {' '}&{' '}
              <a href="/privacy" className="underline hover:text-gray-700">{t('form.privacyPolicyLink')}</a>
            </p>
            <div className="text-center">
              <span className="text-sm text-gray-500">
                {t('form.alreadyHaveAccount')}{' '}
                <button
                  type="button"
                  onClick={() => setSignInOpen(true)}
                  className="font-bold hover:underline"
                  style={{ color: '#856A4C' }}
                >
                  {t('form.signInLink')}
                </button>
              </span>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-4 mt-6">
          <div className="flex justify-center gap-2">
            {verificationCode.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="w-12 h-12 text-center text-lg font-semibold"
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
              />
            ))}
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded text-center">{error}</div>}
          <div className="space-y-3">
            <Button onClick={handleVerifyCode} className="w-full" disabled={loading || verificationCode.join('').length !== 6}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('form.verifyCode')}
            </Button>
            <div className="text-center">
              <button type="button" onClick={handleResend} disabled={resendTimer > 0 || loading} className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {resendTimer > 0 ? t('form.resendIn', { seconds: resendTimer }) : t('form.resendCode')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />
    </>
  );
};