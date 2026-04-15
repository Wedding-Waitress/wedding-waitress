import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, Eye, ToggleLeft, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AdminEvents = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get guest counts and owner emails
      const eventsWithCounts = await Promise.all(
        (data || []).map(async (event) => {
          const { count: guestCount } = await supabase
            .from('guests')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          // Get owner email
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', event.user_id)
            .single();
          
          return {
            ...event,
            guestCount: guestCount || 0,
            ownerEmail: profile?.email || 'N/A',
          };
        })
      );

      setEvents(eventsWithCounts);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) =>
    event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#967A59' }}></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <Card className="ww-box">
        <CardHeader>
          <CardTitle style={{ color: '#967A59' }}>Event Management</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by event name or owner email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Event Date</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>{event.ownerEmail}</TableCell>
                  <TableCell>
                    {event.date ? new Date(event.date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>{event.guestCount}</TableCell>
                  <TableCell>
                    <Badge variant={event.qr_apply_to_live_view ? 'default' : 'secondary'}>
                      {event.qr_apply_to_live_view ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ToggleLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
