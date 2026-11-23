/**
 * Event Data Management Hook with Ceremony & Reception Support
 * 
 * Handles fetching, creating, updating, and deleting events
 * with full ceremony and reception field support.
 */

import { useState, useEffect, useRef } from 'react';
import { PLAN_ENTITLEMENT_CHANGED_EVENT } from '@/lib/planEntitlementEvents';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { clearAllCaches, clearEventCaches, getCacheGeneration, getCacheUserId, registerCache, registerEventCache, setCacheUserId } from '@/lib/cacheRegistry';
import { getSelectedEventId, setSelectedEventId } from '@/hooks/useSelectedEvent';
import {
  EventDeletionError,
  EVENT_DELETED_EVENT,
  getEventDeletionMessage,
  notifyEventDeleted,
} from '@/lib/eventDeletion';
import {
  EventAllowanceError,
  getDatabaseEventCreationError,
  getEventAllowanceSnapshot,
  getEventCreationBlockMessage,
  notifyEventAllowanceChanged,
} from '@/lib/eventAllowance';
import { isEventImageBackendUnavailable, isEventImageZoomBackendUnavailable } from '@/lib/eventImage';
import { deleteOwnedEventWithImage } from '@/lib/eventDeletionWithImage';
import { syncEventHeroImage } from '@/lib/eventHeroImage';
import { EVENT_CREATED_EVENT, type EventCreatedDetail } from '@/lib/eventCreationEvents';
import {
  assertEventGuestLimitChange,
  assertGuestLimitsWithinEntitlement,
  getEventGuestLimitValidation,
  getGuestCapacityMutationError,
  getCurrentPlanGuestLimit,
  GuestCapacityError,
} from '@/lib/guestCapacityAccess';

export interface Event {
  id: string;
  user_id: string;
  name: string;
  date: string | null;
  venue_address?: string | null;
  venue: string | null;
  venue_phone?: string | null;
  venue_contact?: string | null;
  venue_contact_email?: string | null;
  start_time: string | null;
  finish_time: string | null;
  guest_limit: number;
  created_at: string;
  guests_count: number;
  event_created: string;
  expiry_date: string;
  created_date_local: string | null;
  expiry_date_local: string | null;
  event_timezone: string | null;
  partner1_name: string | null;
  partner2_name: string | null;
  slug: string | null;
  rsvp_deadline: string | null;
  relation_allow_single_partner: boolean | null;
  relation_mode?: 'two' | 'single' | 'off' | null;
  event_type?: 'seated' | 'cocktail';
  setup_details?: import('@/integrations/supabase/types').Json;
  event_image_path?: string | null;
  event_image_fit?: 'cover' | 'contain';
  event_image_position_x?: number;
  event_image_position_y?: number;
  event_image_zoom?: number;
  // Ceremony fields
  ceremony_enabled?: boolean;
  ceremony_name?: string | null;
  ceremony_date?: string | null;
  ceremony_venue?: string | null;
  ceremony_venue_address?: string | null;
  ceremony_venue_phone?: string | null;
  ceremony_venue_contact?: string | null;
  ceremony_venue_contact_email?: string | null;
  ceremony_guest_limit?: number | null;
  ceremony_start_time?: string | null;
  ceremony_finish_time?: string | null;
  ceremony_rsvp_deadline?: string | null;
  reception_enabled?: boolean;
}

// Module-level cache for instant loading on return visits. The session provider
// supplies the user key, so a cached collection can never be hydrated for a
// different authenticated account.
type EventsCache = { userId: string; events: Event[] };
let eventsCache: EventsCache | null = null;
let eventsRequest: { userId: string; promise: Promise<void> } | null = null;
let eventsCacheRevision = 0;
let createdEventSelection: EventCreatedDetail | null = null;
const getCachedEvents = () => {
  const userId = getCacheUserId();
  return userId && eventsCache?.userId === userId ? eventsCache.events : null;
};
registerCache(() => { eventsCache = null; eventsRequest = null; createdEventSelection = null; eventsCacheRevision += 1; });
if (typeof window !== 'undefined') window.addEventListener(EVENT_CREATED_EVENT, (event) => {
  const detail = (event as CustomEvent<EventCreatedDetail>).detail;
  if (!detail?.userId || detail.userId !== getCacheUserId()) return;
  eventsCache = null;
  eventsRequest = null;
  createdEventSelection = detail;
  eventsCacheRevision += 1;
});
registerEventCache((eventId) => {
  if (eventsCache) eventsCache = { ...eventsCache, events: eventsCache.events.filter((event) => event.id !== eventId) };
});
export const useEvents = () => {
  const cachedEvents = getCachedEvents();
  const [events, setEvents] = useState<Event[]>(cachedEvents ?? []);
  const [loading, setLoading] = useState(cachedEvents === null);
  const [loaded, setLoaded] = useState(cachedEvents !== null);
  const [activeEventId, setActiveEventId] = useState<string | null>(() => createdEventSelection?.userId === getCacheUserId() ? createdEventSelection.eventId : null);
  const { toast } = useToast();
  const { profile, updateDisplayCountdownEvent } = useProfile();
  const eventsRequestRef = useRef<Promise<void> | null>(null);

  // Keep cache in sync
  useEffect(() => {
    const userId = getCacheUserId();
    if (loaded && userId) eventsCache = { userId, events };
  }, [events, loaded]);

  const setActiveEventIdWithPersistence = async (eventId: string | null) => {
    createdEventSelection = null;
    setActiveEventId(eventId);
    await updateDisplayCountdownEvent(eventId);
  };

  const fetchEvents = async () => {
    const userId = getCacheUserId();
    if (!userId) return;
    if (eventsRequestRef.current) {
      const pending = eventsRequestRef.current;
      await pending;
      if (userId !== getCacheUserId()) return;
      if (eventsRequestRef.current === pending) eventsRequestRef.current = null;
      const cached = getCachedEvents();
      if (cached === null) return fetchEvents();
      setEvents(cached); setLoaded(true); setLoading(false);
      return;
    }

    // A second dashboard consumer can mount while the first is fetching. Let
    // it join that request, then hydrate from the resolved account-scoped cache
    // instead of issuing the same RPC and events select again.
    if (eventsRequest?.userId === userId) {
      const joinedRequest = eventsRequest.promise.then(() => {
        const cached = getCachedEvents();
        if (cached !== null) {
          setEvents(cached);
          setLoaded(true);
        }
        setLoading(false);
      });
      eventsRequestRef.current = joinedRequest;
      try { await joinedRequest; } finally { if (eventsRequestRef.current === joinedRequest) eventsRequestRef.current = null; }
      return;
    }

    const request = (async () => {
      const generation = getCacheGeneration();
      const revision = eventsCacheRevision;
      try {
      if (getCachedEvents() === null && !loaded) setLoading(true);
      
      // Fetch events with guest count AND additional fields in parallel
      const additionalFields = `
        id, user_id, setup_details, relation_mode,
        ceremony_enabled, ceremony_name, ceremony_date, ceremony_venue,
        ceremony_venue_address, ceremony_venue_phone, ceremony_venue_contact, ceremony_venue_contact_email,
        ceremony_guest_limit, ceremony_start_time,
        ceremony_finish_time, ceremony_rsvp_deadline, reception_enabled,
        venue_address, venue_phone, venue_contact, venue_contact_email, allow_guest_plus_ones,
        collect_guest_addresses
      `;
      const eventImageFieldsWithoutZoom = `
        id, user_id, setup_details, relation_mode, event_image_path, event_image_fit, event_image_position_x, event_image_position_y,
        ceremony_enabled, ceremony_name, ceremony_date, ceremony_venue,
        ceremony_venue_address, ceremony_venue_phone, ceremony_venue_contact, ceremony_venue_contact_email,
        ceremony_guest_limit, ceremony_start_time,
        ceremony_finish_time, ceremony_rsvp_deadline, reception_enabled,
        venue_address, venue_phone, venue_contact, venue_contact_email, allow_guest_plus_ones,
        collect_guest_addresses
      `;
      const [{ data, error }, imageFieldsResult] = await Promise.all([
        supabase.rpc('get_events_with_guest_count'),
        supabase.from('events').select(`
          id, user_id, setup_details, relation_mode, event_image_path, event_image_fit, event_image_position_x, event_image_position_y, event_image_zoom,
          ceremony_enabled, ceremony_name, ceremony_date, ceremony_venue, 
          ceremony_venue_address, ceremony_venue_phone, ceremony_venue_contact, ceremony_venue_contact_email,
          ceremony_guest_limit, ceremony_start_time, 
          ceremony_finish_time, ceremony_rsvp_deadline, reception_enabled,
          venue_address, venue_phone, venue_contact, venue_contact_email, allow_guest_plus_ones,
          collect_guest_addresses
        `),
      ]);
      let fullEvents = imageFieldsResult.data;
      let fullErr = imageFieldsResult.error;
      if (fullErr && isEventImageZoomBackendUnavailable(fullErr)) {
        const currentImageFieldsResult = await supabase.from('events').select(eventImageFieldsWithoutZoom);
        fullEvents = currentImageFieldsResult.data as typeof fullEvents;
        fullErr = currentImageFieldsResult.error;
      }
      if (fullErr && isEventImageBackendUnavailable(fullErr)) {
        const legacyFieldsResult = await supabase.from('events').select(additionalFields);
        fullEvents = legacyFieldsResult.data as typeof fullEvents;
        fullErr = legacyFieldsResult.error;
      }
      
      if (error || fullErr) {
        console.error('Error fetching events:', error || fullErr);
        toast({
          title: "Error",
          description: "Failed to load events",
          variant: "destructive",
        });
        return;
      }

      // Build a map of additional event data
      const eventDataMap = new Map((fullEvents || []).map((e: any) => [e.id, e]));

      const nextEvents = (data || []).map((event: any) => {
        const extraData = eventDataMap.get(event.id) || {};
        return {
          ...event,
          partner1_name: event.partner1_name || null,
          partner2_name: event.partner2_name || null,
          rsvp_deadline: event.rsvp_deadline || null,
          setup_details: extraData.setup_details ?? null,
          relation_mode: extraData.relation_mode ?? event.relation_mode ?? null,
          user_id: extraData.user_id ?? event.user_id,
          event_image_path: extraData.event_image_path ?? null,
          event_image_fit: extraData.event_image_fit === 'contain' ? 'contain' : 'cover',
          event_image_position_x: extraData.event_image_position_x ?? 50,
          event_image_position_y: extraData.event_image_position_y ?? 50,
          event_image_zoom: extraData.event_image_zoom ?? 100,
          ceremony_enabled: extraData.ceremony_enabled ?? false,
          ceremony_name: extraData.ceremony_name ?? null,
          ceremony_date: extraData.ceremony_date ?? null,
          ceremony_venue: extraData.ceremony_venue ?? null,
          ceremony_venue_address: extraData.ceremony_venue_address ?? null,
          ceremony_venue_phone: extraData.ceremony_venue_phone ?? null,
          ceremony_venue_contact: extraData.ceremony_venue_contact ?? null,
          ceremony_venue_contact_email: extraData.ceremony_venue_contact_email ?? null,
          ceremony_guest_limit: extraData.ceremony_guest_limit ?? null,
          ceremony_start_time: extraData.ceremony_start_time ?? null,
          ceremony_finish_time: extraData.ceremony_finish_time ?? null,
          ceremony_rsvp_deadline: extraData.ceremony_rsvp_deadline ?? null,
          reception_enabled: extraData.reception_enabled ?? true,
          venue_address: extraData.venue_address ?? null,
          venue_phone: extraData.venue_phone ?? null,
          venue_contact: extraData.venue_contact ?? null,
          venue_contact_email: extraData.venue_contact_email ?? null,
          allow_guest_plus_ones: extraData.allow_guest_plus_ones ?? false,
          collect_guest_addresses: extraData.collect_guest_addresses ?? false,
        };
      });
      if (generation !== getCacheGeneration() || userId !== getCacheUserId() || revision !== eventsCacheRevision) return;
      // Publish the resolved collection to the shared cache before React mounts
      // another feature route. This prevents a new route from observing the
      // temporary `[]` loading value as a genuine no-events result.
      eventsCache = { userId, events: nextEvents };
      if (createdEventSelection?.userId === userId && nextEvents.some(event => event.id === createdEventSelection.eventId)) {
        setActiveEventId(createdEventSelection.eventId);
      }
      setEvents(nextEvents);
      setLoaded(true);
      } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
      } finally {
        setLoading(false);
      }
    })();

    eventsRequest = { userId, promise: request };
    eventsRequestRef.current = request;
    try {
      await request;
    } finally {
      if (eventsRequestRef.current === request) eventsRequestRef.current = null;
      if (eventsRequest?.promise === request) eventsRequest = null;
    }
  };

  const createEvent = async (eventData: Partial<Omit<Event, 'id' | 'user_id' | 'created_at' | 'guests_count'>>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Permission gate: Master Account Holder only.
      const { data: membership } = await supabase
        .from('account_members' as any)
        .select('role')
        .eq('member_user_id', user.user.id)
        .order('invited_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if ((membership as any)?.role === 'standard') {
        toast({
          title: 'Restricted',
          description: 'Only the Master Account Holder can create events.',
        });
        return null as any;
      }

      // Recheck immediately before insertion. This is intentionally in the
      // mutation path as well as the My Events UI so stale screens cannot open
      // another event. The database trigger remains authoritative under races.
      const allowance = await getEventAllowanceSnapshot();
      if (!allowance.canCreate || allowance.atCap) {
        throw new EventAllowanceError(
          allowance.canCreate ? 'limit-reached' : 'plan-inactive',
          getEventCreationBlockMessage(allowance),
        );
      }

      const planGuestLimit = await getCurrentPlanGuestLimit();
      assertGuestLimitsWithinEntitlement(
        planGuestLimit,
        eventData.guest_limit ?? 50,
        (eventData as any).ceremony_guest_limit,
      );

      // Get browser timezone and calculate local dates
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const today = new Date();
      const localDateString = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      
      // Calculate expiry date (12 months from today)
      const expiryDate = new Date(today);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      const expiryDateString = expiryDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format

      // Validate relation_mode before inserting (must be 'two', 'single', or 'off')
      const relationMode = (eventData as any).relation_mode || 'two';
      if (!['two', 'single', 'off'].includes(relationMode)) {
        console.warn(`Invalid relation_mode "${relationMode}", defaulting to "two"`);
      }

      const { data, error } = await supabase
        .from('events')
        .insert([{
          // Reception/main event fields
          name: eventData.name || '',
          date: eventData.date,
          venue: eventData.venue,
          start_time: eventData.start_time,
          finish_time: eventData.finish_time,
          guest_limit: eventData.guest_limit || 50,
          user_id: user.user.id,
          created_date_local: localDateString,
          expiry_date_local: expiryDateString,
          event_timezone: timezone,
          rsvp_deadline: eventData.rsvp_deadline || null,
          event_type: (eventData as any).event_type || 'seated',
          relation_mode: ['two', 'single', 'off'].includes(relationMode) ? relationMode : 'two',
          qr_apply_to_live_view: true,
          // Ceremony fields
          ceremony_enabled: (eventData as any).ceremony_enabled ?? false,
          ceremony_name: (eventData as any).ceremony_name || null,
          ceremony_date: (eventData as any).ceremony_date || null,
          ceremony_venue: (eventData as any).ceremony_venue || null,
          ceremony_venue_address: (eventData as any).ceremony_venue_address || null,
          ceremony_venue_phone: (eventData as any).ceremony_venue_phone || null,
          ceremony_venue_contact: (eventData as any).ceremony_venue_contact || null,
          ceremony_venue_contact_email: (eventData as any).ceremony_venue_contact_email || null,
          ceremony_guest_limit: (eventData as any).ceremony_guest_limit || null,
          ceremony_start_time: (eventData as any).ceremony_start_time || null,
          ceremony_finish_time: (eventData as any).ceremony_finish_time || null,
          ceremony_rsvp_deadline: (eventData as any).ceremony_rsvp_deadline || null,
          reception_enabled: (eventData as any).reception_enabled ?? true,
          // Reception venue details
          venue_address: (eventData as any).venue_address || null,
          venue_phone: (eventData as any).venue_phone || null,
          venue_contact: (eventData as any).venue_contact || null,
          venue_contact_email: (eventData as any).venue_contact_email || null,
        }])
        .select()
        .single();

      if (error) throw error;

      // Supabase has confirmed the event row. Publish it immediately; ancillary
      // profile and QR setup must not keep the Create button spinning.
      const createdEvent = { ...data, guests_count: 0 } as Event;
      setEvents((currentEvents) => {
        const nextEvents = [...currentEvents.filter((event) => event.id !== createdEvent.id), createdEvent];
        const cacheUserId = getCacheUserId();
        if (cacheUserId) eventsCache = { userId: cacheUserId, events: nextEvents };
        return nextEvents;
      });
      setActiveEventId(data.id);
      void updateDisplayCountdownEvent(data.id);
      // Promote new event to global selected event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ww:selected-event-set', { detail: data.id }));
      }

      void (async () => {
        try {
          const { data: code, error: codeErr } = await supabase.rpc('generate_dynamic_qr_code');
          if (!codeErr && code) {
            await supabase.from('dynamic_qr_codes').insert({
              code,
              user_id: user.user.id,
              current_event_id: data.id,
              destination_type: 'guest_lookup',
              label: eventData.name || 'Event QR',
              is_active: true,
            });
          }
        } catch (qrErr) {
          console.error('Auto-create dynamic QR failed (non-blocking):', qrErr);
        }
      })();

      notifyEventAllowanceChanged();
      toast({
        title: "Success",
        description: "Event created successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      const allowanceError = error instanceof EventAllowanceError
        ? error
        : getDatabaseEventCreationError(error);
      const capacityError = error instanceof GuestCapacityError ? error : null;
      toast({
        title: allowanceError || capacityError ? 'Event not created' : 'Error',
        description: allowanceError?.message ?? capacityError?.message ?? 'Failed to create event',
        variant: "destructive",
      });
      throw allowanceError ?? error;
    }
  };

  const updateEvent = async (id: string, eventData: Partial<Omit<Event, 'id' | 'user_id' | 'created_at' | 'guests_count'>>) => {
    try {
      const currentEvent = events.find((event) => event.id === id);
      const changesGuestLimit = eventData.guest_limit !== undefined
        && eventData.guest_limit !== currentEvent?.guest_limit;
      const changesCeremonyLimit = (eventData as any).ceremony_guest_limit !== undefined
        && (eventData as any).ceremony_guest_limit !== currentEvent?.ceremony_guest_limit;
      if (changesGuestLimit || changesCeremonyLimit) {
        const validation = await getEventGuestLimitValidation(id);
        assertEventGuestLimitChange(
          validation,
          changesGuestLimit ? eventData.guest_limit : undefined,
          changesCeremonyLimit ? (eventData as any).ceremony_guest_limit : undefined,
        );
      }
      const { data: updatedRow, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!updatedRow) throw new Error('The event was not found or you do not have permission to update it.');

      setEvents((currentEvents) => {
        const nextEvents = currentEvents.map((event) => event.id === id ? { ...event, ...eventData } : event);
        const cacheUserId = getCacheUserId();
        if (cacheUserId) eventsCache = { userId: cacheUserId, events: nextEvents };
        return nextEvents;
      });
      if ('event_image_path' in eventData) {
        try { await syncEventHeroImage(id); }
        catch {
          toast({ title: 'Event image saved', description: 'The guest-app image could not be synced. Open QR Code Seating Chart to retry.', variant: 'destructive' });
          return;
        }
      }
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
    } catch (error) {
      console.error('Error updating event:', error);
      const capacityError = error instanceof GuestCapacityError
        ? error
        : getGuestCapacityMutationError(error);
      toast({
        title: capacityError ? 'Guest limit not updated' : 'Event not updated',
        description: capacityError?.message
          ?? (error instanceof Error ? error.message : 'The event could not be updated. Please try again.'),
        variant: "destructive",
      });
      throw capacityError ?? error;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new EventDeletionError('not-authenticated', 'User not authenticated.');
      }

      const { data: membership } = await supabase
        .from('account_members' as any)
        .select('role')
        .eq('member_user_id', authUser.id)
        .order('invited_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if ((membership as any)?.role === 'standard') {
        throw new EventDeletionError('not-authorized', 'Only the Master Account Holder can delete events.');
      }

      const deleted = await deleteOwnedEventWithImage(id, authUser.id);
      const remainingEvents = events.filter((event) => event.id !== deleted.id);
      const userId = getCacheUserId();
      if (userId) eventsCache = { userId, events: remainingEvents };
      setEvents(remainingEvents);
      clearEventCaches(deleted.id);

      const replacementId = remainingEvents[0]?.id ?? null;
      if (activeEventId === deleted.id) {
        setActiveEventId(replacementId);
        void updateDisplayCountdownEvent(replacementId);
      }
      if (getSelectedEventId() === deleted.id) {
        setSelectedEventId(replacementId);
      }

      notifyEventDeleted(deleted.id, deleted.user_id, replacementId);
      await fetchEvents();

      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
      return deleted;
    } catch (error) {
      console.error('Event deletion failed', {
        eventId: id,
        reason: error instanceof EventDeletionError ? error.reason : 'unexpected',
        code: error instanceof EventDeletionError ? error.code : undefined,
      });
      toast({
        title: "Error",
        description: getEventDeletionMessage(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    let realtimeCleanup: (() => void) | null = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // If not authenticated, ensure we don't get stuck loading
      if (!user) {
        setEvents([]);
        setActiveEventId(null);
        setLoading(false);
        setLoaded(false);
        return;
      }

      // Dashboard consumers receive this from AuthenticatedSessionProvider.
      // Keep this fallback for isolated authenticated tools that mount this
      // hook directly; getUser is an authenticated server-backed identity read.
      if (getCacheUserId() !== user.id) {
        clearAllCaches();
        setCacheUserId(user.id);
      }

      // A sibling dashboard tool may mount its own consumer while the shared
      // authenticated shell is already warm. Reuse the account-scoped cache in
      // that case instead of issuing the same two event requests again.
      const cached = getCachedEvents();
      if (cached !== null) {
        setEvents(cached);
        setLoaded(true);
        setLoading(false);
      } else {
        void fetchEvents();
      }

      // Set up realtime subscription for this user's events (channel name unique per user to avoid collisions on remounts)
      const channel = supabase
        .channel(`events-changes:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Refetch when any change occurs
            fetchEvents();
          }
        )
        .subscribe();

      realtimeCleanup = () => {
        supabase.removeChannel(channel);
      };
    };

    void init();

    // Auth listener: refetch on login, clear on logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        if (getCacheUserId() !== session.user.id) {
          clearAllCaches();
          setCacheUserId(session.user.id);
        }
        // Defer Supabase calls to avoid deadlocks
        setTimeout(() => {
          if (event !== 'TOKEN_REFRESHED' && getCachedEvents() === null) void fetchEvents();
        }, 0);
      } else {
        setEvents([]);
        setActiveEventId(null);
        setLoading(false);
        setCacheUserId(null);
        // Clear all module-level caches and global selection
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('ww:auth-cleared'));
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeCleanup) realtimeCleanup();
    };
  }, []);

  // A confirmed plan upgrade can change saved event guest caps on the server.
  useEffect(() => {
    const refresh = () => { void fetchEvents(); };
    window.addEventListener(PLAN_ENTITLEMENT_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(PLAN_ENTITLEMENT_CHANGED_EVENT, refresh);
  }, []);

  // Reload every mounted collection after creation.
  useEffect(() => {
    const created = (event: globalThis.Event) => {
      const detail = (event as CustomEvent<EventCreatedDetail>).detail;
      if (!detail?.userId || detail.userId !== getCacheUserId()) return;
      // Keep selection recovery paused until the new event can be resolved.
      setLoaded(false); setLoading(true);
      void fetchEvents();
    };
    window.addEventListener(EVENT_CREATED_EVENT, created);
    return () => window.removeEventListener(EVENT_CREATED_EVENT, created);
  }, []);

  // Synchronize every mounted useEvents collection after a confirmed deletion.
  useEffect(() => {
    const handleEventDeleted = (event: globalThis.Event) => {
      const detail = (event as CustomEvent<{ eventId: string; replacementId: string | null }>).detail;
      const deletedId = detail?.eventId;
      if (!deletedId) return;
      setEvents((currentEvents) => {
        const remainingEvents = currentEvents.filter((item) => item.id !== deletedId);
        const userId = getCacheUserId();
        if (userId) eventsCache = { userId, events: remainingEvents };
        return remainingEvents;
      });
      setActiveEventId((currentId) => currentId === deletedId ? detail.replacementId : currentId);
    };
    window.addEventListener(EVENT_DELETED_EVENT, handleEventDeleted);
    return () => window.removeEventListener(EVENT_DELETED_EVENT, handleEventDeleted);
  }, []);

  // Initialize activeEventId from profile or auto-select first event
  useEffect(() => {
    if (!profile || events.length === 0 || !loaded || loading) return;

    // My Events has its own countdown selector. Preserve the completed setup
    // selection while the shared profile refresh still contains the old ID.
    if (createdEventSelection?.userId === getCacheUserId() && events.some(event => event.id === createdEventSelection.eventId)) {
      setActiveEventId(createdEventSelection.eventId);
      if (profile.display_countdown_event_id === createdEventSelection.eventId) createdEventSelection = null;
      return;
    }
    
    // If profile has a saved display_countdown_event_id and it exists in events, use it
    if (profile.display_countdown_event_id) {
      const savedEvent = events.find(e => e.id === profile.display_countdown_event_id);
      if (savedEvent) {
        setActiveEventId(savedEvent.id);
        return;
      }
    }
    
    // Otherwise, auto-select first event and save it
    if (!activeEventId && events.length > 0) {
      const firstEvent = events[0];
      setActiveEventId(firstEvent.id);
      updateDisplayCountdownEvent(firstEvent.id);
    }
  }, [events, profile, activeEventId, updateDisplayCountdownEvent, loaded, loading]);

  return {
    events,
    loading,
    loaded,
    activeEventId,
    setActiveEventId: setActiveEventIdWithPersistence,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch: fetchEvents,
  };
};
