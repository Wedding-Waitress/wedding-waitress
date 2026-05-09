import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CreditTransaction {
  id: string;
  amount: number;
  kind: string;
  description: string | null;
  created_at: string;
}

export const useCredits = (open: boolean) => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [balRes, txRes] = await Promise.all([
        supabase.rpc('get_my_credits_balance' as any),
        supabase.rpc('get_my_credit_transactions' as any, { p_limit: 5 }),
      ]);
      if (!balRes.error && balRes.data != null) setBalance(Number(balRes.data) || 0);
      if (!txRes.error && Array.isArray(txRes.data)) {
        setTransactions(txRes.data as CreditTransaction[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  return { balance, transactions, loading, refresh };
};
