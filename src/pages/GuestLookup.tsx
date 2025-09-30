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
  Heart, 
  AlertCircle,
  CheckCircle2,
  User,
  Eye,
  Smartphone,
  Share2,
  Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EnhancedGuestCard } from '@/components/GuestLookup/EnhancedGuestCard';
import { normalizeRsvp } from '@/lib/rsvp';
import { TableVisualization } from '@/components/GuestLookup/TableVisualization';
import { GuestProfileModal } from '@/components/GuestLookup/GuestProfileModal';

interface Guest {
  id: string;
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
  family_group?: string;
  table_name?: string;
  table_limit_seats?: number;
}

interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  partner1_name: string | null;
  partner2_name: string | null;
}

export const GuestLookup: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [liveViewSettings, setLiveViewSettings] = useState<any>(null);
  const [moduleSettings, setModuleSettings] = useState<any>(null);
  const { toast } = useToast();

  // Check for tab parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'rsvp-invite') {
      setActiveTab('rsvp-invite');
    }
  }, []);

  // Fetch event and guests data using public RPC function
  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventSlug) return;

      setLoading(true);
      try {
        // Use the new public RPC function that bypasses RLS
        const { data: publicData, error: rpcError } = await supabase.rpc(
          'get_public_event_with_data',
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
        const eventData = {
          id: firstRow.event_id,
          name: firstRow.event_name,
          date: firstRow.event_date,
          venue: firstRow.event_venue,
          partner1_name: firstRow.partner1_name,
          partner2_name: firstRow.partner2_name,
        };
        setEvent(eventData);

        // Transform guest data
        const transformedGuests = publicData
          .filter(row => row.guest_id) // Only include rows with guest data
          .map(row => ({
            id: row.guest_id,
            first_name: row.guest_first_name,
            last_name: row.guest_last_name,
            table_id: row.guest_table_id,
            table_no: row.guest_table_no || row.table_no,
            seat_no: row.guest_seat_no,
            relation_display: row.guest_relation_display,
            rsvp: normalizeRsvp(row.guest_rsvp),
            dietary: row.guest_dietary,
            mobile: row.guest_mobile,
            email: row.guest_email,
            family_group: row.guest_family_group,
            table_name: row.table_name,
            table_limit_seats: row.table_limit_seats
          }));

        setGuests(transformedGuests);

        // Fetch live view settings
        const { data: liveSettings } = await supabase
          .from('live_view_settings')
          .select('*')
          .eq('event_id', eventData.id)
          .maybeSingle();
        
        setLiveViewSettings(liveSettings);

        // Fetch module settings
        const { data: modSettings } = await supabase
          .from('live_view_module_settings')
          .select('*')
          .eq('event_id', eventData.id)
          .maybeSingle();
        
        setModuleSettings(modSettings);
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
      // Use the same public RPC function for refreshing data
      const { data: publicData, error: rpcError } = await supabase.rpc(
        'get_public_event_with_data',
        { event_slug: eventSlug }
      );

      if (!rpcError && publicData) {
        // Transform guest data
        const transformedGuests = publicData
          .filter(row => row.guest_id) // Only include rows with guest data
          .map(row => ({
            id: row.guest_id,
            first_name: row.guest_first_name,
            last_name: row.guest_last_name,
            table_id: row.guest_table_id,
            table_no: row.guest_table_no || row.table_no,
            seat_no: row.guest_seat_no,
            relation_display: row.guest_relation_display,
            rsvp: normalizeRsvp(row.guest_rsvp),
            dietary: row.guest_dietary,
            mobile: row.guest_mobile,
            email: row.guest_email,
            family_group: row.guest_family_group,
            table_name: row.table_name,
            table_limit_seats: row.table_limit_seats
          }));

        setGuests(transformedGuests);
      }
    } catch (error) {
      console.error('Error refreshing guest data:', error);
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
                    family_group: newRecord.family_group,
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
        console.log(`QR Code App realtime subscription status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id]);

  const handleEditGuest = (guest: Guest) => {
    setSelectedGuest(guest);
    setShowProfileModal(true);
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
              The requested event could not be found. Please check the QR code or contact the event organizer.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <div className="bg-gradient-hero text-white">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 md:w-8 md:h-8 mr-3" />
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
                {event.partner1_name && event.partner2_name 
                  ? `${event.partner1_name} & ${event.partner2_name}`
                  : event.name
                }
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-white/90 text-sm md:text-base">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{new Date(event.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              {event.venue && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="text-center">{event.venue}</span>
                </div>
              )}
            </div>
            
            {/* Mobile-friendly action buttons */}
            <div className="flex justify-center gap-2 mt-4 md:hidden">
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
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full mb-6 ${liveViewSettings?.show_rsvp_invite ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {liveViewSettings?.show_rsvp_invite && (
                <TabsTrigger value="rsvp-invite" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span className="hidden sm:inline">RSVP Invite</span>
                  <span className="sm:hidden">RSVP</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Find Your Table</span>
                <span className="sm:hidden">Search</span>
              </TabsTrigger>
              <TabsTrigger value="visualization" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Table View</span>
                <span className="sm:hidden">View</span>
              </TabsTrigger>
            </TabsList>

            {/* RSVP Invite Tab Content */}
            {liveViewSettings?.show_rsvp_invite && (
              <TabsContent value="rsvp-invite">
                <Card className="ww-box card-elevated">
                  <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                      <Mail className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                      You Are Invited
                    </CardTitle>
                    <CardDescription>
                      View your digital invitation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {moduleSettings?.rsvp_invite_config?.file_url ? (
                      <div className="text-center">
                        {moduleSettings.rsvp_invite_config.file_type?.includes('pdf') ? (
                          <div className="aspect-[210/297] max-w-md mx-auto border rounded-lg overflow-hidden">
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
                        <p className="text-sm text-muted-foreground mt-4">
                          Please review your invitation and RSVP using the tabs above.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">
                          Your invitation will appear here soon.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="search">
              <Card className="ww-box card-elevated">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Users className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                    Find Your Table
                  </CardTitle>
                  <CardDescription>
                    Start typing your name to find your table assignment and manage your RSVP
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Type your first or last name..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 text-base md:text-lg h-11 md:h-12"
                      autoFocus
                    />
                  </div>

                  {/* Search Instructions */}
                  {searchTerm.length < 2 && (
                    <div className="text-center py-8">
                      <User className="w-10 h-10 md:w-12 md:h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground text-sm md:text-base">
                        Type at least 2 letters of your name to search
                      </p>
                      <div className="mt-4 p-4 bg-accent/50 rounded-lg">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Smartphone className="w-4 h-4 text-accent-foreground" />
                          <span className="text-sm font-medium text-accent-foreground">Mobile Tip</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Add this page to your home screen for quick access during the event
                        </p>
                      </div>
                    </div>
                  )}

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
                            onEdit={handleEditGuest}
                          />
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <AlertCircle className="w-10 h-10 md:w-12 md:h-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground mb-2 font-medium">No guests found</p>
                          <p className="text-sm text-muted-foreground">
                            Please check your spelling or contact event staff for assistance
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Footer */}
                  <div className="text-center text-sm text-muted-foreground space-y-1">
                    <p className="font-medium">Having trouble finding your name?</p>
                    <p>Please contact event staff for assistance</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visualization">
              <div className="space-y-6">
                {filteredGuests.length > 0 && searchTerm.length >= 2 && (
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
                )}

                {searchTerm.length < 2 && (
                  <Card className="ww-box card-elevated">
                    <CardContent className="p-8 text-center">
                      <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <CardTitle className="mb-2">Interactive Table View</CardTitle>
                      <CardDescription>
                        Search for your name first to see your table visualization
                      </CardDescription>
                    </CardContent>
                  </Card>
                )}

                {searchTerm.length >= 2 && filteredGuests.length === 0 && !searching && (
                  <Card className="ww-box card-elevated">
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <CardTitle className="mb-2">No Table Found</CardTitle>
                      <CardDescription>
                        No table assignments found for your search. Please verify your name or contact event staff.
                      </CardDescription>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
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
    </div>
  );
};