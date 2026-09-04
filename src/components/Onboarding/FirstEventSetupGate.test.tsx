import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ draft: null as null | { id: string }, eventCount: 0, from: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      mocks.from(table);
      const result = table === 'onboarding_drafts'
        ? { data: mocks.draft, error: null }
        : { data: null, error: null, count: mocks.eventCount };
      const builder: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'is', 'limit', 'maybeSingle']) builder[method] = () => builder;
      builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(resolve(result));
      return builder;
    },
  },
}));

vi.mock('@/components/Dashboard/DashboardLoadingScreen', () => ({
  DashboardLoadingScreen: () => <div>Checking setup</div>,
  getDashboardLoadingAppearance: () => ({}),
}));

import { FirstEventSetupGate } from './FirstEventSetupGate';

const renderGate = (entry = '/dashboard') => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route element={<FirstEventSetupGate userId="user-1" />}>
        <Route path="/dashboard" element={<div>Dashboard content</div>} />
        <Route path="/onboarding/event-setup" element={<div>Guided setup content</div>} />
      </Route>
    </Routes>
  </MemoryRouter>,
);

describe('FirstEventSetupGate', () => {
  beforeEach(() => { mocks.draft = null; mocks.eventCount = 0; mocks.from.mockClear(); });

  it('does not force a legacy zero-event customer without an explicit draft', async () => {
    renderGate();
    expect(await screen.findByText('Dashboard content')).toBeInTheDocument();
  });

  it('resumes an incomplete first-event draft when there are no events', async () => {
    mocks.draft = { id: 'draft-1' };
    renderGate();
    expect(await screen.findByText('Guided setup content')).toBeInTheDocument();
  });

  it('does not interrupt an established customer with an event', async () => {
    mocks.draft = { id: 'draft-1' };
    mocks.eventCount = 1;
    renderGate();
    expect(await screen.findByText('Dashboard content')).toBeInTheDocument();
  });

  it('lets the onboarding route render without recursive checks', async () => {
    mocks.draft = { id: 'draft-1' };
    renderGate('/onboarding/event-setup?mode=first');
    expect(await screen.findByText('Guided setup content')).toBeInTheDocument();
    await waitFor(() => expect(mocks.from).not.toHaveBeenCalled());
  });
});
