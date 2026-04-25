// 🔒 PRODUCTION-LOCKED — Account page (2026-04-25)
// Accessible via profile dropdown in DashboardHeader. Do NOT modify without explicit owner approval.
import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, CreditCard, Receipt, BarChart3, History, Lock } from 'lucide-react';
import { AccountInfoCard } from '@/components/Account/AccountInfoCard';
import { SubscriptionCard } from '@/components/Account/SubscriptionCard';
import { BillingCard } from '@/components/Account/BillingCard';
import { UsageCard } from '@/components/Account/UsageCard';
import { HistoryCard } from '@/components/Account/HistoryCard';
import { SecurityCard } from '@/components/Account/SecurityCard';
import { useAccountBilling } from '@/hooks/useAccountBilling';
import { useToast } from '@/hooks/use-toast';

export const Account: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { refetch } = useAccountBilling();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: 'Plan upgraded',
        description: 'Your plan has been upgraded successfully.',
      });
      refetch();
      const next = new URLSearchParams(searchParams);
      next.delete('success');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto px-1 sm:px-2 pb-12 bg-[radial-gradient(circle_at_30%_0%,rgba(201,168,122,0.10),transparent_55%),radial-gradient(circle_at_85%_100%,rgba(150,122,89,0.08),transparent_50%),linear-gradient(180deg,#FBF7F0_0%,#F5EFE4_100%)]">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-[#967A59] via-[#B8946A] to-[#7d6649] bg-clip-text text-transparent">
          My Account
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Manage your account, subscription, and billing
        </p>
      </header>

      <div className="space-y-5 sm:space-y-6">
        <AccountInfoCard icon={User} />
        <SubscriptionCard icon={CreditCard} />
        <BillingCard icon={Receipt} />
        <UsageCard icon={BarChart3} />
        <HistoryCard icon={History} />
        <SecurityCard icon={Lock} />
      </div>
    </div>
  );
};

export default Account;
