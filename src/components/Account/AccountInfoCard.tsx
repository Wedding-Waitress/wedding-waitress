// 🔒 PRODUCTION-LOCKED — Account Info Card (2026-04-18)
import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from './SectionCard';
import { EditDetailsModal } from './EditDetailsModal';
import { useProfile } from '@/hooks/useProfile';

interface Props {
  icon: LucideIcon;
}

export const AccountInfoCard: React.FC<Props> = ({ icon }) => {
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '—';

  return (
    <SectionCard icon={icon} title="Account Info" description="Your personal details">
      <dl className="space-y-3 text-sm">
        <Row label="Name" value={fullName} />
        <Row label="Email" value={profile?.email || '—'} />
        <Row label="Phone" value={profile?.mobile || '—'} />
      </dl>
      <div className="mt-6">
        <Button
          onClick={() => setOpen(true)}
          className="dashboard-btn-primary"
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
