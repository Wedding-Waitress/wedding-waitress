import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AcceptTeamInvitation } from './AcceptTeamInvitation';

const accept = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useTeamAccess', () => ({ acceptTeamInvitation: accept }));

describe('AcceptTeamInvitation', () => {
  it('fails closed without accepting a token when the feature is not deployed', () => {
    render(<MemoryRouter initialEntries={['/accept-team-invitation']}><AcceptTeamInvitation /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Invitation unavailable' })).toBeInTheDocument();
    expect(screen.getByText(/not available in this environment yet/i)).toBeInTheDocument();
    expect(accept).not.toHaveBeenCalled();
  });
});
