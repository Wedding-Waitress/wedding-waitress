import React, { useEffect } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import type { CurrencyCode } from '@/lib/currencyPricing';

const choices: Array<{ code: CurrencyCode; symbol: string }> = [
  { code: 'AUD', symbol: 'A$' },
  { code: 'USD', symbol: 'US$' },
  { code: 'GBP', symbol: '£' },
  { code: 'EUR', symbol: '€' },
];

interface Props {
  currency: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  loading: boolean;
  error: string | null;
}

export const PricingCurrencyPanel: React.FC<Props> = ({ currency, onChange, loading, error }) => {
  useEffect(() => { if (error && currency !== 'AUD') onChange('AUD'); }, [currency, error, onChange]);

  const handleArrowNavigation = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (index + direction + choices.length) % choices.length;
    const nextChoice = choices[nextIndex];
    if (nextChoice.code !== 'AUD' && (loading || error)) return;
    onChange(nextChoice.code);
    document.querySelector<HTMLButtonElement>(`[data-currency-option="${nextChoice.code}"]`)?.focus();
  };

  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-[24px] border border-[#412419] bg-[linear-gradient(180deg,#fffaf1_0%,#fff_42%,#f9f1e6_100%)] px-4 py-5 text-center shadow-[0_12px_32px_rgba(43,23,17,.12),inset_0_1px_0_rgba(255,255,255,.9)] sm:px-6" aria-labelledby="pricing-currency-title">
      <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#8c6844]">Select your currency</p>
      <h3 id="pricing-currency-title" className="mt-1 text-lg font-semibold text-[#412419]">View prices in your preferred currency</h3>
      <p className="mt-1 text-[13px] leading-[18px] text-[#6f625b]">Prices update automatically using current exchange rates.</p>
      <div role="radiogroup" aria-label="Pricing currency" className="mx-auto mt-4 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
        {choices.map(({ code, symbol }, index) => {
          const selected = code === currency;
          const disabled = code !== 'AUD' && (loading || Boolean(error));
          return <button key={code} data-currency-option={code} type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={() => onChange(code)} onKeyDown={(event) => handleArrowNavigation(event, index)} className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold transition-[box-shadow,background-color,color,border-color] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#412419] ${selected ? 'ww-button-espresso border-[#d7b985] text-white' : 'border-[#c9aa7a] bg-[#fffdf9] text-[#412419] hover:border-[#70452f] hover:bg-[#f6efe5] hover:shadow-[0_4px_14px_rgba(43,23,17,.12)]'} disabled:cursor-not-allowed disabled:opacity-50`}>
            <span className="inline-flex items-center justify-center gap-1.5">{selected && <Check size={14} aria-hidden="true" />}{code} <span aria-hidden="true">{symbol}</span></span>
          </button>;
        })}
      </div>
      <p className={`mt-3 inline-flex items-center gap-2 text-xs ${error ? 'text-[#8a352d]' : 'text-[#6f625b]'}`} role="status" aria-live="polite">
        <RefreshCw size={13} aria-hidden="true" className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />
        {loading ? 'Loading current exchange rates…' : error || 'Exchange rates updated automatically'}
      </p>
      <p className="mx-auto mt-3 max-w-2xl text-[13px] leading-[18px] text-[#6f625b]">Prices exclude applicable taxes. GST, VAT or other taxes are calculated at checkout based on your location.</p>
    </div>
  );
};
