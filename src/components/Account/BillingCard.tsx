// 🔒 PRODUCTION-LOCKED — Billing Card (2026-04-18)
import React from 'react';
import { LucideIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from './SectionCard';
import { useAccountBilling } from '@/hooks/useAccountBilling';

interface Props {
  icon: LucideIcon;
}

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

export const BillingCard: React.FC<Props> = ({ icon }) => {
  const { data, loading } = useAccountBilling();
  const pm = data.paymentMethod;
  const last = data.lastInvoice;

  return (
    <SectionCard icon={icon} title="Billing" description="Payment method and recent invoice">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading billing details…</p>
      ) : (
        <>
          <div className="space-y-3 text-sm">
            <Row
              label="Payment method"
              value={pm ? `${pm.brand.toUpperCase()} •••• ${pm.last4}` : 'No payment method on file'}
            />
            <Row
              label="Last payment"
              value={last ? `${formatMoney(last.amount, last.currency)} on ${formatDate(last.date)}` : '—'}
            />
            <Row label="Next billing date" value={formatDate(data.nextBillingDate)} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={!last?.pdfUrl && !last?.hostedUrl}
              onClick={() => {
                const url = last?.pdfUrl || last?.hostedUrl;
                if (url) window.open(url, '_blank', 'noopener');
              }}
            >
              Download Invoice
              <ExternalLink className="ml-1 w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              className="bg-[#967A59] hover:bg-[#7d6649] text-white rounded-full"
              disabled={!data.portalUrl}
              onClick={() => data.portalUrl && window.open(data.portalUrl, '_blank', 'noopener')}
            >
              Update Payment Method
              <ExternalLink className="ml-1 w-3.5 h-3.5" />
            </Button>
          </div>
        </>
      )}
    </SectionCard>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-border/50 last:border-0">
    <span className="text-muted-foreground font-medium">{label}</span>
    <span className="text-foreground font-medium break-all">{value}</span>
  </div>
);
