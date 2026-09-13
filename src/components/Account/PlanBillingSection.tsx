import React from 'react';
import { CreditCard, History, Receipt } from 'lucide-react';
import { SubscriptionCard } from './SubscriptionCard';
import { BillingCard } from './BillingCard';
import { HistoryCard } from './HistoryCard';
import styles from './PlanBillingSection.module.css';
import { MasterOnly } from '@/components/permissions/MasterOnly';

export const PlanBillingSection: React.FC = () => (
  <div className={styles.layout} data-plan-billing>
    <SubscriptionCard icon={CreditCard} />
    <MasterOnly fallback="hide"><BillingCard icon={Receipt} /></MasterOnly>
    <MasterOnly fallback="hide"><HistoryCard icon={History} /></MasterOnly>
  </div>
);
