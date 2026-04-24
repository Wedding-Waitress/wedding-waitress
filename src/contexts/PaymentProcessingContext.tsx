import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface PaymentProcessingContextValue {
  processing: boolean;
  startProcessing: () => void;
  stopProcessing: () => void;
}

const STORAGE_KEY = 'ww_payment_processing';

const PaymentProcessingContext = createContext<PaymentProcessingContextValue | null>(null);

export const PaymentProcessingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from sessionStorage so the overlay survives the Stripe redirect
  // to /payment-success without remounting or flickering.
  const [processing, setProcessing] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (processing) sessionStorage.setItem(STORAGE_KEY, '1');
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* no-op */
    }
  }, [processing]);

  const startProcessing = useCallback(() => {
    setProcessing((prev) => (prev ? prev : true));
  }, []);

  const stopProcessing = useCallback(() => {
    setProcessing(false);
  }, []);

  return (
    <PaymentProcessingContext.Provider value={{ processing, startProcessing, stopProcessing }}>
      {children}
    </PaymentProcessingContext.Provider>
  );
};

export const usePaymentProcessing = (): PaymentProcessingContextValue => {
  const ctx = useContext(PaymentProcessingContext);
  if (!ctx) throw new Error('usePaymentProcessing must be used within PaymentProcessingProvider');
  return ctx;
};
