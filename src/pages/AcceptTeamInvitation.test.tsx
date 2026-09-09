import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AcceptTeamInvitation } from './AcceptTeamInvitation';

const mocks = vi.hoisted(() => ({ preview: vi.fn(), accept: vi.fn() }));

vi.mock('@/lib/teamAccessAvailability', () => ({
  TEAM_ACCESS_ENABLED: true,
  TEAM_ACCESS_UNAVAILABLE_MESSAGE: '',
}));
vi.mock('@/hooks/useTeamAccess', () => ({
  previewTeamInvitation: mocks.preview,
  acceptTeamInvitation: mocks.accept,
}));

describe('AcceptTeamInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.preview.mockResolvedValue({
      id: 'invite-1',
      email: 'alex@example.com',
      first_name: 'Alex',
      last_name: 'Helper',
      mobile: '+61 400 000 000',
      created_at: '2026-09-09T00:00:00Z',
      expires_at: '2026-09-16T00:00:00Z',
      status: 'pending',
      account_holder_name: 'Wendy Owner',
    });
    mocks.accept.mockResolvedValue({});
  });

  it('previews the authenticated-email invitation and waits for explicit acceptance', async () => {
    render(<MemoryRouter><AcceptTeamInvitation /></MemoryRouter>);
    expect(await screen.findByText('Alex Helper')).toBeInTheDocument();
    expect(screen.getByText(/Invited by Wendy Owner/)).toBeInTheDocument();
    expect(mocks.preview).toHaveBeenCalledTimes(1);
    expect(mocks.accept).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Accept Invitation' }));
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Invitation accepted')).toBeInTheDocument();
  });
});
