import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  owner: { loading: false, hasPlatformOwnerAccess: false },
  access: { state: { paid_plan: true, expired: false, recoverable: true }, loading: false },
}));
vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => mocks.owner }));
vi.mock('@/hooks/usePaidAccessState', () => ({ usePaidAccessState: () => mocks.access }));
import { PaidAccessGate } from './PaidAccessGate';

const renderAt = (entry: string) => render(<MemoryRouter initialEntries={[entry]}><Routes>
  <Route path="/dashboard" element={<PaidAccessGate><div>Planning</div></PaidAccessGate>} />
  <Route path="/account/plan-billing" element={<PaidAccessGate><div>Renewal</div></PaidAccessGate>} />
  <Route path="/account/help-support" element={<PaidAccessGate><div>Support</div></PaidAccessGate>} />
</Routes></MemoryRouter>);

describe('PaidAccessGate', () => {
  beforeEach(() => {
    mocks.owner.hasPlatformOwnerAccess = false;
    mocks.access.state = { paid_plan: true, expired: false, recoverable: true };
  });
  it('allows active paid planning access', () => {
    renderAt('/dashboard');
    expect(screen.getByText('Planning')).toBeInTheDocument();
  });
  it('redirects expired paid accounts to the minimal renewal flow', () => {
    mocks.access.state = { paid_plan: true, expired: true, recoverable: true };
    renderAt('/dashboard');
    expect(screen.getByText('Renewal')).toBeInTheDocument();
  });
  it('keeps renewal and support available while expired', () => {
    mocks.access.state = { paid_plan: true, expired: true, recoverable: true };
    renderAt('/account/help-support');
    expect(screen.getByText('Support')).toBeInTheDocument();
  });
  it('preserves the platform owner bypass', () => {
    mocks.owner.hasPlatformOwnerAccess = true;
    mocks.access.state = { paid_plan: true, expired: true, recoverable: false };
    renderAt('/dashboard');
    expect(screen.getByText('Planning')).toBeInTheDocument();
  });
});
