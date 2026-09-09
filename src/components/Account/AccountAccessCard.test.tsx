import React from 'react';
import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { AccountAccessCard } from './AccountAccessCard';

vi.mock('@/hooks/useAccountRole', () => ({ useAccountRole: () => ({ isMaster: true }) }));
vi.mock('@/lib/teamAccessAvailability', () => ({ TEAM_ACCESS_ENABLED: true, TEAM_ACCESS_UNAVAILABLE_MESSAGE: '' }));
vi.mock('@/hooks/useTeamAccess', () => ({ useTeamAccess: () => ({ members: [{ id:'1', member_user_id:'1', member_email:'owner@example.com', first_name:'Wendy', last_name:'Owner', mobile:'0400 000 000', role:'master', invited_at:'', accepted_at:'' }], invitations:[], seats:{used:1,maximum:5,remaining:4}, loading:false, error:null, refresh:vi.fn() }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: null }) }));

describe('AccountAccessCard styling', () => {
  it('renders the approved four-column membership table and master badge', async () => {
    const { container } = render(<AccountAccessCard icon={Users} />);
    expect(await screen.findByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('Wendy Owner')).toBeInTheDocument();
    expect(screen.getByText('Phone Number')).toBeInTheDocument();
    expect(screen.getByText('Account Role')).toBeInTheDocument();
    const badge = container.querySelector('[data-master-account-badge]');
    expect(badge).toHaveTextContent('Master Account Holder');
    expect(container.querySelector('[data-team-roster-header]')).toBeInTheDocument();
  });
});
