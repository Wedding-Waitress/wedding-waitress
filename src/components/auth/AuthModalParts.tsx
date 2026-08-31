import React, { useId, useRef } from 'react';
import { CheckCircle2, KeyRound, LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import styles from './AuthModal.module.css';

export { styles as authModalStyles };

export const AuthModalHeader = ({
  icon: Icon,
  title,
  description,
  signUpReassurance = false,
  securityReassurance,
  selectedPlan,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  signUpReassurance?: boolean;
  securityReassurance?: string;
  selectedPlan?: string;
}) => (
  <DialogHeader className={styles.header}>
    <DialogTitle className={styles.title}>
      <span className={styles.titleRow}>
        <Icon className={styles.titleIcon} aria-hidden />
        {title}
      </span>
    </DialogTitle>
    {signUpReassurance && (
      <div>
        <span className={styles.reassurance}>
          <CheckCircle2 size={16} aria-hidden />
          No credit card required
        </span>
        <p className={styles.trial}>7-day free trial · Up to 20 guests</p>
      </div>
    )}
    {securityReassurance && (
      <div>
        <span className={styles.reassurance}>
          <KeyRound size={16} aria-hidden />
          {securityReassurance}
        </span>
      </div>
    )}
    <DialogDescription className={styles.description}>{description}</DialogDescription>
    {selectedPlan && <p className={styles.plan}>Selected plan: {selectedPlan}</p>}
  </DialogHeader>
);

export const AuthError = ({ message }: { message: string }) => {
  if (!message) return null;
  return (
    <div className={styles.error} role="alert" aria-live="assertive">
      <TriangleAlert aria-hidden />
      <span>{message}</span>
    </div>
  );
};

export const AuthLegal = ({ onNavigate }: { onNavigate: (path: string) => void }) => (
  <p className={styles.legal}>
    By continuing, you agree to our{' '}
    <button type="button" className={styles.linkButton} onClick={() => onNavigate('/terms')}>Terms of Service</button>
    {' '}and{' '}
    <button type="button" className={styles.linkButton} onClick={() => onNavigate('/privacy')}>Privacy Policy</button>.
  </p>
);

export const VerificationCodeForm = ({
  email,
  code,
  setCode,
  loading,
  error,
  resendTimer,
  onVerify,
  onResend,
  onCorrectEmail,
}: {
  email: string;
  code: string[];
  setCode: React.Dispatch<React.SetStateAction<string[]>>;
  loading: boolean;
  error: string;
  resendTimer: number;
  onVerify: () => void;
  onResend: () => void;
  onCorrectEmail: () => void;
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const groupId = useId();

  const updateCode = (index: number, rawValue: string) => {
    const digits = rawValue.replace(/\D/g, '').slice(0, 6);
    if (digits.length > 1) {
      setCode((current) => {
        const next = [...current];
        digits.split('').forEach((digit, offset) => {
          if (index + offset < 6) next[index + offset] = digit;
        });
        return next;
      });
      inputRefs.current[Math.min(index + digits.length, 5)]?.focus();
      return;
    }

    setCode((current) => {
      const next = [...current];
      next[index] = digits;
      return next;
    });
    if (digits && index < 5) inputRefs.current[index + 1]?.focus();
  };

  return (
    <div className={styles.body}>
      <div className={styles.codeGrid} role="group" aria-label={`Six-digit verification code sent to ${email}`} id={groupId}>
        {code.map((digit, index) => (
          <Input
            key={index}
            ref={(element) => { inputRefs.current[index] = element; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={6}
            aria-label={`Verification code digit ${index + 1}`}
            aria-invalid={Boolean(error)}
            className={styles.codeInput}
            value={digit}
            onChange={(event) => updateCode(index, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
              if (event.key === 'Enter' && code.join('').length === 6 && !loading) onVerify();
            }}
            disabled={loading}
          />
        ))}
      </div>
      <AuthError message={error} />
      <button type="button" className={styles.primaryButton} onClick={onVerify} disabled={loading || code.join('').length !== 6}>
        {loading ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <KeyRound size={18} aria-hidden />}
        {loading ? 'Verifying…' : 'Verify Code'}
      </button>
      <div className={styles.otpActions}>
        <button type="button" className={styles.linkButton} onClick={onResend} disabled={resendTimer > 0 || loading}>
          <RotateCcw size={15} aria-hidden />{' '}
          {resendTimer > 0 ? `Resend available in ${resendTimer}s` : 'Resend code'}
        </button>
        <button type="button" className={styles.linkButton} onClick={onCorrectEmail} disabled={loading}>Correct email</button>
      </div>
      <p className={styles.status} aria-live="polite">
        {loading ? 'Checking your code…' : `Code sent to ${email}`}
      </p>
    </div>
  );
};
