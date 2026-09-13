import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComingSoonSheet } from './ComingSoonSheet';
import { ChangePasswordModal } from './ChangePasswordModal';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { updateUser: vi.fn() } } }));

describe('Account Centre dialogs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the espresso-glass appearance and preserves the close action', () => {
    const onOpenChange = vi.fn();
    render(<ComingSoonSheet open onOpenChange={onOpenChange} title="User Management — Coming Soon" />);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-appearance', 'espresso-glass');
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps password validation behavior inside the themed dialog', () => {
    render(<ChangePasswordModal open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-appearance', 'espresso-glass');
    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'password');
  });

  it('clears password fields after closing and keeps the primary action before Cancel', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<ChangePasswordModal open onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Secret123!' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Secret123!' } });

    const update = screen.getByRole('button', { name: 'Update Password' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(update.compareDocumentPosition(cancel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    rerender(<ChangePasswordModal open={false} onOpenChange={onOpenChange} />);
    rerender(<ChangePasswordModal open onOpenChange={onOpenChange} />);
    expect(screen.getByLabelText('New password')).toHaveValue('');
    expect(screen.getByLabelText('Confirm password')).toHaveValue('');
  });
});
