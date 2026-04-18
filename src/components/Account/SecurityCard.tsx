// 🔒 PRODUCTION-LOCKED — Security Card (2026-04-18)
import React, { useEffect, useState } from 'react';
import { LucideIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from './SectionCard';
import { ChangePasswordModal } from './ChangePasswordModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  icon: LucideIcon;
}

export const SecurityCard: React.FC<Props> = ({ icon }) => {
  const [open, setOpen] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>('');
  const [sending, setSending] = useState(false);
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
    <SectionCard icon={icon} title="Security" description="Password and verification">
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
          className="bg-[#967A59] hover:bg-[#7d6649] text-white rounded-full"
        >
          Change Password
        </Button>
        {emailVerified === false && (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={sendVerification}
            disabled={sending}
          >
            {sending ? 'Sending…' : 'Send Verification Email'}
          </Button>
        )}
      </div>
      <ChangePasswordModal open={open} onOpenChange={setOpen} />
    </SectionCard>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-border/50">
    <span className="text-muted-foreground font-medium">{label}</span>
    <span className="text-foreground font-medium tracking-wider">{value}</span>
  </div>
);
