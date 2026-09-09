import React from 'react';
import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { AccountAccessCard } from './AccountAccessCard';

vi.mock('@/hooks/useAccountRole', () => ({ useAccountRole: () => ({ isMaster: false }) }));
vi.mock('@/lib/teamAccessAvailability', () => ({ TEAM_ACCESS_ENABLED: false }));
vi.mock('@/hooks/useTeamAccess', () => ({ useTeamAccess: () => ({ members: [], invitations: [], seats: { used: 1, maximum: 5, remaining: 4 }, loading: false, error: null, refresh: vi.fn() }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: { id: 'owner-1', email: 'owner@example.com', first_name: 'Nader', last_name: 'Elalfy', mobile: '+61411569505' } }) }));

describe('AccountAccessCard before Team backend activation', () => {
  it('shows the real account holder accurately without exposing unavailable actions or a coming-soon box', () => {
    const { container } = render(<AccountAccessCard icon={Users} />);
    expect(screen.getByText('Nader Elalfy')).toBeInTheDocument();
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('+61411569505')).toBeInTheDocument();
    expect(screen.getByText('Master Account Holder')).toBeInTheDocument();
    expect(screen.queryByText(/team access is coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /invite user/i })).not.toBeInTheDocument();
    expect(container.querySelector('[data-team-roster-header]')).toBeInTheDocument();
  });
});
