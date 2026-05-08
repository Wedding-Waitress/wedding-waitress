/**
 * Compact currency selector pill — restyled 2026-05-08 (approved).
 * Format: "AUD A$" (code + symbol). Lives across header / pricing surfaces.
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
        <Button
          variant="ghost"
          size="sm"
          className={`min-h-[40px] px-3 rounded-full border border-gray-200 bg-white/80 hover:bg-white text-gray-800 font-medium gap-1.5 ${className}`}
        >
          <span className="text-[13px] tracking-wide font-semibold">{current.label}</span>
          <span className="text-[13px] text-gray-500">{current.symbol}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-white border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.10)] rounded-2xl p-1.5 z-50 min-w-[160px]"
      >
        {currencyList.map((code) => {
          const cfg = CURRENCIES[code];
          const active = currency === code;
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => onCurrencyChange(code)}
              className={`cursor-pointer rounded-xl px-3 py-2 text-sm flex items-center justify-between ${
                active ? 'bg-[#FBF7F1] text-[#1D1D1F] font-semibold' : 'text-gray-700'
              }`}
            >
              <span className="font-semibold tracking-wide">{cfg.label}</span>
              <span className="text-gray-500">{cfg.symbol}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

