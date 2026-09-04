import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PricingCurrencyPanel } from './PricingCurrencyPanel';
import { AUD_BASE_PRICES, convertAudPrice, formatLivePrice, formatPublicPricingPrice } from '@/lib/liveCurrencyPricing';

const rates = { AUD: 1, USD: 0.66, GBP: 0.51, EUR: 0.60 } as const;

describe('public pricing currency selection', () => {
  it('converts every plan from the authoritative AUD base and keeps Vendor Pro monthly', () => {
    expect(Object.values(AUD_BASE_PRICES).map((value) => convertAudPrice(value, 'AUD', rates))).toEqual([199, 249, 299, 300]);
    expect(Object.values(AUD_BASE_PRICES).map((value) => convertAudPrice(value, 'USD', rates))).toEqual([131, 164, 197, 198]);
    expect(Object.values(AUD_BASE_PRICES).map((value) => convertAudPrice(value, 'GBP', rates))).toEqual([101, 127, 152, 153]);
    expect(Object.values(AUD_BASE_PRICES).map((value) => convertAudPrice(value, 'EUR', rates))).toEqual([119, 149, 179, 180]);
    expect(formatPublicPricingPrice('AUD', 199)).toBe('AUD $199');
    expect(formatPublicPricingPrice('USD', 131)).toBe('US$131');
    expect(formatPublicPricingPrice('GBP', 101)).toBe('£101');
    expect(formatPublicPricingPrice('EUR', 119)).toBe('€119');
    expect(formatLivePrice('AUD', 300)).toBe('A$300');
    expect(AUD_BASE_PRICES.vendor_pro).toBe(300);
  });

  it('provides a keyboard-operable single-selection group with non-colour status', () => {
    const onChange = vi.fn();
    render(<PricingCurrencyPanel currency="AUD" onChange={onChange} loading={false} error={null} />);
    expect(screen.getByRole('radiogroup', { name: 'Pricing currency' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /AUD/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: /GBP/ }));
    expect(onChange).toHaveBeenCalledWith('GBP');
    fireEvent.keyDown(screen.getByRole('radio', { name: /AUD/ }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('USD');
    expect(screen.getByRole('status')).toHaveTextContent('Exchange rates updated automatically');
    expect(screen.getByText(/Prices exclude applicable taxes/)).toBeInTheDocument();
  });

  it('reserves AUD pricing while loading and reports the required failure fallback', () => {
    const { rerender } = render(<PricingCurrencyPanel currency="AUD" onChange={vi.fn()} loading error={null} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading current exchange rates');
    expect(screen.getByRole('radio', { name: /USD/ })).toBeDisabled();
    rerender(<PricingCurrencyPanel currency="AUD" onChange={vi.fn()} loading={false} error="Live conversion is temporarily unavailable. Prices are shown in AUD." />);
    expect(screen.getByRole('status')).toHaveTextContent('Live conversion is temporarily unavailable. Prices are shown in AUD.');
  });
});
