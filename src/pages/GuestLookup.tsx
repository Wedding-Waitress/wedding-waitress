import { useGuestVerification } from '@/hooks/useGuestVerification';
import { preloadVideoWishesRoute } from '@/lib/guestRoutePreload';
import { GuestVerificationGate } from '@/components/GuestLookup/GuestVerificationGate';
import { publicGuestVerificationRows } from '@/i18n/publicGuestVerificationCopy';
import { useMobileGuestSearchViewport } from '@/hooks/useMobileGuestSearchViewport';
import { useGuestSearchResultReveal } from '@/hooks/useGuestSearchResultReveal';
import { useQrGuestTheme } from '@/hooks/useQrGuestTheme';
import { shareGuestLookup } from '@/lib/guestLookupShare';
import {useVideoWishesCopy} from '@/i18n/useVideoWishesCopy';
import { useTranslation } from 'react-i18next';
import { GuestSeatingResult } from '@/components/GuestLookup/GuestSeatingResult';
import { publicGuestSeatingRows } from '@/i18n/publicGuestSeatingCopy';
import { publicGuestSearchRows } from '@/i18n/publicGuestSearchCopy';
import { publicGuestLoadingRows } from '@/i18n/publicGuestLoadingCopy';
import { eventCalendarDayDistance, isInitialSearchAvailable, matchesGuestSearch } from '@/lib/guestNameSearch';
import { ResponsiveWelcomeVideo } from '@/components/GuestLookup/ResponsiveWelcomeVideo';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { loadGoogleFont } from '@/lib/googleFonts';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Users,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  User,
  Eye,
  Smartphone,
  Share2,
  Mail,
  Video,
  UtensilsCrossed,
  Music2,
  MailOpen,
  PlayCircle,
  LayoutGrid,
  Home,
  Hourglass
} from 'lucide-react';
import weddingWaitressFooterLogo from '@/assets/wedding-waitress-brown-logo.png';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {useGuestExperienceClient,useGuestExperiencePreview} from '@/contexts/GuestExperiencePreviewContext';
import { useToast } from '@/hooks/use-toast';
import { EnhancedGuestCard } from '@/components/GuestLookup/EnhancedGuestCard';
import { normalizeRsvp } from '@/lib/rsvp';
import { formatDisplayTime } from '@/lib/utils';
import { TableVisualization } from '@/components/GuestLookup/TableVisualization';
import { GuestProfileModal } from '@/components/GuestLookup/GuestProfileModal';
import { GuestUpdateModal } from '@/components/GuestLookup/GuestUpdateModal';
import { GuestSongRequestsModal } from '@/components/GuestLookup/GuestSongRequestsModal';
import { ReadOnlyCeremonyFloorPlan } from '@/components/GuestView/ReadOnlyCeremonyFloorPlan';
import { ReadOnlyReceptionFloorPlan } from '@/components/GuestView/ReadOnlyReceptionFloorPlan';
import { PublicAddGuestModal } from '@/components/GuestLookup/PublicAddGuestModal';
import styles from './GuestLookup.module.css';
import { resolveWelcomeVideoUrl } from '@/lib/liveViewMediaConfig';

interface Guest {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  table_no: number | null;
  table_id: string | null;
  seat_no?: number | null;
  relation_display?: string;
  rsvp: string;
  dietary?: string;
  mobile?: string;
  email?: string;
  notes?: string;
  family_group?: string;
  table_name?: string;
  table_limit_seats?: number;
  allow_plus_one?: boolean;
}

interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  partner1_name: string | null;
  partner2_name: string | null;
  rsvp_deadline?: string | null;
  start_time?: string | null;
  finish_time?: string | null;
  event_timezone?: string | null;
  ceremony_venue?: string | null;
  ceremony_start_time?: string | null;
  ceremony_finish_time?: string | null;
}

// Helper component to fetch and render existing ceremony floor plan
const ExistingFloorPlanView: React.FC<{
  eventSlug: string | undefined;
  ceremonyFloorPlan: any;
  setCeremonyFloorPlan: (v: any) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  fetched: boolean;
  setFetched: (v: boolean) => void;
}> = ({ eventSlug, ceremonyFloorPlan, setCeremonyFloorPlan, loading, setLoading, fetched, setFetched }) => {
  const supabase=useGuestExperienceClient();
  React.useEffect(() => {
    if (fetched || !eventSlug) return;
    setLoading(true);
    setFetched(true);
    supabase.rpc('get_public_ceremony_floor_plan', { event_slug: eventSlug })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setCeremonyFloorPlan(data[0]);
        }
        setLoading(false);
      });
  }, [eventSlug, fetched]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!ceremonyFloorPlan) {
    return (
      <div className="text-center py-8">
        <MapPin className="w-16 h-16 mx-auto text-white/70 mb-4" />
        <p className="text-white/70 text-lg">No floor plan configured yet.</p>
      </div>
    );
  }

  return <ReadOnlyCeremonyFloorPlan data={ceremonyFloorPlan} />;
};

export const GuestLookup: React.FC = () => {
  const preview=useGuestExperiencePreview();
  const supabase=useGuestExperienceClient();
  useQrGuestTheme();
  useMobileGuestSearchViewport();
  const { eventSlug: publicEventSlug } = useParams<{ eventSlug: string }>();
  const eventSlug = preview?.snapshot.event.slug || publicEventSlug;
  const [searchParams] = useSearchParams();
  const navigateWishes=useNavigate();
  const {copy:wishesCopy}=useVideoWishesCopy();
  const [wishesEnabled,setWishesEnabled]=useState(false);
  const inviteToken = preview ? null : searchParams.get('invite')?.trim() || null;
  const isRecipientInvitation = Boolean(inviteToken);
  const [recipientGuestId, setRecipientGuestId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSearchGuestId, setSelectedSearchGuestId] = useState<string | null>(null);
  const [searchClock, setSearchClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setSearchClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const verification = useGuestVerification(event?.id);
  const verifiedGuests = useMemo(() => guests.map(guest => verification.party.find(member => member.id === guest.id) || guest), [guests, verification.party]);
  useEffect(()=>{let active=true;setWishesEnabled(false);if(event?.id)(supabase as any).rpc('video_wishes_available',{_event_id:event.id}).then(({data}:any)=>{if(active)setWishesEnabled(data===true);});return()=>{active=false;};},[event?.id]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const { i18n } = useTranslation();
  const loadLanguage = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const loadCopy = publicGuestLoadingRows[loadLanguage] || publicGuestLoadingRows.en;
  const searchCopy = publicGuestSearchRows[loadLanguage] || publicGuestSearchRows.en;
  const verificationCopy = publicGuestVerificationRows[loadLanguage] || publicGuestVerificationRows.en;
  const seatingCopy = publicGuestSeatingRows[loadLanguage] || publicGuestSeatingRows.en;
  const guestRefreshVersion = useRef(0);
  const searching = false; // Matching uses the already-loaded public guest data.
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [inlineDirty, setInlineDirty] = useState(false);
  const [dismissRequest, setDismissRequest] = useState(0);
  const [videoNavigationPending, setVideoNavigationPending] = useState(false);
  const consumedInlineQuery = useRef('');
  const [isSongRequestsModalOpen, setIsSongRequestsModalOpen] = useState(false);
  const [songRequestGuestId, setSongRequestGuestId] = useState<string | null>(null);
  const [activeTab, setActiveTabState] = useState('search');
  const tableTabRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchInstructionId = React.useId();
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    if (tab === 'visualization') {
      setTimeout(() => {
        tableTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, []);
  const returnToSearch = useCallback(() => {
    setActiveTab('search');
    window.setTimeout(() => {
      searchInputRef.current?.scrollIntoView({ behavior: window.matchMedia('(max-width: 767px)').matches ? 'auto' : 'smooth', block: window.matchMedia('(max-width: 767px)').matches ? 'start' : 'center' });
      searchInputRef.current?.focus({ preventScroll: true });
    }, 50);
  }, [setActiveTab]);
  const [liveViewSettings, setLiveViewSettings] = useState<any>(null);
  const [moduleSettings, setModuleSettings] = useState<any>(null);
  const [songRequestSettings, setSongRequestSettings] = useState<{ enabled: boolean; max_requests_per_guest: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showRsvpInviteModal, setShowRsvpInviteModal] = useState(false);
  const [showWelcomeVideoModal, setShowWelcomeVideoModal] = useState(false);
  const [showFloorPlanModal, setShowFloorPlanModal] = useState(false);
  const [showReceptionFloorPlanModal, setShowReceptionFloorPlanModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const goHome = () => {
    setShowRsvpInviteModal(false);
    setShowWelcomeVideoModal(false);
    setShowFloorPlanModal(false);
    setShowReceptionFloorPlanModal(false);
    setShowMenuModal(false);
    returnToSearch();
  };
  const homeButton = (
    <Button type="button" onClick={goHome} className={styles.guestHomeButton}>
      <Home aria-hidden="true" className="h-4 w-4" />
      Home
    </Button>
  );
  const [ceremonyFloorPlan, setCeremonyFloorPlan] = useState<any>(null);
  const [ceremonyFloorPlanLoading, setCeremonyFloorPlanLoading] = useState(false);
  const [ceremonyFloorPlanFetched, setCeremonyFloorPlanFetched] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [addGuestForId, setAddGuestForId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load Great Vibes font for event name
  useEffect(() => { loadGoogleFont('Great Vibes'); }, []);

  // Compute is_editable based on rsvp_deadline (inclusive through end-of-day)
  const isEditable = useMemo(() => {
    if (!event?.rsvp_deadline) return true; // NULL deadline = always editable

    // Parse the deadline and set to end of day (23:59:59.999)
    const deadline = new Date(event.rsvp_deadline);
    deadline.setHours(23, 59, 59, 999);

    const now = new Date();
    return now <= deadline;
  }, [event?.rsvp_deadline]);

  // 7-day auto-protection window: true when event.date is today or within the next 7 calendar days
  // (timezone-aware via the event's configured timezone). Past events do not trigger this.
  const isWithin7DayAutoProtection = useMemo(() => {
    if (preview) return preview.mode === 'seating';
    if (!event?.date) return false;
    const tz = verification.eventTimezone || 'Australia/Sydney';
    const distance = eventCalendarDayDistance(event.date, tz, new Date(searchClock));
    return distance !== null && distance >= 0 && distance <= 7;
  }, [event?.date, event?.event_timezone, searchClock, preview]);

  // Per-action overrides stored inside rsvp_invite_config JSON (no DB schema change).
  // Default OFF — when in 7-day window, actions are hidden unless organiser flips ON.
  const overrideRsvp = !!moduleSettings?.rsvp_invite_config?.rsvp_override_auto_lock;
  const overridePlusOne = !!moduleSettings?.rsvp_invite_config?.plus_one_override_auto_lock;
  const overrideUpdateDetails = !!moduleSettings?.rsvp_invite_config?.update_details_override_auto_lock;

  const showRsvpButtons = !isWithin7DayAutoProtection || overrideRsvp;
  const showAddPlusOne = !isWithin7DayAutoProtection || overridePlusOne;
  const showUpdateDetails = verification.phase === 'invitation';


  // Auto-detect event day to switch header wording
  const isEventDay = useMemo(() => {
    if (!event?.date) return false;
    const tz = verification.eventTimezone || 'Australia/Sydney';
    return eventCalendarDayDistance(event.date, tz, new Date(searchClock)) === 0;
  }, [event?.date, event?.event_timezone, searchClock]);

  // The server's event-local clock determines the inclusive seven-day boundary.
  const isOpenSearchMode = verification.phase === 'seating';
  // Check for tab parameter in URL - default to search
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    // Only allow valid tabs: 'search' or 'visualization'
    if (tabParam === 'visualization') {
      setActiveTab('visualization');
    } else {
      setActiveTab('search');
    }
  }, []);

  // Handle deep-link for editing a specific guest (?edit=<guest_id>)
  useEffect(() => {
    if (guests.length === 0 || !isEditable || !showUpdateDetails || isOpenSearchMode) return;

    const params = new URLSearchParams(window.location.search);
    const editGuestId = params.get('edit');

    if (editGuestId) {
      const guestToEdit = guests.find(g => g.id === editGuestId);
      if (guestToEdit && verification.verifiedFor(guestToEdit.id)) {
        setSelectedGuest(guestToEdit);
        setIsUpdateModalOpen(true);

        // Clean up URL parameter after opening modal
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('edit');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [guests, isEditable, showUpdateDetails, isOpenSearchMode, verification.token, verification.party]);

  // Fetch event and guests data using public RPC function
  useEffect(() => {
    let cancelled = false;
    const lookupControllers = new Set<AbortController>();
    const withLookupTimeout = async <T,>(request: (signal: AbortSignal) => PromiseLike<T>): Promise<T> => {
      const controller = new AbortController();
      lookupControllers.add(controller);
      let timeout: number;
      const deadline = new Promise<never>((_, reject) => {
        timeout = window.setTimeout(() => {
          reject(new Error('Event lookup timed out'));
          controller.abort();
        }, 15_000);
      });
      try {
        // Abort alone cannot settle a request waiting on auth/session initialization.
        return await Promise.race([Promise.resolve().then(() => request(controller.signal)), deadline]);
      } finally {
        window.clearTimeout(timeout);
        lookupControllers.delete(controller);
      }
    };

    const fetchEventData = async () => {
      if (!eventSlug) return;

      ++guestRefreshVersion.current;
      setLoading(true);
      setLoadFailed(false);
      setEvent(null);
      setGuests([]);
      setRecipientGuestId(null);
      try {
        // Use the new public RPC function that bypasses RLS
        const { data: publicData, error: rpcError } = await withLookupTimeout(signal => supabase
          .rpc('qr_guest_public_event', { event_slug: eventSlug, access_token: null })
          .abortSignal(signal));

        if (cancelled) return;

        if (rpcError) throw rpcError;

        if (!publicData || publicData.length === 0) {
          toast({
            title: "Event Not Found",
            description: "The requested event could not be found.",
            variant: "destructive",
          });
          setEvent(null);
          return;
        }

        // Extract event data from first row
        const firstRow = publicData[0];

        const eventData = {
              id: firstRow.event_id,
              name: firstRow.event_name,
              date: firstRow.event_date,
              venue: firstRow.event_venue,
              partner1_name: firstRow.partner1_name,
              partner2_name: firstRow.partner2_name,
              start_time: firstRow.event_start_time,
              finish_time: firstRow.event_finish_time,
              event_timezone: (firstRow as any).event_timezone ?? null,
              ceremony_venue: (firstRow as any).ceremony_venue ?? null,
              ceremony_start_time: (firstRow as any).ceremony_start_time ?? null,
              ceremony_finish_time: (firstRow as any).ceremony_finish_time ?? null,
              allow_guest_plus_ones: !!(firstRow as any).event_allow_guest_plus_ones,
              collect_guest_addresses: !!(firstRow as any).event_collect_guest_addresses,
            };
        setEvent(eventData);

        // Song request settings are fetched by a dedicated effect keyed on event.id



        // Transform guest data
        const transformedGuests = publicData
          .filter(row => row.guest_id) // Only include rows with guest data
          .map(row => ({
            id: row.guest_id,
            event_id: firstRow.event_id,
            user_id: '', // Not available in public view
            first_name: row.guest_first_name,
            last_name: row.guest_last_name,
            table_id: row.guest_table_id,
            table_no: row.guest_table_no,
            seat_no: row.guest_seat_no,
            rsvp_date: null,
            assigned: !!row.guest_table_no,
            rsvp: normalizeRsvp(row.guest_rsvp),
            dietary: row.guest_dietary,
            mobile: null,
            email: null,
            notes: null,
            relation_partner: '',
            relation_role: '',
            relation_display: '',
            created_at: '',
            display_order: null,
            family_group: (row as any).guest_family_group || null,
            added_by_guest_id: (row as any).guest_added_by_guest_id || null,
            allow_plus_one: (row as any).guest_allow_plus_one ?? true,
            mailing_address: (row as any).guest_mailing_address || null,
            mailing_suburb: (row as any).guest_mailing_suburb || null,
            mailing_state: (row as any).guest_mailing_state || null,
            mailing_postcode: (row as any).guest_mailing_postcode || null,
            address_received: !!(row as any).guest_address_received,
          }));

        setGuests(transformedGuests);

        if (inviteToken) {
          const { data: tokenGuest, error: tokenError } = await withLookupTimeout<{ data: { guest_id: string }[] | null; error: unknown }>(signal => (supabase as any)
            .rpc('qr_guest_invite_recipient', { _access_token: inviteToken })
            .abortSignal(signal));
          if (cancelled) return;
          const recipientId = tokenGuest?.[0]?.guest_id;
          if (tokenError) throw tokenError;
          if (!recipientId || !transformedGuests.some((guest) => guest.id === recipientId)) {
            setEvent(null);
            return;
          }
          const recipient = transformedGuests.find((guest) => guest.id === recipientId)!;
          setRecipientGuestId(recipientId);
          setSearchTerm(`${recipient.first_name} ${recipient.last_name}`.trim());
          setSelectedSearchGuestId(recipientId);
        }

        // Extract live view settings from RPC response (already fetched securely)
        if (firstRow) {
          setLiveViewSettings({
            show_rsvp_invite: firstRow.show_rsvp_invite || false,
            show_welcome_video: firstRow.show_welcome_video || false,
            show_floor_plan: firstRow.show_floor_plan || false,
            show_menu: firstRow.show_menu || false,
            show_reception_floor_plan: (firstRow as any).show_reception_floor_plan || false,
          });
          setModuleSettings({
            rsvp_invite_config: firstRow.rsvp_invite_config || null,
            welcome_video_config: firstRow.welcome_video_config || null,
            floor_plan_config: firstRow.floor_plan_config || null,
            menu_config: firstRow.menu_config || null,
            hero_image_config: firstRow.hero_image_config || null,
            reception_floor_plan_config: (firstRow as any).reception_floor_plan_config || null,
          });
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching event data:', error);
        setEvent(null);
        setRecipientGuestId(null);
        setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchEventData();
    return () => {
      cancelled = true;
      ++guestRefreshVersion.current;
      lookupControllers.forEach(controller => controller.abort());
      lookupControllers.clear();
    };
  }, [eventSlug, inviteToken, toast, loadAttempt]);

  // Normalise input for strict matching (trim, lowercase, collapse whitespace)
  const normalize = (str: string) => str.trim().toLowerCase().replace(/\s+/g, ' ');

  const searchCandidates = useMemo(() => verifiedGuests.filter(guest =>
    matchesGuestSearch(guest, searchTerm, isOpenSearchMode)
  ), [verifiedGuests, searchTerm, isOpenSearchMode]);
  const filteredGuests = useMemo(() => isOpenSearchMode
    ? searchCandidates.filter(guest => guest.id === selectedSearchGuestId)
    : selectedSearchGuestId ? searchCandidates.filter(guest => guest.id === selectedSearchGuestId) : searchCandidates, [searchCandidates, selectedSearchGuestId, isOpenSearchMode]);
  const searchInstruction = isOpenSearchMode ? searchCopy[1] : (!moduleSettings?.update_details_config?.search_placeholder || /^Type your full first and last name(?:\.{3}|…)?$/i.test(moduleSettings.update_details_config.search_placeholder.trim())) ? searchCopy[0] : moduleSettings.update_details_config.search_placeholder;
  useGuestSearchResultReveal(searchInputRef, searchResultsRef, searchTerm, searchCandidates[0]?.id,
    activeTab === 'search' && !selectedSearchGuestId && (isOpenSearchMode || searchCandidates.length > 1));
  // Dedicated fetch for Guest Song Request settings, keyed on event.id so the
  // public Live View always loads it reliably (decoupled from the main event RPC).
  useEffect(() => {
    if (!event?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc(
          'get_guest_song_request_settings_public',
          { _event_id: event.id }
        );
        if (cancelled) return;
        if (error) {
          setSongRequestSettings({ enabled: false, max_requests_per_guest: 0 });
          return;
        }
        if (Array.isArray(data) && data.length > 0) {
          setSongRequestSettings({
            enabled: !!data[0].enabled,
            max_requests_per_guest: Number(data[0].max_requests_per_guest) || 2,
          });
        } else {
          setSongRequestSettings({ enabled: false, max_requests_per_guest: 0 });
        }
      } catch {
        if (!cancelled) setSongRequestSettings({ enabled: false, max_requests_per_guest: 0 });
      }
    })();
    return () => { cancelled = true; };
  }, [event?.id]);


  // Desktop may reveal results; mobile keeps the name field visible while typing.
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) return;
    if (searchTerm.length >= 2 && filteredGuests.length > 0 && (selectedSearchGuestId || (!isOpenSearchMode && filteredGuests.length === 1))) {
      const t = setTimeout(() => {
        searchResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [selectedSearchGuestId, isOpenSearchMode, filteredGuests.length]);

  const handleSearchChange = (value: string) => {
    consumedInlineQuery.current = '';

    setSearchTerm(value);
    setSelectedSearchGuestId(null);

  };

  const refreshGuestData = async () => {
    if (!eventSlug) return;
    const refreshVersion = ++guestRefreshVersion.current;
    void verification.refresh();

    try {
      console.log('🔄 Live View: Manually refreshing guest data...');
      // Use the same public RPC function for refreshing data
      const { data: publicData, error: rpcError } = await supabase.rpc(
        'qr_guest_public_event',
        { event_slug: eventSlug, access_token: null }
      );

      if (refreshVersion !== guestRefreshVersion.current) return;
      if (!rpcError && publicData) {
        // Transform guest data
        const transformedGuests = publicData
          .filter(row => row.guest_id) // Only include rows with guest data
          .map(row => ({
            id: row.guest_id,
            event_id: event?.id || '',
            user_id: '', // Not available in public view
            first_name: row.guest_first_name,
            last_name: row.guest_last_name,
            table_id: row.guest_table_id,
            table_no: row.guest_table_no,
            seat_no: row.guest_seat_no,
            rsvp_date: null,
            assigned: !!row.guest_table_no,
            rsvp: normalizeRsvp(row.guest_rsvp),
            dietary: row.guest_dietary,
            mobile: null,
            email: null,
            notes: null,
            relation_partner: '',
            relation_role: '',
            relation_display: '',
            created_at: '',
            display_order: null,
            family_group: (row as any).guest_family_group || null,
            added_by_guest_id: (row as any).guest_added_by_guest_id || null,
            allow_plus_one: (row as any).guest_allow_plus_one ?? true,
          }));

        setGuests(transformedGuests);
        if (publicData[0]) {
          const firstRow = publicData[0];
          setLiveViewSettings({
            show_rsvp_invite: firstRow.show_rsvp_invite || false,
            show_welcome_video: firstRow.show_welcome_video || false,
            show_floor_plan: firstRow.show_floor_plan || false,
            show_menu: firstRow.show_menu || false,
            show_reception_floor_plan: (firstRow as any).show_reception_floor_plan || false,
          });
          setModuleSettings({
            rsvp_invite_config: firstRow.rsvp_invite_config || null,
            welcome_video_config: firstRow.welcome_video_config || null,
            floor_plan_config: firstRow.floor_plan_config || null,
            menu_config: firstRow.menu_config || null,
            hero_image_config: firstRow.hero_image_config || null,
            reception_floor_plan_config: (firstRow as any).reception_floor_plan_config || null,
          });
        }
        setLastUpdated(new Date());
        console.log('✅ Live View: Guest data refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Live View: Error refreshing guest data:', error);
    }
  };

  // Poll the sanitized public API; never subscribe this guest page to raw private guest rows.
  useEffect(() => {
    if (!event?.id) return;
    const timer = window.setInterval(() => { if (!document.hidden) void refreshGuestData(); }, 30000);
    return () => window.clearInterval(timer);
  }, [event?.id, eventSlug, verification.token]);

  // Add visibility change handler to refresh data when tab becomes visible (cache busting)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && event?.id) {
        console.log('👁️ Live View: Tab became visible, refreshing data...');
        refreshGuestData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [event?.id, eventSlug, inviteToken]);

  const handleEditGuest = (guest: Guest) => {
    if (isOpenSearchMode) return;
    if (!verification.verifiedFor(guest.id)) return;
    setSelectedGuest(guest);
    setIsUpdateModalOpen(true);
  };

  useEffect(() => {
    const query = normalize(searchTerm);
    if (!query) { consumedInlineQuery.current = ''; return; }
    if (isOpenSearchMode || !isEditable || !showUpdateDetails || isUpdateModalOpen || activeTab !== 'search' || !query.includes(' ') || filteredGuests.length !== 1 || (searchCandidates.length !== 1 && !selectedSearchGuestId)) return;
    const match = filteredGuests[0];
    if (!verification.verifiedFor(match.id)) return;
    const key = query + ':' + match.id;
    if (consumedInlineQuery.current === key) return;
    consumedInlineQuery.current = key; setSelectedGuest(match); setIsUpdateModalOpen(true);
  }, [searchTerm, filteredGuests, searchCandidates.length, selectedSearchGuestId, isOpenSearchMode, isEditable, showUpdateDetails, isUpdateModalOpen, activeTab, verification.token, verification.party]);
  useEffect(() => {
    if (!verification.token || isOpenSearchMode) { setIsUpdateModalOpen(false); setSelectedGuest(null); setInlineDirty(false); consumedInlineQuery.current = ''; }
  }, [verification.token, isOpenSearchMode]);
  const navigateToVideoWishes = () => !preview && navigateWishes('/s/'+encodeURIComponent(eventSlug||'')+'/video-wishes',{state:{videoWishesInvite:inviteToken}});
  const closeInlineEditor = (next: boolean) => {
    setIsUpdateModalOpen(next);
    if (!next) { setInlineDirty(false); if (videoNavigationPending) { setVideoNavigationPending(false); navigateToVideoWishes(); } }
  };
  const openVideoWishes = () => {
    if(preview){toast({title:'Organiser preview',description:'Recording and guest submissions are unavailable in this read-only preview.'});return;}
    if (isUpdateModalOpen && inlineDirty) { setVideoNavigationPending(true); setDismissRequest(value=>value+1); return; }
    navigateToVideoWishes();
  };

  const handleAddGuest = (guest: Guest) => {
    setSelectedGuest(guest);
    setAddGuestForId(guest.id);
    setShowAddGuestModal(true);
  };

  const openSongRequests = () => {
    if(preview){toast({title:'Organiser preview',description:'Guest song submissions are unavailable in this read-only preview.'});return;}
    if (!songRequestSettings?.enabled || songRequestSettings.max_requests_per_guest < 1) return;
    const recipient = recipientGuestId ? guests.find(guest => guest.id === recipientGuestId) : null;
    const searchedGuest = !searching && filteredGuests.length === 1 ? filteredGuests[0] : null;
    const requestGuest = recipient || searchedGuest;
    if (requestGuest) {
      setSongRequestGuestId(requestGuest.id);
      setIsSongRequestsModalOpen(true);
      return;
    }
    setActiveTab('search');
    toast({ title: searchCopy[3], description: searchCopy[4] });
    window.setTimeout(() => searchInputRef.current?.focus({ preventScroll: true }), 50);
  };

  // Install PWA prompt
  useEffect(() => {
    let deferredPrompt: any;

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      deferredPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (loading) {
    return (
      <div className={`${styles.mainSurface} ${styles.statePage} ww-application-background ww-dark-surface min-h-screen flex items-center justify-center p-4`}>
        <Card className={`${styles.stateCard} ww-box w-full max-w-md`}>
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white">Loading event details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`${styles.mainSurface} ${styles.statePage} ww-application-background ww-dark-surface min-h-screen flex items-center justify-center p-4`}>
        <Card className={`${styles.stateCard} ww-box w-full max-w-md`}>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <CardTitle className={`${styles.sectionHeading} mb-2`}>{loadFailed ? loadCopy[0] : "Event Not Found"}</CardTitle>
            <CardDescription>
              {loadFailed ? loadCopy[1] : "The requested event could not be found. Please check the QR code or contact the event organiser."}
            </CardDescription>
            {loadFailed && <Button type="button" onClick={() => { setLoading(true); setLoadAttempt(attempt => attempt + 1); }}>{loadCopy[2]}</Button>}
          </CardContent>
        </Card>
      </div>
    );
  }

  const heroImageUrl = moduleSettings?.hero_image_config?.enabled === false ? null : moduleSettings?.hero_image_config?.file_url;
  const welcomeVideoUrl = resolveWelcomeVideoUrl(moduleSettings?.welcome_video_config);

  return (
    <div data-qr-guest-page className={`${styles.mainSurface} ${styles.page} ww-application-background ww-dark-surface min-h-screen font-inter`}>
      {/* Hero Section */}
      <div data-has-hero-photo={!!heroImageUrl} className={`${styles.heroShell} relative`}>
        {heroImageUrl ? (
          <div className="relative">
            <img
              src={heroImageUrl}
              alt="Event hero"
              className="w-full h-auto block"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className={`${styles.heroTitleGroup} text-center text-white`}>
                <p className={styles.invitationEyebrow}>
                  You're Invited
                </p>
                <h1 className={styles.invitationEventName}>
                  {event.name.replace(/\band\b/gi, '&')}
                </h1>
              </div>
            </div>
          </div>
        ) : (
          <div className={`${styles.fallbackHero} text-white`}>
            <img src="/wedding-waitress-favicon-source.png" alt="" aria-hidden="true" className={styles.fallbackBrandMark} />
            <div className="w-full px-4 pt-16 pb-16 md:pt-24 md:pb-24">
              <div className={`${styles.heroTitleGroup} text-center`}>
                <p className={styles.invitationEyebrow}>
                  You're Invited
                </p>
                <div className="flex items-center justify-center mb-4">
                  <h1 className={styles.invitationEventName}>
                    {event.name.replace(/\band\b/gi, '&')}
                  </h1>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Date, Venue & Countdown - between hero and buttons */}
      <div className={`${styles.eventDetails} w-full py-4 px-4`}>
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <div data-live-body className="flex items-center justify-center text-foreground text-sm md:text-base font-medium">
            <Calendar className="w-4 h-4 mr-2 text-primary" />
            <span>{(() => {
              const d = new Date(event.date);
              const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
              const day = d.getDate();
              const suffix = [11,12,13].includes(day) ? 'th' : ['st','nd','rd'][(day % 10) - 1] || 'th';
              const month = d.toLocaleDateString('en-US', { month: 'long' });
              const year = d.getFullYear();
              return `${dayName} ${day}${suffix} ${month} ${year}`;
            })()}</span>
          </div>
          {(() => {
            const hasCeremony = !!(event.ceremony_venue || event.ceremony_start_time || event.ceremony_finish_time);
            const formatRange = (start?: string | null, finish?: string | null) => {
              if (!start && !finish) return '';
              const parts: string[] = [];
              if (start) parts.push(formatDisplayTime(start));
              if (start && finish) parts.push('to');
              if (finish) parts.push(formatDisplayTime(finish));
              return parts.join(' ');
            };
            return (
              <>
                {hasCeremony && (
                  <div data-live-body className="flex items-start justify-center text-foreground text-sm md:text-base">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 text-primary shrink-0" />
                    <span>
                      <span className="font-semibold">Ceremony:</span>{' '}
                      {event.ceremony_venue || ''}
                      {(event.ceremony_start_time || event.ceremony_finish_time) && (
                        <span> – {formatRange(event.ceremony_start_time, event.ceremony_finish_time)}</span>
                      )}
                    </span>
                  </div>
                )}
                {event.venue && (
                  <div data-live-body className="flex items-start justify-center text-foreground text-sm md:text-base">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 text-primary shrink-0" />
                    <span>
                      {hasCeremony && <span className="font-semibold">Reception: </span>}
                      {event.venue}
                      {(event.start_time || event.finish_time) && (
                        <span> – {formatRange(event.start_time, event.finish_time)}</span>
                      )}
                    </span>
                  </div>
                )}
              </>
            );
          })()}
          {/* Countdown */}
          {(() => {
            const eventDate = new Date(event.date);
            if (event.start_time) {
              const [h, m] = event.start_time.split(':').map(Number);
              eventDate.setHours(h, m, 0, 0);
            } else {
              eventDate.setHours(0, 0, 0, 0);
            }
            const now = new Date();
            const diff = eventDate.getTime() - now.getTime();
            if (diff <= 0) return null;

            const totalHours = Math.floor(diff / (1000 * 60 * 60));
            const days = Math.floor(totalHours / 24);
            const hours = totalHours % 24;
            const years = Math.floor(days / 365);
            const remainingDaysAfterYears = days % 365;
            const months = Math.floor(remainingDaysAfterYears / 30);
            const remainingDays = remainingDaysAfterYears % 30;

            const parts: string[] = [];
            if (years > 0) parts.push(`${years} ${years === 1 ? 'Year' : 'Years'}`);
            if (months > 0) parts.push(`${months} ${months === 1 ? 'Month' : 'Months'}`);
            if (remainingDays > 0) parts.push(`${remainingDays} ${remainingDays === 1 ? 'Day' : 'Days'}`);
            if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'Hour' : 'Hours'}`);

            return (
              <p className="text-foreground font-medium text-sm md:text-base mt-1 flex items-center justify-center gap-1.5">
                <Hourglass className="h-4 w-4 text-primary" />

                {parts.join(', ')} to go
              </p>
            );
          })()}
        </div>
      </div>

      {/* Combined Feature Buttons + Tabs Section */}
      <div className={`${styles.liveContent} w-full px-4 pt-4 pb-1`}>
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
             <div
               className={`${styles.moduleTray} p-2.5 rounded-xl`}
               data-module-density="compact"
             >
              <TabsList className={`${styles.moduleGrid} grid w-full h-auto p-0 bg-transparent border-0 shadow-none gap-2 grid-cols-4`}>
                {liveViewSettings?.show_rsvp_invite && (
                  <button
                    onClick={() => setShowRsvpInviteModal(true)}
                    className={styles.moduleButton}
                  >
                    <MailOpen aria-hidden="true" />
                    <span>RSVP</span>
                  </button>
                )}
                {liveViewSettings?.show_welcome_video && (
                  <button
                    onClick={() => setShowWelcomeVideoModal(true)}
                    className={styles.moduleButton}
                  >
                    <PlayCircle aria-hidden="true" />
                    <span>Welcome</span>
                  </button>
                )}
                <TabsTrigger
                  value="visualization"
                  className={styles.moduleButton}
                >
                  <LayoutGrid aria-hidden="true" />
                  <span>Table</span>
                </TabsTrigger>

                {liveViewSettings?.show_menu && (
                  <button
                    onClick={() => setShowMenuModal(true)}
                    className={styles.moduleButton}
                  >
                    <UtensilsCrossed aria-hidden="true" />
                    <span>Menu</span>
                  </button>
                )}
                {liveViewSettings?.show_floor_plan && (
                  <button
                    onClick={() => setShowFloorPlanModal(true)}
                    className={styles.moduleButton}
                  >
                    <MapPin aria-hidden="true" />
                    <span>Ceremony Plan</span>
                  </button>
                )}
                {liveViewSettings?.show_reception_floor_plan && (
                  <button
                    onClick={() => setShowReceptionFloorPlanModal(true)}
                    className={styles.moduleButton}
                  >
                    <MapPin aria-hidden="true" />
                    <span>Reception Plan</span>
                  </button>
                )}

                {songRequestSettings?.enabled && (
                  <button onClick={openSongRequests} className={styles.moduleButton}>
                    <Music2 aria-hidden="true" />
                    <span>Song Requests</span>
                  </button>
                )}
              {wishesEnabled&&<button className={styles.moduleButton} onPointerEnter={preloadVideoWishesRoute} onPointerDown={preloadVideoWishesRoute} onFocus={preloadVideoWishesRoute} onClick={openVideoWishes}><Video aria-hidden="true"/><span>{wishesCopy.title}</span></button>}
              </TabsList>
            </div>

            <div className="pt-3">
            <TabsContent forceMount={isUpdateModalOpen ? true : undefined} hidden={activeTab !== 'search'} value="search" className="mt-0 pt-[18px]">

              <Card data-search-empty={!searchTerm.trim()} className={`${styles.searchCard} ww-box card-elevated pt-2 md:pt-2`}>
                <CardContent className={`${styles.searchCardContent} pt-2`}>
                  <div className={styles.searchArea}>
                    {/* Search Input */}
                    <p id={searchInstructionId} data-guest-search-instruction className="sr-only">{searchInstruction}</p>
                    <div className={styles.searchField}>
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-[2] pointer-events-none" />
                      <Input
                        ref={searchInputRef} data-guest-name-search disabled={isUpdateModalOpen}
                        type="text"
                        aria-label={searchCopy[2]}
                        aria-describedby={searchInstructionId}
                        placeholder={searchCopy[10]}
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="px-10 text-center text-base md:text-lg border-primary border-2 focus-visible:ring-primary"
                      />
                      <span aria-hidden="true" data-guest-search-prompt data-search-prompt-hidden={searchTerm.length > 0} className={`${styles.sectionHeading} ${styles.searchPrompt}`}>{searchCopy[10]}</span>
                    </div>

                    {/* Loading State */}
                    {searching && (
                      <div className="text-center py-4">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Searching...</p>
                      </div>
                    )}

                    {/* Search Results */}
                    {(() => {
                    if (searching || !verification.phase) return null;
                    const normalizedInput = normalize(searchTerm || '');
                    const isFullNameAttempt = normalizedInput.includes(' ');
                    // Strict mode: hide everything until a full-name attempt
                    if (!isOpenSearchMode && !isFullNameAttempt) return null;
                    // Open mode: show matching names automatically after three characters.
                    if (isOpenSearchMode && normalizedInput.length < 3) return null;

                    return (
                      <div ref={searchResultsRef} className="pt-6">
                        <div className="space-y-4 animate-fade-in">
                          {!selectedSearchGuestId && searchCandidates.length > 0 && (isOpenSearchMode || searchCandidates.length > 1) ? (
                            <div className="space-y-3 text-center">
                              <p>{isOpenSearchMode ? seatingCopy[9] : verificationCopy[9]}</p>
                              {searchCandidates.map(guest => (
                                <Button key={guest.id} data-guest-search-result className="lv-premium-btn w-full whitespace-normal h-auto min-h-10" onClick={() => {
                                  if (isOpenSearchMode) setSearchTerm(`${guest.first_name} ${guest.last_name}`.trim());
                                  setSelectedSearchGuestId(guest.id);
                                }}>
                                  {guest.first_name} {guest.last_name}
                                </Button>
                              ))}
                            </div>
                          ) : filteredGuests.length > 0 ? (
                            filteredGuests.map((guest) => (
                              <React.Fragment key={guest.id}>
                              {isOpenSearchMode ? (
                                <GuestSeatingResult guest={guest} eventId={event.id} copy={seatingCopy} />
                              ) : !verification.verifiedFor(guest.id) ? (
                                <GuestVerificationGate eventId={event.id} guestId={guest.id} fullName={`${guest.first_name} ${guest.last_name}`} copy={verificationCopy} onVerified={verification.accept} />
                              ) : (<>
                              <EnhancedGuestCard
                                guest={guest}
                                onUpdate={refreshGuestData}
                                isEditable={isEditable}
                                onAddGuest={undefined}
                                rsvpDeadline={event?.rsvp_deadline}
                                additionalGuestCount={verification.party.filter(g => g.added_by_guest_id === guest.id).length}
                                partyMembers={guest.family_group
                                  ? verification.party.filter((member) => member.family_group === guest.family_group)
                                  : [guest]}
                                showRsvpButtons={false}
                                showAddPlusOne={false}
                              />

                              </>)}
                              </React.Fragment>
                            ))
                          ) : isOpenSearchMode ? (
                            <div className="text-center py-8">
                              <AlertCircle className="w-10 h-10 md:w-12 md:h-12 mx-auto text-muted-foreground mb-3" />
                              <p className="text-muted-foreground mb-2 font-medium">No guests found</p>
                              <p className="text-sm text-muted-foreground">
                                Please check your spelling or contact event organiser for assistance
                              </p>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">
                                No match found. Please enter your full name exactly as provided.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                    })()}
      {/* Existing family editor, rendered inline beneath the Welcome summary. */}
      {!isOpenSearchMode && !!selectedGuest && verification.verifiedFor(selectedGuest.id) && filteredGuests.some(candidate => candidate.id === selectedGuest?.id) && <GuestUpdateModal
        inline onDirtyChange={setInlineDirty} dismissRequest={dismissRequest} onDismissCancel={() => setVideoNavigationPending(false)}
        editOnUpdate
        guest={selectedGuest ? {
          ...selectedGuest,
          event_id: event?.id || ''
        } : null}
        event={event}
        open={isUpdateModalOpen && !isOpenSearchMode}
        onOpenChange={closeInlineEditor}
        onUpdate={refreshGuestData}
        helperText={moduleSettings?.update_details_config?.helper_text}
        allowNameEdit={moduleSettings?.update_details_config?.allow_name_edit ?? false}
        showMessageField={moduleSettings?.update_details_config?.show_message_field ?? true}
        isEditable={!isOpenSearchMode && !!selectedGuest && verification.verifiedFor(selectedGuest.id)}
        allGuests={verification.party}
        allowRsvp={!isOpenSearchMode}
        enableGroupRsvp
        accessToken={verification.token}
        songRequestsEnabled={false}
        songRequestsMax={0}
      />}
                  </div>

                  {/* Wedding Waitress Logo - Footer */}
                  <div className={`${styles.footerLogo} flex justify-center`}>
                    <a
                      href="https://www.weddingwaitress.com.au/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={weddingWaitressFooterLogo}
                        alt="Wedding Waitress"
                        className="h-12 md:h-14 w-auto"
                      />
                    </a>
                  </div>

                  {/* Share Button */}
                  <div className={`${styles.shareInvite} flex justify-center`}>
                    <button
                      onClick={async () => {
                        try {
                          const result = await shareGuestLookup(
                            event.partner1_name && event.partner2_name ? `${event.partner1_name} & ${event.partner2_name}` : event.name,
                            window.location.href,
                          );
                          if (result === 'copied') toast({ title: searchCopy[5] });
                        } catch (error) {
                          if (error instanceof DOMException && error.name === 'AbortError') return;
                          toast({ title: searchCopy[6], variant: 'destructive' });
                        }
                      }}
                      className="lv-premium-btn flex items-center gap-2 h-[36px] px-[18px] py-0 border border-primary/40 bg-primary/10 text-primary"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="text-xs font-bold whitespace-nowrap">Share this invite</span>
                    </button>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visualization">
              <div ref={tableTabRef} className="space-y-6">
                {filteredGuests.length > 0 && searchTerm.length >= 2 && (
                  <>
                    {/* Show table visualization if guest has table assignment */}
                    {filteredGuests.some(g => g.table_id) ? (
                      <div className="grid gap-6">
                        {Array.from(new Set(filteredGuests.map(g => g.table_id))).filter(Boolean).map((tableId) => {
                          const tableGuest = filteredGuests.find(g => g.table_id === tableId);
                          return (tableGuest?.table_no || tableGuest?.table_id) ? (
                            <TableVisualization
                              navigation={homeButton}
                              key={tableId}
                              tableId={tableId!}
                              tableNumber={tableGuest.table_no || 0}
                              eventId={event.id}
                              selectedGuestId={selectedSearchGuestId ?? (filteredGuests.length === 1 ? filteredGuests[0].id : undefined)}
                            />
                          ) : null;
                        })}
                      </div>
                    ) : (
                      /* Guest found but not assigned to a table */
                      <Card className="ww-box card-elevated border-2 border-warning/30">
                        {homeButton}
                        <CardContent className="p-8 text-center">
                          <MapPin className="w-16 h-16 mx-auto text-warning mb-4" />
                          <CardTitle className={`${styles.sectionHeading} mb-2 text-lg`}>No Table Assigned Yet</CardTitle>
                          <CardDescription className="text-base">
                            You haven't been assigned to a table yet. Please check back later or contact the event organiser.
                          </CardDescription>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {(searchTerm.length < 2 || (isOpenSearchMode && searchCandidates.length > 0 && !selectedSearchGuestId)) && (
                  <Card className="ww-box card-elevated">
                    {homeButton}
                    <CardContent className="p-8 text-center">
                      <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <CardTitle className={`${styles.sectionHeading} mb-2`}>Table View</CardTitle>
                     <CardDescription className="text-base">
                        Search for your name first to see which table you are seated at and who you are sitting with.
                      </CardDescription>
                      <button
                        onClick={returnToSearch}
                        className={`${styles.tableBackButton} mt-6 mx-auto px-6 py-3 rounded-full font-semibold text-sm transition-all`}
                      >
                        Go back to search my name
                      </button>
                    </CardContent>
                  </Card>
                )}

                {searchTerm.length >= 2 && searchCandidates.length === 0 && !searching && (
                  <Card className="ww-box card-elevated">
                    {homeButton}
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <CardTitle className={`${styles.sectionHeading} mb-2`}>Guest Not Found</CardTitle>
                      <CardDescription>
                        No guest found matching your search. Please verify your name or contact the event organiser.
                      </CardDescription>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Guest Profile Modal */}
      {!preview && <GuestProfileModal
        guest={selectedGuest}
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedGuest(null);
        }}
        onUpdate={refreshGuestData}
      />}



      {!preview && <GuestSongRequestsModal
        open={isSongRequestsModalOpen}
        onOpenChange={setIsSongRequestsModalOpen}
        accessToken={inviteToken || undefined}
        guestId={songRequestGuestId || undefined}
        eventId={event?.id}
        maxRequests={songRequestSettings?.enabled ? songRequestSettings.max_requests_per_guest : 0}
      />}

      {/* Public Add Guest Modal */}
      {!preview && event?.id && (
      <PublicAddGuestModal
          open={showAddGuestModal}
          onOpenChange={(open) => { setShowAddGuestModal(open); if (!open) setAddGuestForId(null); }}
          eventId={event.id}
          onGuestAdded={refreshGuestData}
          addedByGuestId={addGuestForId || undefined}
          addedByGuestName={(() => {
            if (!addGuestForId) return undefined;
            const g = guests.find(g => g.id === addGuestForId);
            return g ? `${g.first_name} ${g.last_name || ''}`.trim() : undefined;
          })()}
          addedByGuestFamilyGroup={(() => {
            if (!addGuestForId) return undefined;
            const g = guests.find(g => g.id === addGuestForId);
            return g?.family_group || undefined;
          })()}
          addedByGuestTableId={(() => {
            if (!addGuestForId) return undefined;
            const g = guests.find(g => g.id === addGuestForId);
            return g?.table_id || undefined;
          })()}
          addedByGuestTableNo={(() => {
            if (!addGuestForId) return undefined;
            const g = guests.find(g => g.id === addGuestForId);
            return g?.table_no ?? undefined;
          })()}
          existingGroupMembers={(() => {
            if (!addGuestForId) return [];
            const referrer = guests.find(g => g.id === addGuestForId);
            if (!referrer?.family_group) return [];
            return guests
              .filter(g => g.family_group === referrer.family_group && g.id !== addGuestForId)
              .map(g => ({ first_name: g.first_name, last_name: g.last_name || '' }));
          })()}
        />
      )}

      {/* RSVP Invite Modal */}
      <Dialog open={showRsvpInviteModal} onOpenChange={setShowRsvpInviteModal}>
        <DialogContent className="ww-public-live-dialog ww-rsvp-invite-viewer max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-background [&>button]:rounded-full [&>button]:border-2 [&>button]:border-primary [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-primary [&>button:hover]:text-primary/80 [&>button:hover]:border-primary/80 [&>button>svg]:w-6 [&>button>svg]:h-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader className={styles.guestViewerHeader}>
            {homeButton}
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-foreground">
              <Mail className="w-6 h-6 text-foreground" />
              You're invited
            </DialogTitle>
          </DialogHeader>
          <div className={styles.inviteViewport}>
            {moduleSettings?.rsvp_invite_config?.file_url ? (
              <div className={styles.inviteMedia}>
                {moduleSettings.rsvp_invite_config.file_type?.includes('pdf') ? (
                  <div className={styles.invitePdf}>
                    <iframe
                      src={moduleSettings.rsvp_invite_config.file_url}
                      className="w-full h-full"
                      title="RSVP Invitation"
                    />
                  </div>
                ) : (
                  <img
                    src={moduleSettings.rsvp_invite_config.file_url}
                    alt="RSVP Invitation"
                    className={styles.inviteImage}
                  />
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">
                  Your invitation will appear here soon.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Welcome Video Modal */}
      <Dialog open={showWelcomeVideoModal} onOpenChange={setShowWelcomeVideoModal}>
        <DialogContent className="ww-public-live-dialog ww-rsvp-invite-viewer max-w-3xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-background [&>button]:rounded-full [&>button]:border-2 [&>button]:border-primary [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-primary [&>button:hover]:text-primary/80 [&>button:hover]:border-primary/80 [&>button>svg]:w-6 [&>button>svg]:h-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader className={styles.guestViewerHeader}>
            {homeButton}
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-foreground">
              <Video className="w-6 h-6 text-foreground" />
              Welcome Video
            </DialogTitle>
          </DialogHeader>
          <div className={styles.inviteViewport}>
            {welcomeVideoUrl ? (
              <div className={`${styles.inviteMedia} ${styles.welcomeVideoMedia}`}><ResponsiveWelcomeVideo src={welcomeVideoUrl} /></div>
            ) : (
              <div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-lg">
                    Welcome video will appear here soon.
                  </p>
                </div>
              </div>
            )}
            {moduleSettings?.welcome_video_config?.message && (
              <p className="mt-4 text-center text-muted-foreground">
                {moduleSettings.welcome_video_config.message}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ceremony Floor Plan Modal */}
      <Dialog open={showFloorPlanModal} onOpenChange={setShowFloorPlanModal}>
        <DialogContent className={`${moduleSettings?.floor_plan_config?.source === 'upload' ? 'ww-rsvp-invite-viewer' : ''} ww-public-live-dialog max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-background [&>button]:rounded-full [&>button]:border-2 [&>button]:border-primary [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-primary [&>button:hover]:text-primary/80 [&>button:hover]:border-primary/80 [&>button>svg]:w-6 [&>button>svg]:h-6`} style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader className={styles.guestViewerHeader}>
            {homeButton}
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-foreground">
              <MapPin className="w-6 h-6 text-primary" />
              Ceremony Floor Plan
            </DialogTitle>
          </DialogHeader>
          <div data-qr-media-document={moduleSettings?.floor_plan_config?.source === 'existing' ? '' : undefined} className={moduleSettings?.floor_plan_config?.source === 'upload' ? styles.inviteViewport : 'mt-4'}>
            {moduleSettings?.floor_plan_config?.source === 'upload' && moduleSettings?.floor_plan_config?.file_url ? (
              <img
                src={moduleSettings.floor_plan_config.file_url}
                alt="Ceremony Floor Plan"
                className={styles.inviteImage}
              />
            ) : moduleSettings?.floor_plan_config?.source === 'existing' ? (
              <ExistingFloorPlanView
                eventSlug={eventSlug}
                ceremonyFloorPlan={ceremonyFloorPlan}
                setCeremonyFloorPlan={setCeremonyFloorPlan}
                loading={ceremonyFloorPlanLoading}
                setLoading={setCeremonyFloorPlanLoading}
                fetched={ceremonyFloorPlanFetched}
                setFetched={setCeremonyFloorPlanFetched}
              />
            ) : (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 mx-auto text-white/50 mb-4" />
                <p className="text-white/70 text-lg">
                  Ceremony floor plan will appear here soon.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reception Floor Plan Modal */}
      <Dialog open={showReceptionFloorPlanModal} onOpenChange={setShowReceptionFloorPlanModal}>
        <DialogContent className={`${moduleSettings?.reception_floor_plan_config?.source === 'upload' ? 'ww-rsvp-invite-viewer' : ''} ww-public-live-dialog max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-background [&>button]:rounded-full [&>button]:border-2 [&>button]:border-primary [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-primary [&>button:hover]:text-primary/80 [&>button:hover]:border-primary/80 [&>button>svg]:w-6 [&>button>svg]:h-6`} style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader className={styles.guestViewerHeader}>
            {homeButton}
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-foreground">
              <MapPin className="w-6 h-6 text-foreground" />
              Reception Floor Plan
            </DialogTitle>
          </DialogHeader>
          <div data-qr-media-document={moduleSettings?.reception_floor_plan_config?.source === 'existing' ? '' : undefined} className={moduleSettings?.reception_floor_plan_config?.source === 'upload' ? styles.inviteViewport : 'mt-4'}>
            {moduleSettings?.reception_floor_plan_config?.source === 'upload' && moduleSettings?.reception_floor_plan_config?.file_url ? (
              <img
                src={moduleSettings.reception_floor_plan_config.file_url}
                alt="Reception Floor Plan"
                className={styles.inviteImage}
              />
            ) : moduleSettings?.reception_floor_plan_config?.source === 'existing' ? (
              <ReadOnlyReceptionFloorPlan
                token={moduleSettings.reception_floor_plan_config.share_token}
              />
            ) : (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">
                  Reception floor plan will appear here soon.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Menu Modal */}
      <Dialog open={showMenuModal} onOpenChange={setShowMenuModal}>
        <DialogContent className="ww-public-live-dialog ww-rsvp-invite-viewer max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-background [&>button]:rounded-full [&>button]:border-2 [&>button]:border-primary [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-primary [&>button:hover]:text-primary/80 [&>button:hover]:border-primary/80 [&>button>svg]:w-6 [&>button>svg]:h-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader className={styles.guestViewerHeader}>
            {homeButton}
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-foreground">
              <UtensilsCrossed className="w-6 h-6 text-foreground" />
              Wedding Menu
            </DialogTitle>
          </DialogHeader>
          <div className={styles.inviteViewport}>
            {moduleSettings?.menu_config?.file_url ? (
              <div className="text-center">
                {moduleSettings.menu_config.file_type?.includes('pdf') ? (
                  <div className={styles.invitePdf}>
                    <iframe
                      src={moduleSettings.menu_config.file_url}
                      className="w-full h-full"
                      title="Wedding Menu"
                    />
                  </div>
                ) : (
                  <img
                    src={moduleSettings.menu_config.file_url}
                    alt="Wedding Menu"
                    className={styles.inviteImage}
                  />
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <UtensilsCrossed className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">
                  The wedding menu will appear here soon.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

