/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import React, { useState, useRef, useEffect, useId } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { LoaderCircle, CircleUserRound, Mail, Send } from 'lucide-react';
import { secureEmailSchema } from '@/lib/security/validation';
import { logSecurityEvent, loginRateLimiter } from '@/lib/security/monitoring';
import { sanitize } from '@/lib/security/inputSanitizer';
import { getSafeAuthenticatedReturnTo } from '@/lib/authNavigation';
import { AuthError, AuthLegal, AuthModalHeader, VerificationCodeForm, authModalStyles as styles } from './AuthModalParts';

interface SignInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToSignUp: () => void;
  redirectTo?: string;
}

export const SignInModal: React.FC<SignInModalProps> = ({ 
  open, 
  onOpenChange, 
  onBackToSignUp,
  redirectTo,
}) => {
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [cooldownTimer, setCooldownTimer] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const idPrefix = useId();
  // State updates are asynchronous, so `loading` can still be false if Radix
  // emits onOpenChange(false) during the same click that starts the OTP request.
  // This synchronous ref closes that race without preventing normal dismissal.
  const otpRequestInFlightRef = useRef(false);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownTimer > 0) {
      const timer = setInterval(() => {
        setCooldownTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownTimer]);

  // Focus first field when modal opens
  useEffect(() => {
    if (open && step === 'form') {
      setTimeout(() => emailRef.current?.focus(), 100);
    }
  }, [open, step]);

  const mapSupabaseError = (error: { message?: string } | null) => {
    if (!error?.message) return 'An unexpected error occurred';
    
    switch (error.message) {
      case 'email_address_invalid':
        return 'This email address is restricted in Supabase settings. Please check your Authentication settings.';
      case 'Invalid login credentials':
      case 'invalid_credentials':
        return 'Invalid verification code';
      case 'Token has expired or is invalid':
      case 'otp_expired':
        return 'This code has expired. Please tap "Resend code" to get a new one.';
      case 'Email not confirmed':
        return 'Please check your email and click the confirmation link';
      case 'Too many requests':
        return 'Too many requests. Please wait a moment';
      default:
        return error.message;
    }
  };

  // Handle email submission for OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    otpRequestInFlightRef.current = true;
    setError('');
    
    // Check rate limiting
    const remainingTime = loginRateLimiter.getRemainingTime(email);
    if (!loginRateLimiter.isAllowed(email)) {
      setCooldownTimer(remainingTime);
      setError(`Please wait ${remainingTime} seconds before trying again.`);
      logSecurityEvent.authFailure('Rate limit exceeded', email);
      otpRequestInFlightRef.current = false;
      return;
    }
    
    // Sanitize email input
    const sanitizedEmail = sanitize.email(email);
    
    const validation = secureEmailSchema.safeParse({ email: sanitizedEmail });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      logSecurityEvent.validationFailure('email', email, email);
      otpRequestInFlightRef.current = false;
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: sanitizedEmail
      });

      if (error) {
        // Handle hook timeout (cold start) - retry after warming up the function
        if (error.message?.includes('Failed to reach hook within maximum time')) {
          console.warn('Auth hook timeout (cold start) - warming up and retrying...');
          toast({
            title: "Warming up...",
            description: "Please wait a moment while we prepare your code.",
            variant: "default"
          });
          
          // Wait 2 seconds for the edge function to finish booting
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Retry - the function is now warm and will respond in ~5ms
          const { error: retryError } = await supabase.auth.signInWithOtp({
            email: sanitizedEmail
          });
          
          if (retryError) {
            console.error('Retry also failed:', retryError.message);
            setError('Something went wrong. Please try again.');
            logSecurityEvent.authFailure(retryError.message || 'Retry failed', sanitizedEmail);
          } else {
            setStep('verify');
            startResendTimer();
            toast({
              title: "Code sent!",
              description: "Check your email for the verification code."
            });
          }
        } else {
          setError(mapSupabaseError(error));
          logSecurityEvent.authFailure(error.message || 'Unknown error', sanitizedEmail);
        }
      } else {
        setStep('verify');
        startResendTimer();
        toast({
          title: "Code sent!",
          description: "Check your email for the verification code."
        });
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      otpRequestInFlightRef.current = false;
      setLoading(false);
    }
  };

  // Handle code verification
  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: code,
        type: 'email'
      });

      if (error) {
        setError(mapSupabaseError(error));
      } else if (data.user) {
        // Success!
        onOpenChange(false);
        toast({
          title: "Signed in ✔",
        });
        navigate(getSafeAuthenticatedReturnTo(redirectTo));
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase()
      });

      if (!error) {
        toast({
          title: "Code sent!",
          description: "A new verification code has been sent to your email."
        });
        startResendTimer();
      } else {
        setError(mapSupabaseError(error));
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(30);
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Reset modal state when closed
  const handleOpenChange = (newOpen: boolean) => {
    // Never allow the modal to close while an OTP request is in flight. The
    // ref is intentionally checked before state because it updates during the
    // originating click, eliminating the first-click close race.
    if (!newOpen && (otpRequestInFlightRef.current || loading)) return;
    onOpenChange(newOpen);
    if (!newOpen) {
      setStep('form');
      setEmail('');
      setVerificationCode(['', '', '', '', '', '']);
      setError('');
      setResendTimer(0);
    }
  };

  const correctEmail = () => {
    setStep('form');
    setVerificationCode(['', '', '', '', '', '']);
    setError('');
    setResendTimer(0);
  };

  const navigateFromModal = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`${styles.dialog} ${styles.signInDialog}`}
        overlayClassName="bg-black/75"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (loading) e.preventDefault();
        }}
      >
        {step === 'form' ? (
          <>
          <AuthModalHeader
            icon={CircleUserRound}
            title="Welcome back"
            description="Continue planning your wedding in one connected place."
          />
            <form onSubmit={handleEmailSubmit} className={styles.body} noValidate>
              <div className={styles.fieldStack}>
                <div className={styles.fieldGroup}>
                  <Label htmlFor={`${idPrefix}-email`} className={styles.label}><Mail aria-hidden />Email</Label>
                  <Input ref={emailRef} id={`${idPrefix}-email`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={styles.input} autoComplete="email" required aria-invalid={Boolean(error)} disabled={loading} />
                </div>
              </div>
              <AuthError message={cooldownTimer > 0 ? `Please wait ${cooldownTimer} seconds before trying again.` : error} />
              <button type="submit" className={styles.primaryButton} disabled={loading || !email || cooldownTimer > 0} aria-live="polite">
                {loading ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Send size={18} aria-hidden />}
                {loading
                  ? 'Emailing your code…'
                  : cooldownTimer > 0
                    ? `Wait ${cooldownTimer}s`
                    : 'Email Me a Sign-In Code'}
              </button>
              <AuthLegal onNavigate={navigateFromModal} />
              <p className={styles.switchLine}>New to Wedding Waitress?{' '}<button type="button" onClick={onBackToSignUp} className={styles.linkButton}>Create a free account</button></p>
            </form>
          </>
        ) : (
          <>
          <AuthModalHeader
            icon={Mail}
            title="Check your email"
            description={`We sent a 6-digit sign-in code to ${email.trim().toLowerCase()}.`}
          />
            <VerificationCodeForm email={email.trim().toLowerCase()} code={verificationCode} setCode={setVerificationCode} loading={loading} error={error} resendTimer={resendTimer} onVerify={handleVerifyCode} onResend={handleResend} onCorrectEmail={correctEmail} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
