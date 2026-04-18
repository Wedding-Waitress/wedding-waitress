// 🔒 PRODUCTION-LOCKED — History Card (2026-04-18)
import React from 'react';
import { LucideIcon, ExternalLink } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { useAccountBilling } from '@/hooks/useAccountBilling';

interface Props {
  icon: LucideIcon;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
const formatMoney = (a: number, c: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c.toUpperCase() }).format(a);
  } catch {
    return `$${a.toFixed(2)}`;
  }
};

export const HistoryCard: React.FC<Props> = ({ icon }) => {
  const { data, loading } = useAccountBilling();
  const history = data.history;

  return (
    <SectionCard icon={icon} title="History" description="Past payments and changes">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading history…</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No transactions yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border/60">
                <th className="py-2 px-2 font-medium">Date</th>
                <th className="py-2 px-2 font-medium">Type</th>
                <th className="py-2 px-2 font-medium text-right">Amount</th>
                <th className="py-2 px-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} className="border-b border-border/30 last:border-0">
                  <td className="py-3 px-2 text-foreground">{formatDate(row.date)}</td>
                  <td className="py-3 px-2 text-foreground">{row.type}</td>
                  <td className="py-3 px-2 text-foreground text-right font-medium">
                    {formatMoney(row.amount, row.currency)}
                  </td>
                  <td className="py-3 px-2 text-right">
                    {row.hostedUrl && (
                      <a
                        href={row.hostedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-[#967A59] hover:underline text-xs"
                      >
                        View <ExternalLink className="ml-1 w-3 h-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
};
