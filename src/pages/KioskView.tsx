import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Calendar, 
  MapPin, 
  AlertCircle,
  User,
  HelpCircle
} from 'lucide-react';
import weddingWaitressFooterLogo from '@/assets/wedding-waitress-footer-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { KioskGuestCard } from '@/components/Kiosk/KioskGuestCard';
import { normalizeRsvp } from '@/lib/rsvp';

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
  table_name?: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  partner1_name: string | null;
  partner2_name: string | null;
}

export const KioskView: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Auto-reset inactivity timeout (30 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - lastActivity > 30000) {
        setSearchTerm('');
        setLastActivity(Date.now());
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastActivity]);

  // Reset activity timer on any interaction
  const handleActivity = () => {
    setLastActivity(Date.now());
  };

  // Fetch event and guests data
  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventSlug) return;

      setLoading(true);
      try {
        const { data: publicData, error: rpcError } = await supabase.rpc(
          'get_public_event_with_data_secure',
          { event_slug: eventSlug }
        );

        if (rpcError || !publicData || publicData.length === 0) {
          setEvent(null);
          return;
        }

        // Extract event data
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

        // Transform guest data with normalized RSVP
        const transformedGuests = publicData
          .filter(row => row.guest_id)
          .map(row => ({
            id: row.guest_id,
            event_id: firstRow.event_id,
            user_id: '', // Not available in public view
            first_name: row.guest_first_name,
            last_name: row.guest_last_name,
            table_id: null,
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
            family_group: null,
          }));

        setGuests(transformedGuests);
      } catch (error) {
        console.error('Error fetching event data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [eventSlug]);

  // Set up realtime subscription for instant sync with dashboard and QR app
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
          console.log('Kiosk realtime guest update received:', payload);
          
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
                    table_name: null // Will be updated if needed
                  };
                  return [...currentGuests, transformedGuest];
                }
                return currentGuests;

              case 'UPDATE':
                if (newRecord) {
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
                          dietary: newRecord.dietary
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
        console.log(`Kiosk realtime subscription status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id]);

  // Filter guests - no minimum character requirement for kiosk
  const filteredGuests = useMemo(() => {
    if (searchTerm.length === 0) return [];

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
    handleActivity();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-6"></div>
          <p className="text-2xl font-medium">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center max-w-2xl px-8">
          <AlertCircle className="w-24 h-24 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
          <p className="text-xl opacity-90">
            The requested event could not be found. Please contact event staff for assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero text-white overflow-hidden">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="w-full px-8 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <h1 className="text-3xl font-bold">
                {event.partner1_name && event.partner2_name 
                  ? `${event.partner1_name} & ${event.partner2_name}`
                  : event.name
                }
              </h1>
            </div>
            <div className="flex items-center justify-center gap-6 text-white/90 text-lg">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-3" />
                <span>{new Date(event.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              {event.venue && (
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-3" />
                  <span>{event.venue}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-8 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Search Section */}
          <Card className="ww-box bg-white/95 backdrop-blur-sm shadow-2xl mb-8">
            <CardContent className="p-12">
              <div className="text-center mb-8">
                <Search className="w-16 h-16 mx-auto text-primary mb-4" />
                <h2 className="text-3xl font-bold text-foreground mb-2">Find Your Table</h2>
                <p className="text-xl text-muted-foreground">
                  Type your name to find your seating assignment
                </p>
              </div>

              {/* Large Search Input */}
              <div className="relative max-w-2xl mx-auto mb-8">
                <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-muted-foreground w-6 h-6" />
                <Input
                  type="text"
                  placeholder="Enter your first or last name..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-16 text-2xl h-20 text-center font-medium border-2 focus:border-primary shadow-lg"
                  autoFocus
                />
              </div>

              {/* Instructions */}
              {searchTerm.length === 0 && (
                <div className="text-center py-8">
                  <User className="w-20 h-20 mx-auto text-muted-foreground/50 mb-6" />
                  <p className="text-xl text-muted-foreground mb-4">
                    Start typing your name to search
                  </p>
                  <div className="max-w-md mx-auto p-6 bg-primary/10 rounded-xl">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <HelpCircle className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-primary">Need Help?</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Can't find your name? Please ask event staff for assistance
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchTerm.length > 0 && (
            <div className="space-y-6">
              {filteredGuests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGuests.map((guest) => (
                    <KioskGuestCard key={guest.id} guest={guest} />
                  ))}
                </div>
              ) : (
                <Card className="ww-box bg-white/95 backdrop-blur-sm shadow-2xl">
                  <CardContent className="p-12 text-center">
                    <AlertCircle className="w-20 h-20 mx-auto text-orange-500 mb-6" />
                    <h3 className="text-2xl font-bold text-foreground mb-4">No guests found</h3>
                    <p className="text-xl text-muted-foreground mb-6">
                      We couldn't find any guests matching "{searchTerm}"
                    </p>
                    <div className="p-6 bg-orange-50 rounded-xl max-w-md mx-auto">
                      <p className="text-lg font-medium text-orange-800 mb-2">
                        Please check your spelling or contact event staff
                      </p>
                      <p className="text-sm text-orange-600">
                        Your name might be listed differently on the guest list
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Help */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/20 backdrop-blur-sm border-t border-white/20">
        <div className="w-full px-8 py-4">
          <div className="text-center space-y-3">
            <p className="text-lg text-white/90">
              Need assistance? Please contact event staff
            </p>
            <a 
              href="https://www.weddingwaitress.com/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <img 
                src={weddingWaitressFooterLogo} 
                alt="Wedding Waitress" 
                className="h-10 md:h-12 w-auto mx-auto"
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};