import React from 'react';
import { CreditCard, History, Receipt } from 'lucide-react';
import { SubscriptionCard } from './SubscriptionCard';
import { BillingCard } from './BillingCard';
import { HistoryCard } from './HistoryCard';
import styles from './PlanBillingSection.module.css';

export const PlanBillingSection: React.FC = () => (
  <div className={styles.layout} data-plan-billing>
    <SubscriptionCard icon={CreditCard} />
    <BillingCard icon={Receipt} />
    <HistoryCard icon={History} />
  </div>
);
