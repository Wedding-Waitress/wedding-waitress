// 🔒 PRODUCTION-LOCKED — Security Card (2026-04-25)
import React, { useEffect, useState } from 'react';
import { LucideIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from './SectionCard';
import { ChangePasswordModal } from './ChangePasswordModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import controlStyles from './AccountControls.module.css';
import { DeleteAccountDialog } from './DeleteAccountDialog';

interface Props {
  icon: LucideIcon;
}

export const SecurityCard: React.FC<Props> = ({ icon }) => {
  const [open, setOpen] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        setEmailVerified(!!user.email_confirmed_at);
      }
    })();
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
    <SectionCard icon={icon} title="Security & Account" description="Password, verification and account controls">
      <div className="space-y-3 text-sm">
        <Row label="Password" value="••••••••••" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2">
          <span className="text-muted-foreground font-medium">Email</span>
          {emailVerified === null ? (
            <span className="text-muted-foreground">—</span>
          ) : emailVerified ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1">
              <CheckCircle2 className="w-3 h-3" /> Verified
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 gap-1">
              <AlertCircle className="w-3 h-3" /> Not Verified
            </Badge>
          )}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
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
      <div className="mt-8 rounded-2xl border border-red-400/50 bg-red-950/35 p-5">
        <span className="text-xs font-bold uppercase tracking-widest text-red-300">Danger Zone</span>
        <h3 className="mt-2 text-lg font-semibold text-white">Delete Account</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100/80">Close your Wedding Waitress account and end access to your current plan. Your eligible account and event information will be retained securely for 12 months in case you change your mind.</p>
        <Button className={`${controlStyles.destructiveButton} mt-4`} onClick={() => setDeleteOpen(true)}>Delete Account</Button>
      </div>
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} email={email} />
    </SectionCard>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-border/50">
    <span className="text-muted-foreground font-medium">{label}</span>
    <span className="text-foreground font-medium tracking-wider">{value}</span>
  </div>
);
