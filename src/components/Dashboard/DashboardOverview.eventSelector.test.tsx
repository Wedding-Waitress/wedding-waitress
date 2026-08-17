import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardOverview } from './DashboardOverview';

vi.mock('@/hooks/useFirstEventReferral', () => ({
  useFirstEventReferral: () => ({ referralEvent: null, dismiss: vi.fn() }),
}));

describe('DashboardOverview event selector alignment', () => {
  it('keeps the icon and value in one overflow-safe row without changing trigger height', () => {
    render(
      <DashboardOverview
        selectedEventId={null}
        onEventSelect={vi.fn()}
        events={[{ id: 'event-1', name: 'A very long selected wedding event name' }]}
        guests={[]}
      />,
    );

    const trigger = screen.getByRole('combobox');
    const valueRow = screen.getByTestId('dashboard-event-value');

    expect(trigger).toHaveClass('h-11');
    expect(valueRow).toHaveClass('!flex', 'flex-1', 'min-w-0', 'items-center', 'gap-2', 'overflow-hidden', 'text-left');
    expect(valueRow.className).toContain('[&>span]:truncate');
    expect(valueRow.querySelector('svg')).toHaveClass('shrink-0');
    expect(trigger.lastElementChild?.tagName.toLowerCase()).toBe('svg');
  });
});
