import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PricingSection } from './PricingSection';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/contexts/CurrencyContext', () => ({ useCurrencyContext: () => ({ currency: 'AUD' }) }));
vi.mock('./PublicPricingSection', () => ({ PublicPricingSection: () => <div>Public package cards</div> }));

describe('authenticated package media allowances', () => {
  it('shows identical, storage-qualified media allowances for all three packages', () => {
    render(<PricingSection onPlanSelect={vi.fn()} />);
    expect(screen.getAllByText('Up to 5,000 images, including photo booth images')).toHaveLength(3);
    expect(screen.getAllByText('Up to 100 videos; each ordinary video up to 5 minutes and 600 MB')).toHaveLength(3);
    expect(screen.getAllByText('10 GB shared media storage per event; storage may fill before these counts')).toHaveLength(3);
    expect(screen.getByText('150 Email & SMS credits included')).toBeInTheDocument();
    expect(screen.getByText('250 Email & SMS credits included')).toBeInTheDocument();
    expect(screen.getByText('450 Email & SMS credits included')).toBeInTheDocument();
  });
  it('preserves the public-card rendering path', () => {
    render(<PricingSection />);
    expect(screen.getByText('Public package cards')).toBeInTheDocument();
  });
});
