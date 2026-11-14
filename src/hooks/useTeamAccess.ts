import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';


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

interface TeamSeats { used: number; maximum: number; remaining: number; occupied: number; reserved: number }
interface TeamAccessResponse {
  ready?: boolean;
  version?: number;
  members?: AccountMemberSummary[];
  invitations?: AccountInvitationSummary[];
  seats?: TeamSeats;
  success?: boolean;
  membership?: { account_owner_id: string; role: 'standard' };
  invitation?: AccountInvitationSummary & { account_holder_name?: string; account_holder_email?: string };
}

const emptySeats: TeamSeats = { used: 0, maximum: 5, remaining: 0, occupied: 0, reserved: 0 };

const invoke = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('manage-account-members', { body });
  if (error) throw Object.assign(new Error((data as { error?: string } | null)?.error || error.message || 'Team access request failed'), {
    status: (error as { context?: { status?: number } }).context?.status,
  });
  if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
  return data as TeamAccessResponse;
};

export const requireTeamReadiness = async () => {
  try {
    const result = await invoke({action: 'readiness'});
    if (result.ready !== true || result.version !== 2) throw new Error('Backend update required');
  } catch (error) {
    throw Object.assign(new Error('Team access setup is not ready. The matching backend update or account access checks must complete before invitations are available. Please retry or contact support.'), {
      status: (error as {status?: number})?.status,
    });
  }
};

export const useTeamAccess = (enabled = true) => {
  const available = enabled;
  const [ready, setReady] = useState(false);
  const [members, setMembers] = useState<AccountMemberSummary[]>([]);
  const [invitations, setInvitations] = useState<AccountInvitationSummary[]>([]);
  const [seats, setSeats] = useState<TeamSeats>(emptySeats);
  const [loading, setLoading] = useState(available);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const loaded = useRef(false);
  const inFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (!available) {
      setLoading(false);
      return;
    }
    // Focus, polling and manual retries share one request. A background read
    // must not turn a populated roster back into the initial loading screen.
    if (inFlight.current) return inFlight.current;
    setLoading(!loaded.current);
    setRefreshing(true);
    const request = (async () => {
      try {
        await requireTeamReadiness();
        const data = await invoke({ action: 'list' });
        setReady(true);
        setMembers(data.members ?? []);
        setInvitations(data.invitations ?? []);
        setSeats(data.seats ?? emptySeats);
        loaded.current = true;
        setHasData(true);
        setError(null);
      } catch (requestError) {
        setReady(false);
        setError(requestError instanceof Error ? requestError.message : 'Unable to load team access');
        // Do not retain private roster details after an explicit access denial.
        if ([401, 403].includes((requestError as {status?: number})?.status ?? 0)) {
          loaded.current = false;
          setHasData(false);
          setMembers([]);
          setInvitations([]);
          setSeats(emptySeats);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    })();
    inFlight.current = request;
    try { await request; } finally { inFlight.current = null; }
  }, [available]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!available) return;
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(onFocus, 60_000);
    return () => { window.removeEventListener('focus', onFocus); window.clearInterval(timer); };
  }, [available, refresh]);

  const mutate = useCallback(async (body: Record<string, unknown>) => {
    await requireTeamReadiness();
    const result = await invoke(body);
    // A read that started before the mutation cannot verify its outcome.
    await inFlight.current;
    await refresh();
    return result;
  }, [refresh]);

  return {
    available: ready, ready, hasData, refreshing, members, invitations, seats, loading, error, refresh,
    invite: (input: { firstName: string; lastName: string; email: string; mobile: string }) => mutate({ action: 'invite', ...input }),
    revokeInvitation: (invitationId: string) => mutate({ action: 'revoke-invitation', invitationId }),
    removeMember: (memberId: string) => mutate({ action: 'remove-member', memberId }),
  };
};

export const acceptTeamInvitation = async () => {
  await requireTeamReadiness();
  return invoke({ action: 'accept' });
};

export const previewTeamInvitation = async () => {
  await requireTeamReadiness();
  const result = await invoke({ action: 'preview' });
  if (!result.invitation) throw new Error('This invitation is invalid, expired, revoked, or has already been used');
  return result.invitation;
};
