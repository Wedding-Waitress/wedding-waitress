import { useState, useEffect, useCallback } from 'react';
import { CurrencyCode, detectCurrency } from '@/lib/currencyPricing';

const STORAGE_KEY = 'ww_currency';

export const useCurrency = () => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ['AUD', 'USD', 'GBP', 'EUR'].includes(saved)) {
      return saved as CurrencyCode;
    }
    return detectCurrency();
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
  }, []);

  return { currency, setCurrency };
};
