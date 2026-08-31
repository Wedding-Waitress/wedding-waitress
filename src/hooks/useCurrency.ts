import { useState, useEffect, useCallback } from 'react';
import { CurrencyCode } from '@/lib/currencyPricing';

const STORAGE_KEY = 'ww_currency';

export const useCurrency = () => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved && ['AUD', 'USD', 'GBP', 'EUR'].includes(saved)) {
      return saved as CurrencyCode;
    }
    return 'AUD';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
  }, []);

  return { currency, setCurrency };
};
