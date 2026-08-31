import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PricingCurrencyPanel } from './PricingCurrencyPanel';
import { AUD_BASE_PRICES, convertAudPrice, formatLivePrice } from '@/lib/liveCurrencyPricing';

const rates = { AUD: 1, USD: 0.66, GBP: 0.51, EUR: 0.60 } as const;

describe('public pricing currency selection', () => {
  it('converts every plan from the authoritative AUD base and keeps Vendor Pro monthly', () => {
    expect(Object.values(AUD_BASE_PRICES).map((value) => convertAudPrice(value, 'AUD', rates))).toEqual([99, 149, 249, 299]);
    expect(Object.values(AUD_BASE_PRICES).map((value) => convertAudPrice(value, 'USD', rates))).toEqual([65, 98, 164, 197]);
    expect(Object.values(AUD_BASE_PRICES).map((value) => convertAudPrice(value, 'GBP', rates))).toEqual([50, 76, 127, 152]);
    expect(Object.values(AUD_BASE_PRICES).map((value) => convertAudPrice(value, 'EUR', rates))).toEqual([59, 89, 149, 179]);
    expect(formatLivePrice('AUD', 99)).toMatch(/A\$99/);
    expect(formatLivePrice('USD', 65)).toMatch(/US\$65/);
    expect(formatLivePrice('GBP', 50)).toMatch(/£50/);
    expect(formatLivePrice('EUR', 59)).toMatch(/€59/);
    expect(AUD_BASE_PRICES.vendor_pro).toBe(299);
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
