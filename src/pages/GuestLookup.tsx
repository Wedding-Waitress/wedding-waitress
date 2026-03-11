import React, { useState, useEffect, useMemo } from 'react';
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
import weddingWaitressFooterLogo from '@/assets/wedding-waitress-footer-logo.png';
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
  const [activeTab, setActiveTab] = useState('search');
  const [liveViewSettings, setLiveViewSettings] = useState<any>(null);
  const [moduleSettings, setModuleSettings] = useState<any>(null);
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
  
  // Compute is_editable based on rsvp_deadline (inclusive through end-of-day)
  const isEditable = useMemo(() => {
    if (!event?.rsvp_deadline) return true; // NULL deadline = always editable
    
    // Parse the deadline and set to end of day (23:59:59.999)
    const deadline = new Date(event.rsvp_deadline);
    deadline.setHours(23, 59, 59, 999);
    
    const now = new Date();
    return now <= deadline;
  }, [event?.rsvp_deadline]);

  // Auto-detect event day to switch header wording
  const isEventDay = useMemo(() => {
    if (!event?.date) return false;
    const tz = event.event_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
    return todayStr === event.date;
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
    if (guests.length === 0 || !isEditable) return;
    
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
  }, [guests, isEditable]);

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
            };
        setEvent(eventData);

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

  // Filter guests based on search term
  const filteredGuests = useMemo(() => {
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
  }, [guests, searchTerm]);

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
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="ww-box w-full max-w-md">
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
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="ww-box w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <CardTitle className="mb-2">Event Not Found</CardTitle>
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
    <div className="min-h-screen bg-gradient-subtle font-inter">
      {/* Hero Section */}
      <div 
        className={!heroImageUrl ? "bg-gradient-hero text-white" : "text-white"}
        style={heroImageUrl ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${heroImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        <div className="w-full px-4 pt-16 pb-16 md:pt-24 md:pb-24">
          <div className="text-center">
            {/* "You're invited to" text above event name */}
            <p className="text-white/90 text-lg md:text-xl font-medium mb-2">
              You're invited to
            </p>
            <div className="flex items-center justify-center mb-4">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
                {event.partner1_name && event.partner2_name 
                  && event.partner1_name !== 'Bride' && event.partner2_name !== 'Groom'
                  ? `${event.partner1_name} & ${event.partner2_name}`
                  : event.name
                }
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Event Date, Venue & Countdown - between hero and buttons */}
      <div className="w-full bg-primary/10 py-4 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <div className="flex items-center justify-center text-foreground text-sm md:text-base font-medium">
            <Calendar className="w-4 h-4 mr-2 text-primary" />
            <span>{new Date(event.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
          {event.venue && (
            <div className="flex items-center justify-center text-foreground text-sm md:text-base">
              <MapPin className="w-4 h-4 mr-2 text-primary" />
              <span>
                {event.venue}
                {(event.start_time || event.finish_time) && (
                  <span> - {event.start_time && formatDisplayTime(event.start_time)}
                  {event.start_time && event.finish_time && ' to '}
                  {event.finish_time && formatDisplayTime(event.finish_time)}</span>
                )}
              </span>
            </div>
          )}
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
              <p className="text-primary font-bold text-sm md:text-base mt-1 flex items-center justify-center gap-1.5">
                <Hourglass className="h-4 w-4" />
                {parts.join(', ')} To go
              </p>
            );
          })()}
        </div>
      </div>

      {/* Combined Feature Buttons + Tabs Section */}
      <div className="w-full px-4 pt-4 pb-1">
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
             <div className="bg-white p-2.5 rounded-xl border-2 border-gray-200 shadow-sm">
              <TabsList className="grid w-full h-auto grid-cols-3 p-0 bg-transparent border-0 shadow-none gap-2">
                {/* Row 1: RSVP Invite, Welcome Video, Table */}
                {liveViewSettings?.show_rsvp_invite && (
                  <button
                    onClick={() => setShowRsvpInviteModal(true)}
                    className="flex flex-col items-center justify-center h-[72px] py-2 px-1 rounded-xl border border-primary/40 bg-primary/10 text-primary transition-all duration-200"
                  >
                    <MailOpen className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold leading-tight text-center whitespace-nowrap">RSVP Invite</span>
                  </button>
                )}
                {liveViewSettings?.show_welcome_video && (
                  <button
                    onClick={() => setShowWelcomeVideoModal(true)}
                    className="flex flex-col items-center justify-center h-[72px] py-2 px-1 rounded-xl border border-primary/40 bg-primary/10 text-primary transition-all duration-200"
                  >
                    <PlayCircle className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold leading-tight text-center whitespace-nowrap">Welcome Video</span>
                  </button>
                )}
                <TabsTrigger 
                  value="visualization" 
                  className="flex flex-col items-center justify-center h-[72px] py-2 px-1 rounded-xl border border-primary/40 bg-primary/10 text-primary data-[state=active]:border-green-400 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:shadow-md transition-all duration-200"
                >
                  <LayoutGrid className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold leading-tight text-center whitespace-nowrap">Table</span>
                </TabsTrigger>

                {/* Row 2: Ceremony Floor Plan, Reception Floor Plan, Menu */}
                {liveViewSettings?.show_floor_plan && (
                  <button
                    onClick={() => setShowFloorPlanModal(true)}
                    className="flex flex-row items-center justify-center gap-2 h-[72px] py-2 px-1 rounded-xl border border-primary/40 bg-primary/10 text-primary transition-all duration-200"
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
                    className="flex flex-row items-center justify-center gap-2 h-[72px] py-2 px-1 rounded-xl border border-primary/40 bg-primary/10 text-primary transition-all duration-200"
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
                    className="flex flex-col items-center justify-center h-[72px] py-2 px-1 rounded-xl border border-primary/40 bg-primary/10 text-primary transition-all duration-200"
                  >
                    <UtensilsCrossed className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold leading-tight text-center whitespace-nowrap">Menu</span>
                  </button>
                )}
              </TabsList>
            </div>

            <div className="pt-3">
            <TabsContent value="search" className="mt-0">
              <Card className="ww-box card-elevated">
                <CardContent className="space-y-4 pt-6">
                  <p className="text-center text-sm font-semibold text-primary">Update & Confirm Your Details</p>
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      type="text"
                      placeholder={moduleSettings?.update_details_config?.search_placeholder || "Type your full name here..."}
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 text-base md:text-lg h-11 md:h-12 border-green-500 border-2 focus-visible:ring-green-500"
                      autoFocus
                    />
                  </div>

                  {/* Search Instructions */}

                  {/* Loading State */}
                  {searching && (
                    <div className="text-center py-4">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Searching...</p>
                    </div>
                  )}

                  {/* Search Results */}
                  {searchTerm.length >= 2 && !searching && (
                    <div className="space-y-4">
                      {filteredGuests.length > 0 ? (
                        filteredGuests.map((guest) => (
                          <EnhancedGuestCard
                            key={guest.id}
                            guest={guest}
                            onUpdate={refreshGuestData}
                            isEditable={isEditable}
                            onEdit={handleEditGuest}
                            onAddGuest={guest.allow_plus_one !== false ? () => { setAddGuestForId(guest.id); setShowAddGuestModal(true); } : undefined}
                            rsvpDeadline={event?.rsvp_deadline}
                            additionalGuestCount={guests.filter(g => (g as any).added_by_guest_id === guest.id).length}
                          />
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <AlertCircle className="w-10 h-10 md:w-12 md:h-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground mb-2 font-medium">No guests found</p>
                          <p className="text-sm text-muted-foreground">
                            Please check your spelling or contact event organiser for assistance
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Last Updated + Footer */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refreshGuestData}
                      className="h-6 px-2 text-xs"
                    >
                      Refresh
                    </Button>
                  </div>

                  <div className="text-center text-sm text-muted-foreground space-y-0">
                    <p className="font-medium">Having trouble finding your name?</p>
                    <p>Contact your organiser for assistance</p>
                  </div>

                  {/* Share Button */}
                  <div className="flex justify-center">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `${event.partner1_name && event.partner2_name ? `${event.partner1_name} & ${event.partner2_name}` : event.name}`,
                            url: window.location.href
                          });
                        }
                      }}
                      className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-black/30 rounded-full px-4 py-1 h-auto text-sm"
                    >
                      <Share2 className="w-4 h-4 mr-1.5" />
                      Share this invite
                    </Button>
                  </div>

                  {/* Wedding Waitress Logo - Footer */}
                  <div className="flex justify-center mt-6">
                    <a 
                      href="https://www.weddingwaitress.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <img 
                        src={weddingWaitressFooterLogo} 
                        alt="Wedding Waitress" 
                        className="h-8 md:h-10 w-auto"
                      />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visualization">
              <div className="space-y-6">
                {filteredGuests.length > 0 && searchTerm.length >= 2 && (
                  <>
                    {/* Show table visualization if guest has table assignment */}
                    {filteredGuests.some(g => g.table_id) ? (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        {Array.from(new Set(filteredGuests.map(g => g.table_id))).filter(Boolean).map((tableId) => {
                          const tableGuest = filteredGuests.find(g => g.table_id === tableId);
                          return tableGuest?.table_no ? (
                            <TableVisualization
                              key={tableId}
                              tableId={tableId!}
                              tableNumber={tableGuest.table_no}
                              eventId={event.id}
                            />
                          ) : null;
                        })}
                      </div>
                    ) : (
                      /* Guest found but not assigned to a table */
                      <Card className="ww-box card-elevated">
                        <CardContent className="p-8 text-center">
                          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <CardTitle className="mb-2">No Table Assigned Yet</CardTitle>
                          <CardDescription>
                            You haven't been assigned to a table yet. Please check back later or contact the event organiser.
                          </CardDescription>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {/* Home button */}
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => setActiveTab('search')}
                    className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:opacity-90 transition-all"
                  >
                    Home
                  </button>
                </div>

                {searchTerm.length < 2 && (
                  <Card className="ww-box card-elevated">
                    <CardContent className="p-8 text-center">
                      <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <CardTitle className="mb-2">Table View</CardTitle>
                     <CardDescription className="text-base">
                        Search for your name first to see what table you are sitting on and who you are sitting with.
                      </CardDescription>
                      <button
                        onClick={() => setActiveTab('search')}
                        className="mt-6 mx-auto px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:opacity-90 transition-all"
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
                      <CardTitle className="mb-2">Guest Not Found</CardTitle>
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
        isEditable={isEditable}
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
        />
      )}

      {/* RSVP Invite Modal */}
      <Dialog open={showRsvpInviteModal} onOpenChange={setShowRsvpInviteModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-primary [&>button]:rounded-full [&>button]:border-2 [&>button]:border-white [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-white [&>button:hover]:text-white/80 [&>button:hover]:border-white/80 [&>button>svg]:w-6 [&>button>svg]:h-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-white">
              <Mail className="w-6 h-6 text-white" />
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-primary [&>button]:rounded-full [&>button]:border-2 [&>button]:border-white [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-white [&>button:hover]:text-white/80 [&>button:hover]:border-white/80 [&>button>svg]:w-6 [&>button>svg]:h-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-white">
              <Video className="w-6 h-6 text-white" />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-primary [&>button]:rounded-full [&>button]:border-2 [&>button]:border-white [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-white [&>button:hover]:text-white/80 [&>button:hover]:border-white/80 [&>button>svg]:w-6 [&>button>svg]:h-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-white">
              <MapPin className="w-6 h-6 text-white" />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-primary [&>button]:rounded-full [&>button]:border-2 [&>button]:border-white [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-white [&>button:hover]:text-white/80 [&>button:hover]:border-white/80 [&>button>svg]:w-6 [&>button>svg]:h-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-white">
              <MapPin className="w-6 h-6 text-white" />
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
                <MapPin className="w-16 h-16 mx-auto text-white/50 mb-4" />
                <p className="text-white/70 text-lg">
                  Coming soon
                </p>
                <p className="text-white/50 text-sm mt-2">
                  Reception floor plan configuration is not yet available.
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 mx-auto text-white/50 mb-4" />
                <p className="text-white/70 text-lg">
                  Reception floor plan will appear here soon.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Menu Modal */}
      <Dialog open={showMenuModal} onOpenChange={setShowMenuModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y bg-primary [&>button]:rounded-full [&>button]:border-2 [&>button]:border-white [&>button]:w-10 [&>button]:h-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:text-white [&>button:hover]:text-white/80 [&>button:hover]:border-white/80 [&>button>svg]:w-6 [&>button>svg]:h-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-inter text-white">
              <UtensilsCrossed className="w-6 h-6 text-white" />
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
                <UtensilsCrossed className="w-16 h-16 mx-auto text-white/50 mb-4" />
                <p className="text-white/70 text-lg">
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