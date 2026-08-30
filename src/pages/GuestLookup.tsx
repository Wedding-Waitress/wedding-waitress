import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { loadGoogleFont } from '@/lib/googleFonts';
import { useParams } from 'react-router-dom';
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
  MailOpen,
  PlayCircle,
  LayoutGrid,
  Hourglass
} from 'lucide-react';
import weddingWaitressFooterLogo from '@/assets/wedding-waitress-brown-logo.png';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EnhancedGuestCard } from '@/components/GuestLookup/EnhancedGuestCard';
import { normalizeRsvp } from '@/lib/rsvp';
import { formatDisplayTime } from '@/lib/utils';
import { TableVisualization } from '@/components/GuestLookup/TableVisualization';
import { GuestProfileModal } from '@/components/GuestLookup/GuestProfileModal';
import { GuestUpdateModal } from '@/components/GuestLookup/GuestUpdateModal';
import { ReadOnlyCeremonyFloorPlan } from '@/components/GuestView/ReadOnlyCeremonyFloorPlan';
import { PublicAddGuestModal } from '@/components/GuestLookup/PublicAddGuestModal';
import styles from './GuestLookup.module.css';

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
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState('search');
  const tableTabRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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
      searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    if (!event?.date) return false;
    const tz = event.event_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const today = new Date(todayStr + 'T00:00:00');
    const eventDay = new Date(event.date + 'T00:00:00');
    const diffDays = Math.floor((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }, [event?.date, event?.event_timezone]);

  // Per-action overrides stored inside rsvp_invite_config JSON (no DB schema change).
  // Default OFF — when in 7-day window, actions are hidden unless organiser flips ON.
  const overrideRsvp = !!moduleSettings?.rsvp_invite_config?.rsvp_override_auto_lock;
  const overridePlusOne = !!moduleSettings?.rsvp_invite_config?.plus_one_override_auto_lock;
  const overrideUpdateDetails = !!moduleSettings?.rsvp_invite_config?.update_details_override_auto_lock;

  const showRsvpButtons = !isWithin7DayAutoProtection || overrideRsvp;
  const showAddPlusOne = !isWithin7DayAutoProtection || overridePlusOne;
  const showUpdateDetails = !isWithin7DayAutoProtection || overrideUpdateDetails;


  // Auto-detect event day to switch header wording
  const isEventDay = useMemo(() => {
    if (!event?.date) return false;
    const tz = event.event_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
    return todayStr === event.date;
  }, [event?.date, event?.event_timezone]);

  // Privacy gate: open partial-search only on the wedding day and after.
  // Before the event date, search is strict full-name match only (no suggestions).
  const isOpenSearchMode = useMemo(() => {
    if (!event?.date) return true; // fail-open
    const tz = event.event_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    return todayStr >= event.date;
  }, [event?.date, event?.event_timezone]);

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
    if (guests.length === 0 || !isEditable || !showUpdateDetails) return;
    
    const params = new URLSearchParams(window.location.search);
    const editGuestId = params.get('edit');
    
    if (editGuestId) {
      const guestToEdit = guests.find(g => g.id === editGuestId);
      if (guestToEdit) {
        setSelectedGuest(guestToEdit);
        setIsUpdateModalOpen(true);
        
        // Clean up URL parameter after opening modal
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('edit');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [guests, isEditable, showUpdateDetails]);

  // Fetch event and guests data using public RPC function
  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventSlug) return;

      setLoading(true);
      try {
        // Use the new public RPC function that bypasses RLS
        const { data: publicData, error: rpcError } = await supabase.rpc(
          'get_public_event_with_data_secure',
          { event_slug: eventSlug }
        );

        if (rpcError) {
          console.error('Error fetching public event data:', rpcError);
          toast({
            title: "Event Not Found",
            description: "The requested event could not be found.",
            variant: "destructive",
          });
          setEvent(null);
          return;
        }

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

        // Fetch event timezone (not returned by RPC)
        const { data: tzData } = await supabase
          .from('events')
          .select('event_timezone')
          .eq('id', firstRow.event_id)
          .maybeSingle();

            const eventData = {
              id: firstRow.event_id,
              name: firstRow.event_name,
              date: firstRow.event_date,
              venue: firstRow.event_venue,
              partner1_name: firstRow.partner1_name,
              partner2_name: firstRow.partner2_name,
              start_time: firstRow.event_start_time,
              finish_time: firstRow.event_finish_time,
              event_timezone: tzData?.event_timezone ?? null,
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
        console.error('Error fetching event data:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [eventSlug, toast]);

  // Normalise input for strict matching (trim, lowercase, collapse whitespace)
  const normalize = (str: string) => str.trim().toLowerCase().replace(/\s+/g, ' ');

  // Filter guests based on search term
  const filteredGuests = useMemo(() => {
    // OPEN MODE: existing partial-search behaviour (kept verbatim)
    if (isOpenSearchMode) {
      if (searchTerm.length < 2) return [];

      const term = searchTerm.toLowerCase();
      return guests.filter(guest => {
        const fullName = `${guest.first_name} ${guest.last_name}`.toLowerCase();
        const firstName = guest.first_name.toLowerCase();
        const lastName = guest.last_name.toLowerCase();

        return firstName.includes(term) ||
               lastName.includes(term) ||
               fullName.includes(term);
      });
    }

    // STRICT MODE (before event date): exact full-name match only
    const input = normalize(searchTerm || '');
    if (!input.includes(' ')) return [];
    return guests.filter((guest) => {
      const fullName = normalize(`${guest.first_name} ${guest.last_name}`);
      return fullName === input;
    });
  }, [guests, searchTerm, isOpenSearchMode]);

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


  // Smooth-scroll to search results when a match appears
  useEffect(() => {
    if (searchTerm.length >= 2 && !searching && filteredGuests.length > 0) {
      const t = setTimeout(() => {
        searchResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [searchTerm, searching, filteredGuests.length]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.length >= 2) {
      setSearching(true);
      // Simulate search delay for better UX
      setTimeout(() => setSearching(false), 300);
    }
  };

  const refreshGuestData = async () => {
    if (!eventSlug) return;
    
    try {
      console.log('🔄 Live View: Manually refreshing guest data...');
      // Use the same public RPC function for refreshing data
      const { data: publicData, error: rpcError } = await supabase.rpc(
        'get_public_event_with_data_secure',
        { event_slug: eventSlug }
      );

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
        setLastUpdated(new Date());
        console.log('✅ Live View: Guest data refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Live View: Error refreshing guest data:', error);
    }
  };

  // Set up realtime subscription for instant RSVP sync - using same channel name as KioskView
  useEffect(() => {
    if (!event?.id) return;

    const channel = supabase
      .channel(`kiosk-guests:event:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests',
          filter: `event_id=eq.${event.id}`
        },
        (payload) => {
          console.log('QR Code App realtime guest update received:', payload);
          
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          setGuests(currentGuests => {
            switch (eventType) {
              case 'INSERT':
                if (newRecord && !currentGuests.some(g => g.id === newRecord.id)) {
                  const transformedGuest = {
                    id: newRecord.id,
                    event_id: newRecord.event_id,
                    first_name: newRecord.first_name,
                    last_name: newRecord.last_name,
                    table_id: newRecord.table_id,
                    table_no: newRecord.table_no,
                    seat_no: newRecord.seat_no,
                    relation_display: newRecord.relation_display,
                    rsvp: normalizeRsvp(newRecord.rsvp),
                    dietary: newRecord.dietary,
                    mobile: newRecord.mobile,
                    email: newRecord.email,
                    notes: newRecord.notes,
                    family_group: newRecord.family_group,
                    added_by_guest_id: newRecord.added_by_guest_id,
                    table_name: null // Will be updated if needed
                  };
                  return [...currentGuests, transformedGuest];
                }
                return currentGuests;

              case 'UPDATE':
                if (newRecord) {
                  console.log('QR Code App processing UPDATE for guest:', newRecord.id, 'RSVP:', newRecord.rsvp, 'Normalized:', normalizeRsvp(newRecord.rsvp));
                  return currentGuests.map(g => 
                    g.id === newRecord.id 
                      ? {
                          ...g,
                          first_name: newRecord.first_name,
                          last_name: newRecord.last_name,
                          table_id: newRecord.table_id,
                          table_no: newRecord.table_no,
                          seat_no: newRecord.seat_no,
                          relation_display: newRecord.relation_display,
                          rsvp: normalizeRsvp(newRecord.rsvp),
                          dietary: newRecord.dietary,
                          mobile: newRecord.mobile,
                          email: newRecord.email,
                          notes: newRecord.notes,
                          family_group: newRecord.family_group
                        }
                      : g
                  );
                }
                return currentGuests;

              case 'DELETE':
                if (oldRecord) {
                  return currentGuests.filter(g => g.id !== oldRecord.id);
                }
                return currentGuests;

              default:
                return currentGuests;
            }
          });
        }
      )
      .subscribe((status) => {
        console.log(`Live View realtime subscription status: ${status} for kiosk-guests:event:${event.id}`);
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Live View successfully subscribed to kiosk-guests:event:${event.id}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Live View realtime subscription error');
        } else if (status === 'CLOSED') {
          console.error('❌ Live View realtime subscription closed');
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Live View realtime subscription timed out');
        }
      });

    return () => {
      console.log('🧹 Live View: Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [event?.id]);

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
  }, [event?.id, eventSlug]);

  const handleEditGuest = (guest: Guest) => {
    setSelectedGuest(guest);
    setIsUpdateModalOpen(true);
  };

  const handleAddGuest = (guest: Guest) => {
    setSelectedGuest(guest);
    setAddGuestForId(guest.id);
    setShowAddGuestModal(true);
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
      <div className={`${styles.mainSurface} ${styles.statePage} ww-application-background min-h-screen flex items-center justify-center p-4`}>
        <Card className={`${styles.stateCard} ww-box w-full max-w-md`}>
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading event details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`${styles.mainSurface} ${styles.statePage} ww-application-background min-h-screen flex items-center justify-center p-4`}>
        <Card className={`${styles.stateCard} ww-box w-full max-w-md`}>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <CardTitle className={`${styles.sectionHeading} mb-2`}>Event Not Found</CardTitle>
            <CardDescription>
              The requested event could not be found. Please check the QR code or contact the event organiser.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  const heroImageUrl = moduleSettings?.hero_image_config?.file_url;

  return (
    <div className={`${styles.mainSurface} ${styles.page} ww-application-background min-h-screen font-inter`}>
      {/* Hero Section */}
      <div className="relative">
        {heroImageUrl ? (
          <div className="relative">
            <img 
              src={heroImageUrl} 
              alt="Event hero" 
              className="w-full h-auto block"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className={`${styles.heroTitleGroup} text-center text-white`}>
                <p className="text-white/90 text-lg md:text-xl font-medium mb-2">
                  You're Invited
                </p>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold" style={{ fontFamily: "'Great Vibes', cursive" }}>
                  {event.name}
                </h1>
              </div>
            </div>
          </div>
        ) : (
          <div className={`${styles.fallbackHero} bg-gradient-hero text-white`}>
            <div className="w-full px-4 pt-16 pb-16 md:pt-24 md:pb-24">
              <div className={`${styles.heroTitleGroup} text-center`}>
                <p className="text-white/90 text-lg md:text-xl font-medium mb-2">
                  You're Invited
                </p>
                <div className="flex items-center justify-center mb-4">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold" style={{ fontFamily: "'Great Vibes', cursive" }}>
                    {event.name}
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
             <div className={`${styles.moduleTray} p-2.5 rounded-xl`}>
              <TabsList className="grid w-full h-auto grid-cols-3 p-0 bg-transparent border-0 shadow-none gap-2">
                {/* Row 1: RSVP Invite, Welcome Video, Table */}
                {liveViewSettings?.show_rsvp_invite && (
                  <button
                    onClick={() => setShowRsvpInviteModal(true)}
                    className="flex flex-col items-center justify-center h-[72px] py-2 px-1 rounded-xl border border-primary bg-transparent text-primary transition-all duration-200"
                  >
                    <MailOpen className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold leading-tight text-center whitespace-nowrap">RSVP Invite</span>
                  </button>
                )}
                {liveViewSettings?.show_welcome_video && (
                  <button
                    onClick={() => setShowWelcomeVideoModal(true)}
                    className="flex flex-col items-center justify-center h-[72px] py-2 px-1 rounded-xl border border-primary bg-transparent text-primary transition-all duration-200"
                  >
                    <PlayCircle className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold leading-tight text-center whitespace-nowrap">Welcome Video</span>
                  </button>
                )}
                <TabsTrigger 
                  value="visualization" 
                  className="flex flex-col items-center justify-center h-[72px] py-2 px-1 rounded-xl border border-primary bg-transparent text-primary data-[state=active]:border-green-400 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:shadow-md transition-all duration-200"
                >
                  <LayoutGrid className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold leading-tight text-center whitespace-nowrap">Table</span>
                </TabsTrigger>

                {/* Row 2: Ceremony Floor Plan, Reception Floor Plan, Menu */}
                {liveViewSettings?.show_floor_plan && (
                  <button
                    onClick={() => setShowFloorPlanModal(true)}
                    className="flex flex-row items-center justify-center gap-2 h-[72px] py-2 px-1 rounded-xl border border-primary bg-transparent text-primary transition-all duration-200"
                  >
                    <MapPin className="w-5 h-5 shrink-0" />
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold leading-tight">Ceremony</span>
                      <span className="text-xs font-bold leading-tight">Floor Plan</span>
                    </div>
                  </button>
                )}
                {liveViewSettings?.show_reception_floor_plan && (
                  <button
                    onClick={() => setShowReceptionFloorPlanModal(true)}
                    className="flex flex-row items-center justify-center gap-2 h-[72px] py-2 px-1 rounded-xl border border-primary bg-transparent text-primary transition-all duration-200"
                  >
                    <MapPin className="w-5 h-5 shrink-0" />
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold leading-tight">Reception</span>
                      <span className="text-xs font-bold leading-tight">Floor Plan</span>
                    </div>
                  </button>
                )}
                {liveViewSettings?.show_menu && (
                  <button
                    onClick={() => setShowMenuModal(true)}
                    className="flex flex-col items-center justify-center h-[72px] py-2 px-1 rounded-xl border border-primary bg-transparent text-primary transition-all duration-200"
                  >
                    <UtensilsCrossed className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold leading-tight text-center whitespace-nowrap">Menu</span>
                  </button>
                )}
              </TabsList>
            </div>

            <div className="pt-3">
            <TabsContent value="search" className="mt-0">
              <p className={`${styles.sectionHeading} text-center text-base md:text-lg font-semibold text-foreground mb-3`}>Update & Confirm Your Details</p>
              <Card className={`${styles.searchCard} ww-box card-elevated`}>
                <CardContent className={`${styles.searchCardContent} pt-3`}>
                  <div className={styles.searchArea}>
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        ref={searchInputRef}
                        type="text"
                        placeholder={moduleSettings?.update_details_config?.search_placeholder || "Type your full name here..."}
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-10 text-base md:text-lg h-11 md:h-12 border-primary border-2 focus-visible:ring-primary"
                        autoFocus
                      />
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
                    if (searching) return null;
                    const normalizedInput = normalize(searchTerm || '');
                    const isFullNameAttempt = normalizedInput.includes(' ');
                    // Strict mode: hide everything until a full-name attempt
                    if (!isOpenSearchMode && !isFullNameAttempt) return null;
                    // Open mode: keep original 2+ char gate
                    if (isOpenSearchMode && searchTerm.length < 2) return null;

                    return (
                      <div ref={searchResultsRef}>
                        {filteredGuests.length > 0 && (
                          <div className="text-center mb-5 animate-fade-in">
                            <div data-live-section-heading className="text-lg md:text-xl font-semibold text-primary">
                              Welcome, {filteredGuests[0].first_name} 👋
                            </div>
                          </div>
                        )}
                        <div className="space-y-4 animate-fade-in">
                          {filteredGuests.length > 0 ? (
                            filteredGuests.map((guest) => (
                              <EnhancedGuestCard
                                key={guest.id}
                                guest={guest}
                                onUpdate={refreshGuestData}
                                isEditable={isEditable}
                                onEdit={showUpdateDetails ? handleEditGuest : undefined}
                                onAddGuest={(event as any)?.allow_guest_plus_ones ? () => handleAddGuest(guest) : undefined}
                                rsvpDeadline={event?.rsvp_deadline}
                                additionalGuestCount={guests.filter(g => (g as any).added_by_guest_id === guest.id).length}
                                showRsvpButtons={showRsvpButtons}
                                showAddPlusOne={showAddPlusOne}
                                showUpdateDetails={showUpdateDetails}
                              />
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
                  </div>

                  {/* Share Button */}
                  <div className={`${styles.shareInvite} flex justify-center`}>
                    <button 
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `${event.partner1_name && event.partner2_name ? `${event.partner1_name} & ${event.partner2_name}` : event.name}`,
                            url: window.location.href
                          });
                        }
                      }}
                      className="lv-premium-btn flex items-center gap-2 h-[36px] px-[18px] py-0 border border-primary/40 bg-primary/10 text-primary"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="text-xs font-bold whitespace-nowrap">Share this invite</span>
                    </button>
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

                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visualization">
              <div ref={tableTabRef} className="space-y-6">
                {filteredGuests.length > 0 && searchTerm.length >= 2 && (
                  <>
                    {/* Show table visualization if guest has table assignment */}
                    {filteredGuests.some(g => g.table_id) ? (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        {Array.from(new Set(filteredGuests.map(g => g.table_id))).filter(Boolean).map((tableId) => {
                          const tableGuest = filteredGuests.find(g => g.table_id === tableId);
                          return (tableGuest?.table_no || tableGuest?.table_id) ? (
                            <TableVisualization
                              key={tableId}
                              tableId={tableId!}
                              tableNumber={tableGuest.table_no || 0}
                              eventId={event.id}
                            />
                          ) : null;
                        })}
                      </div>
                    ) : (
                      /* Guest found but not assigned to a table */
                      <Card className="ww-box card-elevated border-2 border-warning/30">
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

                {searchTerm.length < 2 && (
                  <Card className="ww-box card-elevated">
                    <CardContent className="p-8 text-center">
                      <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <CardTitle className={`${styles.sectionHeading} mb-2`}>Table View</CardTitle>
                     <CardDescription className="text-base">
                        Search for your name first to see what table you are sitting on and who you are sitting with.
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

                {searchTerm.length >= 2 && filteredGuests.length === 0 && !searching && (
                  <Card className="ww-box card-elevated">
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
      <GuestProfileModal
        guest={selectedGuest}
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedGuest(null);
        }}
        onUpdate={refreshGuestData}
      />

      {/* Guest Update Modal */}
      <GuestUpdateModal
        guest={selectedGuest ? {
          ...selectedGuest,
          event_id: event?.id || ''
        } : null}
        event={event}
        open={isUpdateModalOpen}
        onOpenChange={setIsUpdateModalOpen}
        onUpdate={refreshGuestData}
        helperText={moduleSettings?.update_details_config?.helper_text}
        allowNameEdit={moduleSettings?.update_details_config?.allow_name_edit ?? false}
        showMessageField={moduleSettings?.update_details_config?.show_message_field ?? true}
        isEditable={isEditable && showUpdateDetails}
        allGuests={guests}
        songRequestsEnabled={!!songRequestSettings?.enabled}
        songRequestsMax={songRequestSettings?.enabled ? (songRequestSettings.max_requests_per_guest || 0) : 0}
      />

      {/* Public Add Guest Modal */}
      {event?.id && (
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
        <DialogContent className="ww-public-live-dialog max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-background [&>button]:rounded-full [&>button]:border-2 [&>button]:border-primary [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-primary [&>button:hover]:text-primary/80 [&>button:hover]:border-primary/80 [&>button>svg]:w-6 [&>button>svg]:h-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-foreground">
              <Mail className="w-6 h-6 text-foreground" />
              You're invited
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {moduleSettings?.rsvp_invite_config?.file_url ? (
              <div className="text-center">
                {moduleSettings.rsvp_invite_config.file_type?.includes('pdf') ? (
                  <div className="aspect-[210/297] w-full border rounded-lg overflow-hidden">
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
                    className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
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
        <DialogContent className="ww-public-live-dialog max-w-3xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-background [&>button]:rounded-full [&>button]:border-2 [&>button]:border-primary [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-primary [&>button:hover]:text-primary/80 [&>button:hover]:border-primary/80 [&>button>svg]:w-6 [&>button>svg]:h-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-foreground">
              <Video className="w-6 h-6 text-foreground" />
              Welcome Video
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {moduleSettings?.welcome_video_config?.video_url ? (
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                <iframe
                  src={moduleSettings.welcome_video_config.video_url}
                  className="w-full h-full"
                  title="Welcome Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
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
        <DialogContent className="ww-public-live-dialog max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-background [&>button]:rounded-full [&>button]:border-2 [&>button]:border-primary [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-primary [&>button:hover]:text-primary/80 [&>button:hover]:border-primary/80 [&>button>svg]:w-6 [&>button>svg]:h-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-foreground">
              <MapPin className="w-6 h-6 text-primary" />
              Ceremony Floor Plan
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {moduleSettings?.floor_plan_config?.source === 'upload' && moduleSettings?.floor_plan_config?.file_url ? (
              <img 
                src={moduleSettings.floor_plan_config.file_url} 
                alt="Ceremony Floor Plan"
                className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
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
        <DialogContent className="ww-public-live-dialog max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-background [&>button]:rounded-full [&>button]:border-2 [&>button]:border-primary [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-primary [&>button:hover]:text-primary/80 [&>button:hover]:border-primary/80 [&>button>svg]:w-6 [&>button>svg]:h-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-foreground">
              <MapPin className="w-6 h-6 text-foreground" />
              Reception Floor Plan
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {moduleSettings?.reception_floor_plan_config?.source === 'upload' && moduleSettings?.reception_floor_plan_config?.file_url ? (
              <img 
                src={moduleSettings.reception_floor_plan_config.file_url} 
                alt="Reception Floor Plan"
                className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
              />
            ) : moduleSettings?.reception_floor_plan_config?.source === 'existing' ? (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">
                  Coming soon
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                  Reception floor plan configuration is not yet available.
                </p>
              </div>
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
        <DialogContent className="ww-public-live-dialog max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-background [&>button]:rounded-full [&>button]:border-2 [&>button]:border-primary [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-primary [&>button:hover]:text-primary/80 [&>button:hover]:border-primary/80 [&>button>svg]:w-6 [&>button>svg]:h-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-foreground">
              <UtensilsCrossed className="w-6 h-6 text-foreground" />
              Wedding Menu
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {moduleSettings?.menu_config?.file_url ? (
              <div className="text-center">
                {moduleSettings.menu_config.file_type?.includes('pdf') ? (
                  <div className="aspect-[210/297] w-full border rounded-lg overflow-hidden">
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
                    className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
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
