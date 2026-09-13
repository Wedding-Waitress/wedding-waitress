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
import { MarketingPreferences } from './MarketingPreferences';
import { AccountInfoDetails } from './AccountInfoDetails';

interface Props {
  icon: LucideIcon;
  loginEmail?: string;
}

export const AccountInfoCard: React.FC<Props> = ({ icon, loginEmail = '' }) => {
  const { profile } = useProfile();
  const { role } = useAccountRole();
  const [open, setOpen] = useState(false);
  const [authDetails, setAuthDetails] = useState<{ verified: boolean; createdAt: string | null; email: string | null; pendingEmail: string | null } | null>(null);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const loadAuthDetails = () => {
      setAuthError(false);
      void supabase.auth.getUser().then(({ data, error }) => {
        if (error || !data.user) {
          setAuthError(true);
          return;
        }
        const pendingEmail = (data.user as typeof data.user & { new_email?: string | null }).new_email || null;
        setAuthDetails({ verified: !!data.user.email_confirmed_at, createdAt: data.user.created_at || null, email: data.user.email || null, pendingEmail });
      }).catch(() => setAuthError(true));
    };
    loadAuthDetails();
    window.addEventListener('account-auth-updated', loadAuthDetails);
    return () => window.removeEventListener('account-auth-updated', loadAuthDetails);
  }, []);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '—';

  return (
    <SectionCard icon={icon} title="Account Info" description="Your personal details">
      <ProfileImageEditor />
      <AccountInfoDetails accountId={profile?.account_id||'—'} fullName={fullName}
        email={authDetails?.email||loginEmail||profile?.email||'—'} pendingEmail={authDetails?.pendingEmail}
        mobile={profile?.mobile||'—'} role={role==='master'?'Account Holder':role==='standard'?'Team Member':'Unavailable'}
        verification={authDetails?(authDetails.verified?'Verified':'Not verified'):authError?'Unavailable':'Loading…'}
        createdAt={authDetails?.createdAt}/>
      <div className="mt-8">
        <Button
          onClick={() => setOpen(true)}
          className={controlStyles.secondaryButton}
          size="sm"
        >
          Edit Details
        </Button>
      </div>
      <EditDetailsModal open={open} onOpenChange={setOpen} initialEmail={authDetails?.email || loginEmail || profile?.email || ''} />
      <MarketingPreferences />
    </SectionCard>
  );
};
