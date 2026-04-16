import React, { createContext, useContext } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { CurrencyCode } from '@/lib/currencyPricing';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'AUD',
  setCurrency: () => {},
});

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currency, setCurrency } = useCurrency();
  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrencyContext = () => useContext(CurrencyContext);
