import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Users, 
  MapPin, 
  Calendar, 
  Heart, 
  AlertCircle,
  CheckCircle2,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  table_no: number | null;
  table_id: string | null;
  who_is_display: string;
  rsvp: string;
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
  const { toast } = useToast();

  // Fetch event and guests data
  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventSlug) return;

      setLoading(true);
      try {
        // Fetch event by slug
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, name, date, venue, partner1_name, partner2_name')
          .eq('slug', eventSlug)
          .single();

        if (eventError) {
          console.error('Error fetching event:', eventError);
          toast({
            title: "Event Not Found",
            description: "The requested event could not be found.",
            variant: "destructive",
          });
          return;
        }

        setEvent(eventData);

        // Fetch guests for this event
        const { data: guestsData, error: guestsError } = await supabase
          .from('guests')
          .select('id, first_name, last_name, table_no, table_id, who_is_display, rsvp')
          .eq('event_id', eventData.id);

        if (guestsError) {
          console.error('Error fetching guests:', guestsError);
          toast({
            title: "Error",
            description: "Failed to load guest list.",
            variant: "destructive",
          });
          return;
        }

        setGuests(guestsData || []);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
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
        <Card className="w-full max-w-md">
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
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 mr-3" />
            <h1 className="text-3xl md:text-4xl font-bold">
              {event.partner1_name && event.partner2_name 
                ? `${event.partner1_name} & ${event.partner2_name}`
                : event.name
              }
            </h1>
          </div>
          <div className="flex items-center justify-center space-x-6 text-white/90">
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
                <span>{event.venue}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Find Your Table
            </CardTitle>
            <CardDescription>
              Start typing your name to find your table assignment
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
                className="pl-10 text-lg h-12"
                autoFocus
              />
            </div>

            {/* Search Instructions */}
            {searchTerm.length < 2 && (
              <div className="text-center py-8">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Type at least 2 letters of your name to search
                </p>
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
              <div className="space-y-3">
                {filteredGuests.length > 0 ? (
                  filteredGuests.map((guest) => (
                    <Card key={guest.id} className="border-primary/20 bg-gradient-card">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-foreground">
                              {guest.first_name} {guest.last_name}
                            </h3>
                            {guest.who_is_display && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {guest.who_is_display}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {guest.table_no ? (
                              <div className="space-y-1">
                                <Badge variant="default" className="text-lg px-4 py-2">
                                  Table {guest.table_no}
                                </Badge>
                                <div className="flex items-center text-success text-sm">
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Assigned
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Badge variant="outline" className="text-sm">
                                  No Table Assigned
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                  Please see event staff
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-2">No guests found</p>
                    <p className="text-sm text-muted-foreground">
                      Please check your spelling or contact event staff for assistance
                    </p>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground">
              <p>Having trouble finding your name?</p>
              <p>Please contact event staff for assistance</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};