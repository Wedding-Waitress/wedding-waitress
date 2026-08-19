// 🔒 PRODUCTION-LOCKED — Account Info Card (2026-04-25)
import React, { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from './SectionCard';
import { EditDetailsModal } from './EditDetailsModal';
import { useProfile } from '@/hooks/useProfile';
import { ProfileImageEditor } from './ProfileImageEditor';
import controlStyles from './AccountControls.module.css';
import { useAccountRole } from '@/hooks/useAccountRole';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  icon: LucideIcon;
}

export const AccountInfoCard: React.FC<Props> = ({ icon }) => {
  const { profile } = useProfile();
  const { isMaster } = useAccountRole();
  const [open, setOpen] = useState(false);
  const [authDetails, setAuthDetails] = useState<{ verified: boolean; createdAt: string | null } | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) setAuthDetails({ verified: !!data.user.email_confirmed_at, createdAt: data.user.created_at || null });
    });
  }, []);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '—';

  return (
    <SectionCard icon={icon} title="Account Info" description="Your personal details">
      <ProfileImageEditor />
      <dl className="space-y-3 text-sm">
        <Row label="Account ID" value={profile?.account_id || '—'} />
        <Row label="Name" value={fullName} />
        <Row label="Email" value={profile?.email || '—'} />
        <Row label="Phone" value={profile?.mobile || '—'} />
        <Row label="Account role" value={isMaster ? 'Account Holder' : 'Team Member'} />
        <Row label="Email verification" value={authDetails?.verified ? 'Verified' : 'Not verified'} />
        {authDetails?.createdAt && <Row label="Member since" value={new Date(authDetails.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })} />}
      </dl>
      <div className="mt-6">
        <Button
          onClick={() => setOpen(true)}
          className={controlStyles.secondaryButton}
          size="sm"
        >
          Edit Details
        </Button>
      </div>
      <EditDetailsModal open={open} onOpenChange={setOpen} />
    </SectionCard>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-border/50 last:border-0">
    <dt className="text-muted-foreground font-medium">{label}</dt>
    <dd className="text-foreground font-medium break-all">{value}</dd>
  </div>
);
