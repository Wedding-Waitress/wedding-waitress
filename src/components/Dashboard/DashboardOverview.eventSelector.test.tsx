import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardOverview } from './DashboardOverview';

Element.prototype.scrollIntoView = vi.fn();

vi.mock('@/hooks/useFirstEventReferral', () => ({
  useFirstEventReferral: () => ({ referralEvent: null, dismiss: vi.fn() }),
}));

vi.mock('@/hooks/useDashboardOverview', () => ({
  useDashboardOverview: () => ({ data: null, loading: false, secondaryLoading: false, error: null }),
}));

vi.mock('./EventBudgetPlanner/EventBudgetPlanner', () => ({
  EventBudgetPlanner: () => null,
}));

describe('DashboardOverview event selector alignment', () => {
  it('keeps the icon and value in one overflow-safe row without changing trigger height', () => {
    render(
      <DashboardOverview
        onNavigateToTab={vi.fn()}
        selectedEventId="event-1"
        onEventSelect={vi.fn()}
        events={[{ id: 'event-1', name: 'A very long selected wedding event name' }]}
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

  it('exposes the global event as its accessible selected value', () => {
    const eventName = 'Jason & Linda\'s Wedding';

    render(
      <DashboardOverview
        onNavigateToTab={vi.fn()}
        selectedEventId="event-1"
        onEventSelect={vi.fn()}
        events={[{ id: 'event-1', name: eventName }]}
      />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Choose Event' });
    const valueRow = screen.getByTestId('dashboard-event-value');

    expect(trigger).toHaveAccessibleName('Choose Event');
    expect(valueRow).toHaveTextContent(eventName);
    expect(trigger).toHaveTextContent(eventName);
  });

  it('writes a new Dashboard choice through the shared event setter', async () => {
    const onEventSelect = vi.fn();
    render(
      <DashboardOverview
        onNavigateToTab={vi.fn()}
        selectedEventId="event-1"
        onEventSelect={onEventSelect}
        events={[{ id: 'event-1', name: 'First Event' }, { id: 'event-2', name: 'Second Event' }]}
      />,
    );

    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Choose Event' }), { key: 'ArrowDown' });
    fireEvent.click(await screen.findByRole('option', { name: 'Second Event' }));
    expect(onEventSelect).toHaveBeenCalledWith('event-2');
  });
});
