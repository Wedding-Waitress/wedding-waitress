import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AUD_RATES, type LiveCurrencyRates } from '@/lib/liveCurrencyPricing';

interface RatesState {
  rates: LiveCurrencyRates;
  loading: boolean;
  error: string | null;
  updatedAt: string | null;
}

let cachedState: RatesState | null = null;
let pendingRequest: Promise<RatesState> | null = null;

const loadRates = async (): Promise<RatesState> => {
  if (cachedState && Date.now() - Date.parse(cachedState.updatedAt || '') < 60 * 60 * 1000) return cachedState;
  if (pendingRequest) return pendingRequest;
  pendingRequest = (async () => {
    const { data, error } = await supabase.functions.invoke('get-exchange-rates');
    if (error || !data?.rates) throw new Error(error?.message || 'Exchange rates are unavailable');
    const next = { AUD: 1, USD: Number(data.rates.USD), GBP: Number(data.rates.GBP), EUR: Number(data.rates.EUR) };
    if (Object.values(next).some((rate) => !Number.isFinite(rate) || rate <= 0)) throw new Error('Exchange-rate response was invalid');
    cachedState = { rates: next, loading: false, error: null, updatedAt: String(data.updated_at || new Date().toISOString()) };
    return cachedState;
  })().finally(() => { pendingRequest = null; });
  return pendingRequest;
};

export const useLiveExchangeRates = (): RatesState => {
  const [state, setState] = useState<RatesState>(() => cachedState || { rates: AUD_RATES, loading: true, error: null, updatedAt: null });
  useEffect(() => {
    let active = true;
    loadRates().then((result) => { if (active) setState(result); }).catch(() => {
      if (active) setState({ rates: AUD_RATES, loading: false, error: 'Live conversion is temporarily unavailable. Prices are shown in AUD.', updatedAt: null });
    });
    return () => { active = false; };
  }, []);
  return state;
};

export const __resetLiveRatesForTests = () => { cachedState = null; pendingRequest = null; };
