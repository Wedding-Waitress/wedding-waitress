import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { AccountAccessCard } from './AccountAccessCard';

const refresh = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useAccountRole', () => ({ useAccountRole: () => ({ isMaster: true }) }));
vi.mock('@/lib/teamAccessAvailability', () => ({ TEAM_ACCESS_ENABLED: true }));
vi.mock('@/hooks/useTeamAccess', () => ({ useTeamAccess: () => ({ members: [], invitations: [], seats: { used: 1, maximum: 5, remaining: 4 }, loading: false, error: 'Request failed', refresh }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: null }) }));

describe('AccountAccessCard request failures', () => {
  it('shows a recoverable error instead of an indefinite loading message', () => {
    render(<AccountAccessCard icon={Users} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Team access could not load: Request failed');
    expect(screen.queryByText('Loading account holder…')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
