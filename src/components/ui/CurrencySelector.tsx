/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CURRENCIES, CurrencyCode } from '@/lib/currencyPricing';

const currencyList: CurrencyCode[] = ['AUD', 'USD', 'GBP', 'EUR'];

interface CurrencySelectorProps {
  currency: CurrencyCode;
  onCurrencyChange: (code: CurrencyCode) => void;
  className?: string;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  currency,
  onCurrencyChange,
  className = '',
}) => {
  const current = CURRENCIES[currency];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`hover:bg-gray-50 min-h-[44px] min-w-[44px] text-gray-700 ${className}`}>
          <span className="text-[14px]">{current.flag}</span>
          <span className="text-[14px] ml-1">{current.symbol}</span>
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.10)] rounded-2xl p-2 z-50">
        {currencyList.map((code) => {
          const cfg = CURRENCIES[code];
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => onCurrencyChange(code)}
              className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm ${
                currency === code ? 'bg-yellow-50 font-medium' : ''
              }`}
            >
              <span className="mr-2">{cfg.flag}</span>
              <span>{cfg.symbol} {cfg.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
