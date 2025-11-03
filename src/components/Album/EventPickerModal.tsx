import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/enhanced-button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Camera, Link2, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Event } from '@/hooks/useEvents';

interface EventPickerModalProps {
  events: Event[];
  open: boolean;
  onClose: () => void;
  onSelectEvent: (eventId: string) => void;
}

export const EventPickerModal = ({ events, open, onClose, onSelectEvent }: EventPickerModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const filteredEvents = events.filter(event => 
    event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.venue?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyUploadLink = async (slug: string | null) => {
    if (!slug) {
      toast({ 
        title: 'No gallery link', 
        description: 'This event does not have a gallery URL yet', 
        variant: 'destructive' 
      });
      return;
    }

    const url = `${window.location.origin}/g/${slug}`;
    await navigator.clipboard.writeText(url);
    toast({ title: 'Copied!', description: 'Upload link copied to clipboard' });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Date TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Choose an Event Album</DialogTitle>
        </DialogHeader>
        
        <Input 
          placeholder="Search events by name or venue..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />

        <ScrollArea className="h-[500px] pr-4">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No events found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.map(event => (
                <Card key={event.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Cover Image Placeholder */}
                  <div className="h-32 bg-gradient-to-br from-primary to-primary/60">
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-12 h-12 text-white/50" />
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-1 truncate" title={event.name}>
                      {event.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {formatDate(event.date)} {event.venue && `• ${event.venue}`}
                    </p>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="default" 
                        className="flex-1"
                        onClick={() => onSelectEvent(event.id)}
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Manage Album
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyUploadLink(event.slug)}
                        title="Copy Upload Link"
                      >
                        <Link2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
