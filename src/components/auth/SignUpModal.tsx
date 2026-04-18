/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { SignInModal } from './SignInModal';

interface SignUpModalProps {
  children: React.ReactNode;
}

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  mobile?: string;
}

export const SignUpModal: React.FC<SignUpModalProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    mobile: ''
  });
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [signInOpen, setSignInOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first field when modal opens
  useEffect(() => {
    if (open && step === 'form') {
      const firstInput = document.querySelector('#first_name') as HTMLInputElement;
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }, [open, step]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.email) {
      setError('Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
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
        email: formData.email,
        token: code,
        type: 'email'
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Upsert profile data
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            mobile: formData.mobile || null
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        // Success!
        setOpen(false);
        toast({
          title: "Welcome to Wedding Waitress 🎉",
          description: "Your account has been created successfully!"
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
        toast({
          title: "Code sent!",
          description: "A new verification code has been sent to your email."
        });
        startResendTimer();
      } else {
        setError(error.message);
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
    setOpen(newOpen);
    if (!newOpen) {
      setStep('form');
      setFormData({ first_name: '', last_name: '', email: '', mobile: '' });
      setVerificationCode(['', '', '', '', '', '']);
      setError('');
      setResendTimer(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            {step === 'form' ? 'Create your free account' : 'Enter the 6-digit code'}
          </DialogTitle>
          {step === 'form' && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Once submitted a verification code will be sent to your email
            </p>
          )}
          {step === 'verify' && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              We've emailed a one-time code to {formData.email}
            </p>
          )}
        </DialogHeader>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="first_name" className="text-sm font-medium">
                  First name *
                </Label>
                <Input
                  id="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="mt-1"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="last_name" className="text-sm font-medium">
                  Last name *
                </Label>
                <Input
                  id="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="mt-1"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="mobile" className="text-sm font-medium">
                  Mobile *
                </Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="04XX XXX XXX"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="mt-1"
                  disabled={loading}
                />
              </div>
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
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send verification code
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By continuing you agree to our{' '}
                <span className="underline hover:text-foreground cursor-pointer" onClick={() => { setOpen(false); navigate('/terms'); }}>Terms of Service</span>
                {' '}&{' '}
                <span className="underline hover:text-foreground cursor-pointer" onClick={() => { setOpen(false); navigate('/privacy'); }}>Privacy Policy</span>
              </p>

              <div className="text-center">
                <span className="text-sm text-muted-foreground">
                  I already have an account →{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setSignInOpen(true);
                    }}
                    className="font-bold text-[#856A4C] hover:text-[#967A59]"
                  >
                    Sign In
                  </button>
                </span>
              </div>
            </div>
          </form>
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
      
      <SignInModal 
        open={signInOpen} 
        onOpenChange={setSignInOpen}
        onBackToSignUp={() => {
          setSignInOpen(false);
          setOpen(true);
        }}
      />
    </Dialog>
  );
};