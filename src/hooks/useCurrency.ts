import { useEffect, useCallback } from 'react';
import { CurrencyCode } from '@/lib/currencyPricing';

const STORAGE_KEY = 'ww_currency';

export const useCurrency = () => {
  const currency: CurrencyCode = 'AUD';

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const setCurrency = useCallback((_code: CurrencyCode) => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, 'AUD');
  }, []);

  return { currency, setCurrency };
};
