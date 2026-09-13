import React from 'react';
import { render, screen } from '@testing-library/react';
import { User } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { SectionCard } from './SectionCard';

describe('SectionCard', () => {
  it('uses the dashboard-sidebar gold treatment for account heading icons', () => {
    const { container } = render(<SectionCard icon={User} title="Account Info">Details</SectionCard>);
    expect(screen.getByRole('heading', { name: 'Account Info' })).toBeInTheDocument();
    const icon = container.querySelector('[data-account-section-icon]');
    expect(icon).toHaveClass('text-[#806344]');
    expect(icon).toHaveClass('bg-[#EDE0D0]');
    expect(icon?.querySelector('svg')).toBeInTheDocument();
  });
});
