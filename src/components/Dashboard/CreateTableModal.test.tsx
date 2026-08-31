import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TableWithGuestCount } from '@/hooks/useTables';
import { CreateTableModal } from './CreateTableModal';
import tableDrawerStyles from './TableDrawer.module.css';

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section data-testid="table-drawer" className={className}>{children}</section>
  ),
  SheetHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <header className={className}>{children}</header>
  ),
  SheetTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
}));

vi.mock('./GuestLimitDialog', () => ({ GuestLimitDialog: () => null }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const editingTable: TableWithGuestCount = {
  id: 'table-3',
  event_id: 'event-1',
  user_id: 'user-1',
  name: '3',
  limit_seats: 10,
  notes: 'Near the dance floor',
  table_no: 3,
  table_type: 'square',
  created_at: '2026-08-16T00:00:00.000Z',
  updated_at: '2026-08-16T00:00:00.000Z',
  guest_count: 6,
  table_purpose: 'standard',
  head_seating_order: [],
};

describe('CreateTableModal', () => {
  it('submits a new table through the existing create callback without persistence', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(<CreateTableModal isOpen onClose={onClose} onSave={onSave} />);

    expect(screen.getByRole('heading', { name: 'Create Table' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Round/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(screen.getByLabelText('Table Name or No *'), { target: { value: 'VIP A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      name: 'VIP A',
      limit_seats: 8,
      notes: undefined,
      table_no: null,
      table_type: 'round',
      table_purpose: 'standard',
      head_seating_order: [],
    }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('prefills and submits the selected table through the existing edit callback', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <CreateTableModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        editingTable={editingTable}
        existingTables={[editingTable]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Edit Table' })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByText('6 guests')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Square/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      name: '3',
      limit_seats: 10,
      notes: 'Near the dance floor',
      table_no: 3,
      table_type: 'square',
      table_purpose: 'standard',
      head_seating_order: [],
    }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('renders an unmistakable green selected state and espresso unselected state without a white background', () => {
    render(<CreateTableModal isOpen onClose={vi.fn()} onSave={vi.fn().mockResolvedValue(true)} />);

    const headChoice = screen.getByRole('button', { name: 'Yes, add a head table' });
    const standardChoice = screen.getByRole('button', { name: 'No, continue with standard tables' });

    expect(standardChoice).toHaveAttribute('aria-pressed', 'true');
    expect(standardChoice).toHaveAttribute('data-selection-state', 'selected');
    expect(standardChoice).toHaveClass('ww-emboss-green', 'text-white', tableDrawerStyles.headTableChoiceSelected);
    expect(standardChoice.querySelector('svg')).toBeInTheDocument();

    expect(headChoice).toHaveAttribute('aria-pressed', 'false');
    expect(headChoice).toHaveAttribute('data-selection-state', 'unselected');
    expect(headChoice).toHaveClass(tableDrawerStyles.headTableChoiceUnselected);
    expect(headChoice).not.toHaveClass('ww-emboss-green', 'bg-background');
    expect(headChoice.querySelector('svg')).not.toBeInTheDocument();
  });

  it('keeps the existing choice state logic when either option is selected', () => {
    render(<CreateTableModal isOpen onClose={vi.fn()} onSave={vi.fn().mockResolvedValue(true)} />);

    const headChoice = screen.getByRole('button', { name: 'Yes, add a head table' });
    const standardChoice = screen.getByRole('button', { name: 'No, continue with standard tables' });

    fireEvent.click(headChoice);
    expect(headChoice).toHaveAttribute('aria-pressed', 'true');
    expect(standardChoice).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByDisplayValue('Head Table')).toBeInTheDocument();

    fireEvent.click(standardChoice);
    expect(standardChoice).toHaveAttribute('aria-pressed', 'true');
    expect(headChoice).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Table Name or No *')).toHaveValue('');
  });

  it('uses native keyboard-focusable buttons with exposed pressed states', () => {
    render(<CreateTableModal isOpen onClose={vi.fn()} onSave={vi.fn().mockResolvedValue(true)} />);

    const headChoice = screen.getByRole('button', { name: 'Yes, add a head table' });
    headChoice.focus();

    expect(headChoice).toHaveFocus();
    expect(headChoice).toHaveAttribute('type', 'button');
    expect(headChoice).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(headChoice);
    expect(headChoice).toHaveAttribute('aria-pressed', 'true');
  });

  it.each([1440, 768, 390])('keeps both full labels visible at a %ipx viewport', (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
    window.dispatchEvent(new Event('resize'));

    render(<CreateTableModal isOpen onClose={vi.fn()} onSave={vi.fn().mockResolvedValue(true)} />);

    const group = screen.getByRole('group', { name: 'Include a head table?' });
    expect(group).toHaveClass(tableDrawerStyles.headTableChoiceGroup);
    expect(screen.getByRole('button', { name: 'Yes, add a head table' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'No, continue with standard tables' })).toBeVisible();
  });
});
