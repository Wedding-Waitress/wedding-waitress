import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

interface SignInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToSignUp: () => void;
}

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

const otpEmailSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

export const SignInModal: React.FC<SignInModalProps> = ({ 
  open, 
  onOpenChange, 
  onBackToSignUp 
}) => {
  const [method, setMethod] = useState<'password' | 'otp'>('password');
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      case 'Invalid login credentials':
      case 'invalid_credentials':
        return 'Invalid email or password';
      case 'Email not confirmed':
        return 'Please check your email and click the confirmation link';
      case 'Too many requests':
        return 'Too many login attempts. Please wait a moment';
      case 'User not found':
        return 'No account found with this email';
      case 'email_address_invalid':
        return 'This email address is restricted. Try password sign-in or contact support';
      default:
        return error.message;
    }
  };

  // Handle password sign in
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validation = signInSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        setError(mapSupabaseError(error));
      } else if (data.user) {
        onOpenChange(false);
        toast({
          title: "Signed in ✔",
        });
        navigate('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP email submission
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validation = otpEmailSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email
      });

      if (error) {
        setError(mapSupabaseError(error));
      } else {
        setStep('verify');
        startResendTimer();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    const validation = otpEmailSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        setError(mapSupabaseError(error));
      } else {
        toast({
          title: "Reset email sent!",
          description: "Check your email for password reset instructions."
        });
      }
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
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
        email: email
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
      setPassword('');
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
              ? 'Choose your preferred sign-in method below' 
              : `We've emailed a one-time code to ${email}`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-4 mt-4">
            {/* Method Selection */}
            <div className="flex rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setMethod('password')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  method === 'password' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setMethod('otp')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  method === 'otp' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Email Code
              </button>
            </div>

            {/* Password Method */}
            {method === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
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

                <div>
                  <Label htmlFor="signin-password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || !email || !password}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* OTP Method */}
            {method === 'otp' && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="signin-email-otp" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="signin-email-otp"
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
                  Email me a code
                </Button>
              </form>
            )}

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