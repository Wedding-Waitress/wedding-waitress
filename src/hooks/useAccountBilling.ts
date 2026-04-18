// 🔒 PRODUCTION-LOCKED — Account billing shared hook (2026-04-18)
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BillingPaymentMethod {
  brand: string;
  last4: string;
}

export interface BillingInvoice {
  amount: number;
  currency: string;
  date: string;
  hostedUrl: string | null;
  pdfUrl: string | null;
}

export interface BillingHistoryRow {
  id: string;
  date: string;
  type: string;
  amount: number;
  currency: string;
  status?: string;
  hostedUrl: string | null;
  pdfUrl: string | null;
}

export interface AccountBillingData {
  paymentMethod: BillingPaymentMethod | null;
  lastInvoice: BillingInvoice | null;
  nextBillingDate: string | null;
  history: BillingHistoryRow[];
  portalUrl: string | null;
}

const empty: AccountBillingData = {
  paymentMethod: null,
  lastInvoice: null,
  nextBillingDate: null,
  history: [],
  portalUrl: null,
};

// Module-level cache to share across cards
let cache: AccountBillingData | null = null;
const subscribers = new Set<(d: AccountBillingData) => void>();

const broadcast = (d: AccountBillingData) => {
  cache = d;
  subscribers.forEach((cb) => cb(d));
};

export const useAccountBilling = () => {
  const [data, setData] = useState<AccountBillingData>(cache ?? empty);
  const [loading, setLoading] = useState<boolean>(!cache);
  const [error, setError] = useState<string | null>(null);

  const fetchBilling = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: invokeErr } = await supabase.functions.invoke('get-account-billing');
      if (invokeErr) throw invokeErr;
      const next: AccountBillingData = {
        paymentMethod: res?.paymentMethod ?? null,
        lastInvoice: res?.lastInvoice ?? null,
        nextBillingDate: res?.nextBillingDate ?? null,
        history: Array.isArray(res?.history) ? res.history : [],
        portalUrl: res?.portalUrl ?? null,
      };
      broadcast(next);
      setData(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load billing';
      console.error('[useAccountBilling]', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cb = (d: AccountBillingData) => setData(d);
    subscribers.add(cb);
    if (!cache) fetchBilling();
    return () => {
      subscribers.delete(cb);
    };
  }, [fetchBilling]);

  return { data, loading, error, refetch: fetchBilling };
};
