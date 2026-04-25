import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield } from 'lucide-react';

interface AdminOtpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminOtpModal: React.FC<AdminOtpModalProps> = ({ open, onOpenChange }) => {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (open && !sent && !sending) {
      void sendCode();
    }
    if (!open) {
      setCode('');
      setSent(false);
      setMaskedPhone(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sendCode = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-send-otp');
      if (error || (data as any)?.error) {
        toast({ title: 'Could not send code', description: (data as any)?.error || error?.message || 'Try again', variant: 'destructive' });
        onOpenChange(false);
        return;
      }
      setMaskedPhone((data as any).masked_phone || null);
      setSent(true);
      toast({ title: 'Verification code sent', description: 'Check your phone.' });
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast({ title: 'Invalid code', description: 'Enter the 6-digit code.', variant: 'destructive' });
      return;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-verify-otp', { body: { code } });
      if (error || (data as any)?.error) {
        toast({ title: 'Verification failed', description: (data as any)?.error || error?.message || 'Try again', variant: 'destructive' });
        return;
      }
      // Store short-lived grant in sessionStorage
      const grant = (data as any).grant;
      const sig = (data as any).signature;
      if (grant && sig) {
        sessionStorage.setItem('ww_admin_grant', grant);
        sessionStorage.setItem('ww_admin_grant_sig', sig);
      }
      onOpenChange(false);
      navigate('/admin');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: '#967A59' }} />
            Admin verification
          </DialogTitle>
          <DialogDescription>
            {sending && !sent && 'Sending a verification code to your phone…'}
            {sent && `Enter the 6-digit code sent to ${maskedPhone || 'your phone'}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Input
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={!sent || verifying}
            className="text-center text-2xl tracking-[0.5em] font-mono"
          />

          <div className="flex flex-col gap-2">
            <Button onClick={verify} disabled={!sent || verifying || code.length !== 6} className="w-full">
              {verifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</> : 'Verify'}
            </Button>
            <Button variant="ghost" onClick={sendCode} disabled={sending} className="w-full">
              {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : 'Resend code'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
