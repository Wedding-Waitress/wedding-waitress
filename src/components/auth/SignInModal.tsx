import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { secureEmailSchema } from '@/lib/security/validation';
import { logSecurityEvent, loginRateLimiter } from '@/lib/security/monitoring';
import { sanitize } from '@/lib/security/inputSanitizer';

interface SignInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToSignUp: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ 
  open, 
  onOpenChange, 
  onBackToSignUp 
}) => {
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first field when modal opens
  useEffect(() => {
    if (open && step === 'form') {
      const emailInput = document.querySelector('#signin-email') as HTMLInputElement;
      if (emailInput) {
        setTimeout(() => emailInput.focus(), 100);
      }
    }
  }, [open, step]);

  const mapSupabaseError = (error: any) => {
    if (!error?.message) return 'An unexpected error occurred';
    
    switch (error.message) {
      case 'email_address_invalid':
        return 'This email address is restricted in Supabase settings. Please check your Authentication settings.';
      case 'Invalid login credentials':
      case 'invalid_credentials':
        return 'Invalid verification code';
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
    setError('');
    
    // Check rate limiting
    if (!loginRateLimiter.isAllowed(email)) {
      setError(`Too many login attempts. Please try again later.`);
      logSecurityEvent.authFailure('Rate limit exceeded', email);
      return;
    }
    
    // Sanitize email input
    const sanitizedEmail = sanitize.email(email);
    
    const validation = secureEmailSchema.safeParse({ email: sanitizedEmail });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      logSecurityEvent.validationFailure('email', email, email);
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: sanitizedEmail
      });

      if (error) {
        // Handle hook timeout gracefully - email may still be sent
        if (error.message?.includes('Failed to reach hook within maximum time')) {
          console.warn('Auth hook timeout - proceeding to verify step as email may still arrive');
          setStep('verify');
          startResendTimer();
          toast({
            title: "Code may be on its way",
            description: "If you don't receive it within a minute, tap Resend.",
            variant: "default"
          });
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
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle code input changes
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6);
      const newCode = [...verificationCode];
      for (let i = 0; i < pastedCode.length && i + index < 6; i++) {
        newCode[i + index] = pastedCode[i];
      }
      setVerificationCode(newCode);
      
      // Focus the last filled input or next empty one
      const nextIndex = Math.min(index + pastedCode.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...verificationCode];
      newCode[index] = value;
      setVerificationCode(newCode);

      // Move to next input if digit entered
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleVerifyCode();
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
    onOpenChange(newOpen);
    if (!newOpen) {
      setStep('form');
      setEmail('');
      setVerificationCode(['', '', '', '', '', '']);
      setError('');
      setResendTimer(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            {step === 'form' ? 'Sign in' : 'Enter the 6-digit code'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === 'form' 
              ? 'Enter your email to get a verification code' 
              : `We've emailed a one-time code to ${email}`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-4 mt-4">
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <Label htmlFor="signin-email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !email}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Email me the code
              </Button>
            </form>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                By continuing you agree to our{' '}
                <a href="#" className="underline hover:text-foreground">Terms</a>
                {' '}&{' '}
                <a href="#" className="underline hover:text-foreground">Privacy Policy</a>
              </p>

              <div className="text-center">
                <button
                  type="button"
                  onClick={onBackToSignUp}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to Sign Up
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
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

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded text-center">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={handleVerifyCode} 
                className="w-full" 
                disabled={loading || verificationCode.join('').length !== 6}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Code
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendTimer > 0 || loading}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};