import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TEAM_ACCESS_ENABLED } from '@/lib/teamAccessAvailability';

export interface AccountMemberSummary {
  id: string;
  member_user_id: string;
  member_email: string;
  role: 'master' | 'standard';
  invited_at: string;
  accepted_at: string | null;
  first_name: string | null;
  last_name: string | null;
  mobile: string | null;
}

export interface AccountInvitationSummary {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  status: 'pending';
  first_name: string;
  last_name: string;
  mobile: string;
}

interface TeamSeats { used: number; maximum: number; remaining: number }
interface TeamAccessResponse {
  members?: AccountMemberSummary[];
  invitations?: AccountInvitationSummary[];
  seats?: TeamSeats;
  success?: boolean;
  membership?: { account_owner_id: string; role: 'standard' };
  invitation?: AccountInvitationSummary & { account_holder_name?: string; account_holder_email?: string };
}

const emptySeats: TeamSeats = { used: 1, maximum: 5, remaining: 4 };

const invoke = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('manage-account-members', { body });
  if (error) throw new Error((data as { error?: string } | null)?.error || error.message || 'Team access request failed');
  if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
  return data as TeamAccessResponse;
};

export const useTeamAccess = (enabled = true) => {
  const available = TEAM_ACCESS_ENABLED && enabled;
  const [members, setMembers] = useState<AccountMemberSummary[]>([]);
  const [invitations, setInvitations] = useState<AccountInvitationSummary[]>([]);
  const [seats, setSeats] = useState<TeamSeats>(emptySeats);
  const [loading, setLoading] = useState(available);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!available) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await invoke({ action: 'list' });
      setMembers(data.members ?? []);
      setInvitations(data.invitations ?? []);
      setSeats(data.seats ?? emptySeats);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load team access');
    } finally {
      setLoading(false);
    }
  }, [available]);

  useEffect(() => { void refresh(); }, [refresh]);

  const mutate = useCallback(async (body: Record<string, unknown>) => {
    const result = await invoke(body);
    await refresh();
    return result;
  }, [refresh]);

  return {
    available: TEAM_ACCESS_ENABLED, members, invitations, seats, loading, error, refresh,
    invite: (input: { firstName: string; lastName: string; email: string; mobile: string }) => mutate({ action: 'invite', ...input }),
    revokeInvitation: (invitationId: string) => mutate({ action: 'revoke-invitation', invitationId }),
    removeMember: (memberId: string) => mutate({ action: 'remove-member', memberId }),
  };
};

export const acceptTeamInvitation = async () => {
  if (!TEAM_ACCESS_ENABLED) throw new Error('Team access is not available in this environment');
  return invoke({ action: 'accept' });
};

export const previewTeamInvitation = async () => {
  if (!TEAM_ACCESS_ENABLED) throw new Error('Team access is not available in this environment');
  const result = await invoke({ action: 'preview' });
  if (!result.invitation) throw new Error('This invitation is invalid, expired, revoked, or has already been used');
  return result.invitation;
};
