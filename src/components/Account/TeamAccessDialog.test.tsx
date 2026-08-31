import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamAccessDialog } from './TeamAccessDialog';

const mocks = vi.hoisted(() => ({ invite: vi.fn(), revoke: vi.fn(), remove: vi.fn(), toast: vi.fn() }));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useTeamAccess', () => ({
  useTeamAccess: () => ({
    members: [
      { id: 'master-1', member_user_id: 'master-1', member_email: 'owner@example.com', role: 'master', invited_at: '', accepted_at: '' },
      { id: 'member-1', member_user_id: 'member-1', member_email: 'helper@example.com', role: 'standard', invited_at: '', accepted_at: '' },
    ],
    invitations: [{ id: 'invite-1', email: 'pending@example.com', created_at: '', expires_at: '2026-09-13T00:00:00Z', status: 'pending' }],
    seats: { used: 3, maximum: 3, remaining: 0 }, loading: false, error: null,
    invite: mocks.invite, revokeInvitation: mocks.revoke, removeMember: mocks.remove,
  }),
}));

describe('TeamAccessDialog', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true); mocks.invite.mockResolvedValue({}); mocks.revoke.mockResolvedValue({}); mocks.remove.mockResolvedValue({}); });

  it('shows master, standard and pending access without exposing promotion controls', () => {
    render(<TeamAccessDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('helper@example.com')).toBeInTheDocument();
    expect(screen.getByText('pending@example.com')).toBeInTheDocument();
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(screen.queryByText(/promote/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Invite' })).toBeDisabled();
  });

  it('requires confirmation before removing a standard member', async () => {
    render(<TeamAccessDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove helper@example.com' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('member-1'));
    expect(window.confirm).toHaveBeenCalledWith('Remove account access for helper@example.com?');
  });
});
