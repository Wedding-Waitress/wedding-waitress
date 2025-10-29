import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Eye, EyeOff, Trash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GuestbookMessage {
  id: string;
  message: string;
  guest_name: string | null;
  visibility: 'public' | 'hidden';
  created_at: string;
}

interface AlbumGuestbookTabProps {
  eventId: string;
  eventName: string;
}

export const AlbumGuestbookTab = ({ eventId, eventName }: AlbumGuestbookTabProps) => {
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('guestbook_messages')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages((data || []) as GuestbookMessage[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load guestbook messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [eventId]);

  const toggleVisibility = async (id: string, currentVisibility: 'public' | 'hidden') => {
    const newVisibility = currentVisibility === 'public' ? 'hidden' : 'public';
    
    try {
      const { error } = await supabase
        .from('guestbook_messages')
        .update({ visibility: newVisibility })
        .eq('id', id);

      if (error) throw error;

      setMessages(prev => prev.map(m => 
        m.id === id ? { ...m, visibility: newVisibility } : m
      ));

      toast({
        title: 'Success',
        description: `Message ${newVisibility === 'public' ? 'shown' : 'hidden'}`,
      });
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast({
        title: 'Error',
        description: 'Failed to update visibility',
        variant: 'destructive',
      });
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm('Permanently delete this message?')) return;

    try {
      const { error } = await supabase
        .from('guestbook_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== id));

      toast({
        title: 'Success',
        description: 'Message deleted',
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'Message', 'Timestamp'],
      ...messages.map(m => [
        m.guest_name || 'Anonymous',
        `"${m.message.replace(/"/g, '""')}"`,
        new Date(m.created_at).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-guestbook-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading messages...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Guestbook Messages</h2>
        <Button onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No guestbook messages yet
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => (
            <Card key={msg.id} className={msg.visibility === 'hidden' ? 'opacity-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {msg.guest_name && (
                        <span className="font-semibold">{msg.guest_name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                      {msg.visibility === 'hidden' && (
                        <Badge variant="secondary">Hidden</Badge>
                      )}
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => toggleVisibility(msg.id, msg.visibility)}
                    >
                      {msg.visibility === 'hidden' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => deleteMessage(msg.id)}
                    >
                      <Trash className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
