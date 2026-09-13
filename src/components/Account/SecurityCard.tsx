// 🔒 PRODUCTION-LOCKED — Security Card (2026-04-25)
import React, { useEffect, useState } from 'react';
import { LucideIcon, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from './SectionCard';
import { ChangePasswordModal } from './ChangePasswordModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import controlStyles from './AccountControls.module.css';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { MasterOnly } from '@/components/permissions/MasterOnly';

interface Props {
  icon: LucideIcon;
}

export const SecurityCard: React.FC<Props> = ({ icon }) => {
  const [open, setOpen] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>('');
  const [authError, setAuthError] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    void (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setAuthError(true);
      } else {
        setAuthError(false);
        setEmail(user.email || '');
        setEmailVerified(!!user.email_confirmed_at);
      }
    })().catch(() => setAuthError(true));
  }, []);

  const sendVerification = async () => {
    if (!email) return;
    setSending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setSending(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Verification email sent', description: `Check ${email}` });
  };

  return (
    <div className="grid min-w-0 content-start gap-6" data-account-security-stack>
      <SectionCard icon={icon} title="Security & Password" description="Password and email verification">
        <div className="space-y-3 text-sm">
          <Row label="Password" value="••••••••••" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2">
            <span className="text-muted-foreground font-medium">Email</span>
            {emailVerified === null ? (
              <span className="text-muted-foreground">—</span>
            ) : emailVerified ? (
              <Badge className="rounded-[4px] bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 gap-1">
                <AlertCircle className="w-3 h-3" /> Not Verified
              </Badge>
            )}
          </div>
          {authError && <p role="alert" className="text-sm text-red-700">Security status is temporarily unavailable. Refresh the page before making account changes.</p>}
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className={controlStyles.secondaryButton}
          >
            Change Password
          </Button>
          {emailVerified === false && (
            <Button
              size="sm"
              variant="outline"
              className={controlStyles.secondaryButton}
              onClick={sendVerification}
              disabled={sending}
            >
              {sending ? 'Sending…' : 'Send Verification Email'}
            </Button>
          )}
        </div>
        <ChangePasswordModal open={open} onOpenChange={setOpen} />
      </SectionCard>
      <SectionCard icon={Trash2} title="Close Account" description="Account deactivation and reopening controls">
        <div className="rounded-xl border border-red-300 bg-red-50 p-5">
          <span className="text-xs font-bold uppercase tracking-widest text-red-700">Danger Zone</span>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-red-900/80">Deactivate account access while retaining your saved information. Your original entitlement expiry does not change; you can reopen for any remaining paid time without paying again.</p>
          <MasterOnly fallback="hide"><Button className={`${controlStyles.destructiveButton} mt-4`} onClick={() => setDeleteOpen(true)}>Close Account</Button></MasterOnly>
        </div>
      </SectionCard>
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} email={email} />
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-border/50">
    <span className="text-muted-foreground font-medium">{label}</span>
    <span className="text-foreground font-medium tracking-wider">{value}</span>
  </div>
);
