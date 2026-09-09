import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditDetailsModal } from './EditDetailsModal';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
  updateEq: vi.fn(),
  selectSingle: vi.fn(),
  updateCachedProfile: vi.fn(),
  toast: vi.fn(),
}));

const profile = {
  id: 'user-1',
  first_name: 'Alex',
  last_name: 'Owner',
  email: 'alex@example.com',
  mobile: '+61400000000',
  display_countdown_event_id: null,
  account_id: 'WW-1',
  country_code: 'AU',
  profile_image_path: null,
  profile_image_fit: 'cover' as const,
  profile_image_position_x: 50,
  profile_image_position_y: 50,
  profile_image_url: null,
};

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile, updateCachedProfile: mocks.updateCachedProfile }),
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: mocks.getUser, updateUser: mocks.updateUser },
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: mocks.updateEq })),
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mocks.selectSingle })) })),
    })),
  },
}));

describe('EditDetailsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { email: 'alex@example.com' } }, error: null });
    mocks.updateEq.mockResolvedValue({ error: null });
    mocks.selectSingle.mockResolvedValue({ data: profile, error: null });
    mocks.updateUser.mockResolvedValue({ data: { user: { email: 'alex@example.com' } }, error: null });
  });

  it('does not persist typed edits when the dialog is cancelled', async () => {
    const onOpenChange = vi.fn();
    render(<EditDetailsModal open onOpenChange={onOpenChange} />);
    fireEvent.change(await screen.findByLabelText('First name'), { target: { value: 'Jamie' } });
    fireEvent.change(screen.getByLabelText('Login email'), { target: { value: 'alexandria.long-wedding-account@example-wedding-domain.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mocks.updateEq).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('reviews all mixed changes and applies them only after one approval', async () => {
    render(<EditDetailsModal open onOpenChange={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('First name'), { target: { value: 'Jamie' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText('Login email'), { target: { value: 'alexandria.long-wedding-account@example-wedding-domain.com' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '+61411111111' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));

    expect(screen.getByRole('heading', { name: 'Review changes' })).toBeInTheDocument();
    expect(screen.getByText('First name')).toBeInTheDocument();
    expect(screen.getByText('Last name')).toBeInTheDocument();
    expect(screen.getByText('Login email')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getAllByText('Current')).toHaveLength(4);
    expect(screen.getAllByText('New')).toHaveLength(4);
    expect(screen.getByText('alexandria.long-wedding-account@example-wedding-domain.com')).toBeInTheDocument();
    expect(mocks.updateEq).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith(
      { email: 'alexandria.long-wedding-account@example-wedding-domain.com' },
      { emailRedirectTo: `${window.location.origin}/account/account-info` },
    ));
    expect(mocks.updateEq).toHaveBeenCalledWith('id', 'user-1');
    await screen.findByRole('heading', { name: 'Verify your new email' });
    expect(screen.getByRole('dialog')).toHaveTextContent('remains your active login email');
    expect(screen.getByRole('dialog')).toHaveTextContent('No phone number was marked verified');
  });

  it('requires approval for a name-only edit and does not request an email change', async () => {
    render(<EditDetailsModal open onOpenChange={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('First name'), { target: { value: 'Jamie' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    expect(mocks.updateEq).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(mocks.updateEq).toHaveBeenCalledWith('id', 'user-1'));
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(await screen.findByText('All approved changes have been saved.')).toBeInTheDocument();
  });

  it('reports unchanged input without persisting anything', async () => {
    render(<EditDetailsModal open onOpenChange={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Review changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('No changes to review.');
    expect(mocks.updateEq).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
