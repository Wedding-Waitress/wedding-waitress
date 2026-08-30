import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeRsvp } from '@/lib/rsvp';
import { registerCache, registerEventCache } from '@/lib/cacheRegistry';

export interface DashboardOverviewData {
  totalGuests: number;
  attendingGuests: number;
  pendingGuests: number;
  declinedGuests: number;
  tableCount: number;
  seatedAttendingGuests: number;
  unseatedAttendingGuests: number;
  dietaryGuests: number;
  overCapacityTables: number;
  qrReady: boolean | null;
}

interface DashboardGuestRow {
  id: string;
  event_id: string;
  rsvp: string | null;
  table_id: string | null;
  dietary: string | null;
}

interface DashboardTableRow {
  id: string;
  event_id: string;
  limit_seats: number;
}

interface DashboardQrRow {
  code: string;
  current_event_id: string | null;
  is_active: boolean;
}

const hasDietaryRequirement = (value: string | null): boolean => {
  const normalized = value?.trim().toLowerCase() ?? '';
  return normalized !== '' && normalized !== 'na' && normalized !== 'none';
};

export const calculateDashboardOverview = (
  guests: DashboardGuestRow[],
  tables: DashboardTableRow[],
  qrCodes: DashboardQrRow[],
): DashboardOverviewData => {
  const attendingGuests = guests.filter((guest) => normalizeRsvp(guest.rsvp) === 'Attending');
  const pendingGuests = guests.filter((guest) => normalizeRsvp(guest.rsvp) === 'Pending');
  const declinedGuests = guests.filter((guest) => normalizeRsvp(guest.rsvp) === 'Not Attending');
  const tableIds = new Set(tables.map((table) => table.id));
  const seatedAttendingGuests = attendingGuests.filter(
    (guest) => Boolean(guest.table_id && tableIds.has(guest.table_id)),
  ).length;
  const assignedCounts = guests.reduce<Map<string, number>>((counts, guest) => {
    if (guest.table_id && tableIds.has(guest.table_id)) {
      counts.set(guest.table_id, (counts.get(guest.table_id) ?? 0) + 1);
    }
    return counts;
  }, new Map());

  return {
    totalGuests: guests.length,
    attendingGuests: attendingGuests.length,
    pendingGuests: pendingGuests.length,
    declinedGuests: declinedGuests.length,
    tableCount: tables.length,
    seatedAttendingGuests,
    unseatedAttendingGuests: attendingGuests.length - seatedAttendingGuests,
    dietaryGuests: guests.filter((guest) => hasDietaryRequirement(guest.dietary)).length,
    overCapacityTables: tables.filter(
      (table) => (assignedCounts.get(table.id) ?? 0) > table.limit_seats,
    ).length,
    qrReady: qrCodes.some((qrCode) => qrCode.is_active && Boolean(qrCode.code)),
  };
};

export const DASHBOARD_OVERVIEW_REQUEST_COUNT = 3;

const fetchDashboardGuests = async (eventId: string): Promise<DashboardGuestRow[]> => {
  const { data, error } = await supabase
    .from('guests')
    .select('id, event_id, rsvp, table_id, dietary')
    .eq('event_id', eventId);
  if (error) throw error;
  return (data ?? []) as DashboardGuestRow[];
};

const fetchDashboardTables = async (eventId: string): Promise<DashboardTableRow[]> => {
  const { data, error } = await supabase
    .from('tables')
    .select('id, event_id, limit_seats')
    .eq('event_id', eventId);
  if (error) throw error;
  return (data ?? []) as DashboardTableRow[];
};

const fetchDashboardQrCodes = async (eventId: string): Promise<DashboardQrRow[]> => {
  const { data, error } = await supabase
    .from('dynamic_qr_codes')
    .select('code, current_event_id, is_active')
    .eq('current_event_id', eventId)
    .eq('is_active', true)
    .limit(1);
  if (error) throw error;
  return (data ?? []) as DashboardQrRow[];
};

export const fetchDashboardOverview = async (eventId: string): Promise<DashboardOverviewData> => {
  const [guests, tables, qrCodes] = await Promise.all([
    fetchDashboardGuests(eventId),
    fetchDashboardTables(eventId),
    fetchDashboardQrCodes(eventId),
  ]);
  return calculateDashboardOverview(guests, tables, qrCodes);
};

interface DashboardOverviewState {
  data: DashboardOverviewData | null;
  loading: boolean;
  secondaryLoading: boolean;
  error: string | null;
}

const EMPTY_STATE: DashboardOverviewState = { data: null, loading: false, secondaryLoading: false, error: null };
const DASHBOARD_OVERVIEW_STALE_MS = 30_000;
type DashboardOverviewCacheEntry = { data: DashboardOverviewData; updatedAt: number };
const dashboardOverviewCache = new Map<string, DashboardOverviewCacheEntry>();
const coreRequests = new Map<string, Promise<[DashboardGuestRow[], DashboardTableRow[]]>>();
const qrRequests = new Map<string, Promise<DashboardQrRow[]>>();

const clearDashboardOverviewCache = () => {
  dashboardOverviewCache.clear();
  coreRequests.clear();
  qrRequests.clear();
};

registerCache(clearDashboardOverviewCache);
registerEventCache((eventId) => {
  dashboardOverviewCache.delete(eventId);
  coreRequests.delete(eventId);
  qrRequests.delete(eventId);
});

export const resetDashboardOverviewCacheForTests = clearDashboardOverviewCache;

const getCoreRequest = (eventId: string) => {
  const existing = coreRequests.get(eventId);
  if (existing) return existing;
  const request = Promise.all([fetchDashboardGuests(eventId), fetchDashboardTables(eventId)])
    .finally(() => coreRequests.delete(eventId));
  coreRequests.set(eventId, request);
  return request;
};

const getQrRequest = (eventId: string) => {
  const existing = qrRequests.get(eventId);
  if (existing) return existing;
  const request = fetchDashboardQrCodes(eventId).finally(() => qrRequests.delete(eventId));
  qrRequests.set(eventId, request);
  return request;
};

export const useDashboardOverview = (eventId: string | null): DashboardOverviewState => {
  const [state, setState] = useState<DashboardOverviewState>(() => {
    const cached = eventId ? dashboardOverviewCache.get(eventId) : null;
    return cached ? { data: cached.data, loading: false, secondaryLoading: false, error: null } : EMPTY_STATE;
  });
  const requestSequence = useRef(0);

  useEffect(() => {
    const sequence = ++requestSequence.current;

    if (!eventId) {
      setState(EMPTY_STATE);
      return undefined;
    }

    const cached = dashboardOverviewCache.get(eventId);
    const cacheIsFresh = cached && Date.now() - cached.updatedAt < DASHBOARD_OVERVIEW_STALE_MS;
    setState(cached
      ? { data: cached.data, loading: false, secondaryLoading: false, error: null }
      : { data: null, loading: true, secondaryLoading: true, error: null });
    if (cacheIsFresh) return undefined;

    let active = true;
    let coreData: DashboardOverviewData | null = cached?.data ?? null;
    let qrReady: boolean | null = cached?.data.qrReady ?? null;
    let qrSettled = false;

    void getCoreRequest(eventId)
      .then(([guests, tables]) => {
        if (active && requestSequence.current === sequence) {
          coreData = { ...calculateDashboardOverview(guests, tables, []), qrReady };
          dashboardOverviewCache.set(eventId, { data: coreData, updatedAt: Date.now() });
          setState({ data: coreData, loading: false, secondaryLoading: !qrSettled, error: null });
        }
      })
      .catch((error: unknown) => {
        if (active && requestSequence.current === sequence) {
          console.error('Error fetching Dashboard overview:', error);
          setState(cached
            ? { data: cached.data, loading: false, secondaryLoading: false, error: null }
            : { data: null, loading: false, secondaryLoading: false, error: 'Your event overview could not be loaded.' });
        }
      });

    void getQrRequest(eventId)
      .then((qrCodes) => {
        if (!active || requestSequence.current !== sequence) return;
        qrSettled = true;
        qrReady = qrCodes.some((qrCode) => qrCode.is_active && Boolean(qrCode.code));
        if (coreData) {
          coreData = { ...coreData, qrReady };
          dashboardOverviewCache.set(eventId, { data: coreData, updatedAt: Date.now() });
          setState({ data: coreData, loading: false, secondaryLoading: false, error: null });
        }
      })
      .catch((qrError: unknown) => {
        if (!active || requestSequence.current !== sequence) return;
        qrSettled = true;
        console.error('Error fetching Dashboard QR readiness:', qrError);
        if (coreData) setState({ data: coreData, loading: false, secondaryLoading: false, error: null });
      });

    return () => {
      active = false;
    };
  }, [eventId]);

  return state;
};
