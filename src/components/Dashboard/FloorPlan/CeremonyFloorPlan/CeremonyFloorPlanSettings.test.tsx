import fs from 'node:fs';
import path from 'node:path';
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { CeremonyFloorPlan } from '@/hooks/useCeremonyFloorPlan';
import type { Event } from '@/hooks/useEvents';
import { CeremonyFloorPlanA4 } from './CeremonyFloorPlanA4';
import { CeremonyFloorPlanSettings } from './CeremonyFloorPlanSettings';

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
});

const makePlan = (overrides: Partial<CeremonyFloorPlan> = {}): CeremonyFloorPlan => ({
  id: 'plan-1', event_id: 'event-1', user_id: 'user-1', chairs_per_row: 6, total_rows: 12, assigned_rows: 12,
  left_side_label: "Groom's Family", right_side_label: "Bride's Family", altar_label: 'Altar', seat_assignments: [],
  show_row_numbers: true, show_seat_numbers: false, bridal_party_left: [], bridal_party_right: [],
  bridal_party_count_left: 10, bridal_party_count_right: 10, bridal_party_roles_left: [], bridal_party_roles_right: [],
  couple_side_arrangement: 'groom_left', person_left_name: 'Nader', person_right_name: 'Nahla',
  created_at: '2026-08-19T00:00:00Z', updated_at: '2026-08-19T00:00:00Z', ...overrides,
});

const getTotalAttending = (plan: CeremonyFloorPlan) =>
  3 + plan.bridal_party_count_left + plan.bridal_party_count_right + (plan.total_rows * plan.chairs_per_row * 2);

const StatefulSettings = ({ onUpdate = vi.fn(), initialPlan = makePlan() }: { onUpdate?: ReturnType<typeof vi.fn>; initialPlan?: CeremonyFloorPlan }) => {
  const [plan, setPlan] = useState(initialPlan);
  return <CeremonyFloorPlanSettings floorPlan={plan} totalAttending={getTotalAttending(plan)} onUpdate={async updates => {
    onUpdate(updates);
    setPlan(current => ({ ...current, ...updates }));
    return true;
  }} />;
};

const event = { id: 'event-1', name: 'Test Wedding', date: '2026-12-20' } as Event;

const SettingsWithA4 = () => {
  const [plan, setPlan] = useState(makePlan());
  return <>
    <CeremonyFloorPlanSettings floorPlan={plan} totalAttending={getTotalAttending(plan)} onUpdate={async updates => { setPlan(current => ({ ...current, ...updates })); return true; }} />
    <CeremonyFloorPlanA4 floorPlan={plan} event={event} generatedAt={new Date('2026-08-19T00:00:00Z')} />
  </>;
};

describe('Ceremony Floor Plan settings layout', () => {
  it('shows six accessible selectors, current summaries, and Couple Arrangement by default', () => {
    render(<StatefulSettings />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    expect(tabs.map(tab => tab.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining('Couple Arrangement'), expect.stringContaining('Couple Names'),
      expect.stringContaining('Bridal Party'), expect.stringContaining('Family Labels'),
      expect.stringContaining('Display Options'), expect.stringContaining('Rows & Capacity'),
    ]));
    expect(screen.getByRole('tab', { name: /Couple Arrangement/ })).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAccessibleName(/Couple Arrangement/);
    expect(within(panel).queryByText('Couple Arrangement')).not.toBeInTheDocument();
    expect(screen.getByText('Groom left · Bride right')).toBeInTheDocument();
    expect(screen.getByText('Nader · Nahla')).toBeInTheDocument();
    expect(screen.getByText('10 groomsmen · 10 bridesmaids')).toBeInTheDocument();
    expect(screen.getByText("Groom's Family · Bride's Family")).toBeInTheDocument();
    expect(screen.getByText('Rows shown · Seats hidden')).toBeInTheDocument();
    expect(screen.getByText('12 rows · 6 chairs each side · 12 family rows')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Total Attending: 167 (Bride & Groom + Celebrant + Bridal Party + Family & Friends)');
  });

  it('opens only one detail panel, supports arrow-key selection, and retains edited values', () => {
    const onUpdate = vi.fn();
    render(<StatefulSettings onUpdate={onUpdate} />);
    const namesTab = screen.getByRole('tab', { name: /Couple Names/ });
    fireEvent.click(namesTab);
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Couple Names/);
    const leftName = screen.getByLabelText('Left (Groom)');
    fireEvent.change(leftName, { target: { value: 'Updated Groom' } });
    expect(onUpdate).toHaveBeenCalledWith({ person_left_name: 'Updated Groom' });

    fireEvent.keyDown(namesTab, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Bridal Party/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Bridal Party/);
    fireEvent.click(screen.getByRole('tab', { name: /Couple Names/ }));
    expect(screen.getByLabelText('Left (Groom)')).toHaveValue('Updated Groom');
    expect(screen.getByText('Updated Groom · Nahla')).toBeInTheDocument();
  });

  it('keeps every existing control and the approved bridal-party maximums', () => {
    render(<StatefulSettings />);
    fireEvent.click(screen.getByRole('tab', { name: /Bridal Party/ }));
    const bridalPanel = screen.getByRole('tabpanel');
    expect(within(bridalPanel).getByText('Groomsmen Count (Left)')).toBeInTheDocument();
    expect(within(bridalPanel).getByText('Bridesmaids Count (Right)')).toBeInTheDocument();
    expect(within(bridalPanel).getAllByRole('slider')).toHaveLength(2);
    within(bridalPanel).getAllByRole('slider').forEach(slider => expect(slider).toHaveAttribute('aria-valuemax', '10'));

    fireEvent.click(screen.getByRole('tab', { name: /Family Labels/ }));
    expect(screen.getByLabelText('Left Side')).toHaveValue("Groom's Family");
    expect(screen.getByLabelText('Right Side')).toHaveValue("Bride's Family");
    fireEvent.click(screen.getByRole('tab', { name: /Display Options/ }));
    expect(screen.getByRole('switch', { name: 'Show Row Numbers' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Show Seat Numbers' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Rows & Capacity/ }));
    const capacityPanel = screen.getByRole('tabpanel');
    expect(within(capacityPanel).queryByText('Rows & Capacity')).not.toBeInTheDocument();
    expect(within(capacityPanel).queryAllByRole('slider')).toHaveLength(0);
    expect(within(capacityPanel).getByRole('combobox', { name: 'Chairs per Row' })).toHaveTextContent('6');
    expect(within(capacityPanel).getByRole('combobox', { name: 'Total Rows' })).toHaveTextContent('12');
    expect(within(capacityPanel).getByRole('combobox', { name: 'Family Rows' })).toHaveTextContent('12');
  });

  it('restores saved capacity values and normalises Family Rows atomically when Total Rows is reduced', () => {
    const onUpdate = vi.fn();
    render(<StatefulSettings onUpdate={onUpdate} initialPlan={makePlan({ chairs_per_row: 5, total_rows: 8, assigned_rows: 7 })} />);
    fireEvent.click(screen.getByRole('tab', { name: /Rows & Capacity/ }));
    expect(screen.getByRole('combobox', { name: 'Chairs per Row' })).toHaveTextContent('5');
    expect(screen.getByRole('combobox', { name: 'Total Rows' })).toHaveTextContent('8');
    expect(screen.getByRole('combobox', { name: 'Family Rows' })).toHaveTextContent('7');

    fireEvent.click(screen.getByRole('combobox', { name: 'Total Rows' }));
    fireEvent.click(screen.getByRole('option', { name: '4' }));
    expect(onUpdate).toHaveBeenLastCalledWith({ total_rows: 4, assigned_rows: 4 });
    expect(screen.getByText(/4 rows.*5 chairs each side.*4 family rows/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Family Rows' })).toHaveTextContent('4');

    fireEvent.click(screen.getByRole('combobox', { name: 'Family Rows' }));
    expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['1', '2', '3', '4']);
  });

  it('updates the authoritative A4 immediately from a capacity dropdown', () => {
    const { container } = render(<SettingsWithA4 />);
    expect(container.querySelectorAll('[data-ceremony-seat]')).toHaveLength(144);
    fireEvent.click(screen.getByRole('tab', { name: /Rows & Capacity/ }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Chairs per Row' }));
    fireEvent.click(screen.getByRole('option', { name: '2' }));
    expect(screen.getByText(/12 rows.*2 chairs each side.*12 family rows/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Total Attending: 71');
    expect(container.querySelectorAll('[data-ceremony-seat]')).toHaveLength(48);
  });

  it('defines the requested six, three, two, and one-column responsive layouts without page overflow', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanSettings.module.css'), 'utf8');
    expect(css).toMatch(/\.selectorGrid \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    expect(css).toMatch(/@media \(min-width: 360px\)[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/@media \(min-width: 768px\)[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/@media \(min-width: 1280px\)[\s\S]*?repeat\(6, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/@media \(min-width: 768px\)[\s\S]*?\.twoColumnControls \{ grid-template-columns: repeat\(2/);
    expect(css).toMatch(/@media \(min-width: 1024px\)[^}]*\.threeColumnControls \{ grid-template-columns: repeat\(3/);
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
