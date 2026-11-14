import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Users } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountAccessCard } from './AccountAccessCard';

const state=vi.hoisted(()=>({ready:true,hasData:undefined as boolean|undefined,refreshing:false,loading:false,isMaster:true,error:null as string|null}));
vi.mock('@/hooks/useAccountRole', () => ({ useAccountRole: () => ({ isMaster: state.isMaster }) }));
vi.mock('@/lib/teamAccessAvailability', () => ({ TEAM_ACCESS_ENABLED: true, TEAM_ACCESS_UNAVAILABLE_MESSAGE: '' }));
vi.mock('@/hooks/useTeamAccess', () => ({ useTeamAccess: () => ({ ready: state.ready, hasData:state.hasData, refreshing:state.refreshing, members: [{ id:'1', member_user_id:'1', member_email:'owner@example.com', first_name:'Wendy', last_name:'Owner', mobile:'0400 000 000', role:'master', invited_at:'', accepted_at:'' }], invitations:[], seats:{used:1,occupied:1,reserved:0,maximum:5,remaining:4}, loading:state.loading, error:state.error, refresh:vi.fn() }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: null }) }));

describe('AccountAccessCard styling', () => {
  it('keeps seats, accepted members and invitations visible through background refresh and transient errors',()=>{
    state.hasData=true;
    const view=render(<AccountAccessCard icon={Users}/>);
    state.refreshing=true;view.rerender(<AccountAccessCard icon={Users}/>);
    expect(screen.getByRole('status')).toHaveTextContent('Updating team access');
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('Pending invitations (0)')).toBeInTheDocument();
    expect(screen.queryByText(/Checking team access/)).not.toBeInTheDocument();
    state.refreshing=false;state.ready=false;state.error='Network unavailable';view.rerender(<AccountAccessCard icon={Users}/>);
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('Pending invitations (0)')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('last successfully loaded');
    expect(screen.getByRole('button',{name:'Invite User'})).toBeDisabled();
    expect(screen.getByRole('button',{name:'Manage Users'})).toBeDisabled();
  });
  beforeEach(()=>{state.ready=true;state.hasData=undefined;state.refreshing=false;state.loading=false;state.isMaster=true;state.error=null;});
  it('preserves an open invitation draft during background readiness refresh',()=>{
    const view=render(<AccountAccessCard icon={Users}/>);
    fireEvent.click(screen.getByRole('button',{name:'Invite User'}));
    const field=screen.getByLabelText('First name');
    fireEvent.change(field,{target:{value:'Draft name'}});
    state.loading=true;view.rerender(<AccountAccessCard icon={Users}/>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toBe(field);
    expect(field).toHaveValue('Draft name');
    expect(screen.getByRole('button',{name:'Send Invite'})).toBeDisabled();
    state.loading=false;view.rerender(<AccountAccessCard icon={Users}/>);
    expect(screen.getByLabelText('First name')).toHaveValue('Draft name');
  });
  it('keeps the allowance above the roster and explains reserved places and owner-only actions',()=>{
    render(<AccountAccessCard icon={Users}/>);
    const instructions=screen.getByRole('heading',{name:'Your team allowance'}).closest('section')!;
    expect(instructions.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(instructions).toHaveTextContent('14 days');
    expect(instructions).toHaveTextContent('5 people total: 1 Master Account Holder + up to 4 team members');
    expect(instructions).toHaveTextContent('Their contributions and event content stay saved');
    expect(screen.getByRole('button',{name:'Invite User'})).toBeEnabled();
  });
  it('shows readiness feedback and disabled owner controls instead of silently hiding them',()=>{
    state.ready=false;state.error='Matching backend update required';render(<AccountAccessCard icon={Users}/>);
    expect(screen.getByRole('alert')).toHaveTextContent('Matching backend update required');
    expect(screen.getByRole('button',{name:'Invite User'})).toBeDisabled();
    expect(screen.getByRole('button',{name:'Manage Users'})).toBeDisabled();
    expect(screen.queryByText('owner@example.com')).not.toBeInTheDocument();
  });
  it('does not offer team management or call a standard member the account holder',()=>{
    state.isMaster=false;render(<AccountAccessCard icon={Users}/>);
    expect(screen.queryByRole('button',{name:'Invite User'})).not.toBeInTheDocument();
    expect(screen.getByRole('heading',{name:'Your team allowance'}).closest('section')).not.toHaveTextContent('you as the Master Account Holder');
  });
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
