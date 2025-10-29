import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GuestbookSheetProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
}

export const GuestbookSheet: React.FC<GuestbookSheetProps> = ({
  open,
  onClose,
  eventId,
}) => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({ 
        title: 'Message required', 
        description: 'Please enter a message before submitting.',
        variant: 'destructive' 
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('guestbook_messages')
        .insert({
          event_id: eventId,
          guest_name: name.trim() || null,
          message: message.trim(),
        });

      if (error) throw error;

      toast({
        title: '🎉 Thank you!',
        description: 'Your message has been added to the guestbook.',
      });

      setName('');
      setMessage('');
      onClose();
    } catch (error: any) {
      console.error('Error submitting guestbook message:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to submit message. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle>Sign the Guestbook</SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Your Name (Optional)</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="mt-1"
              maxLength={100}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Message *</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave your well wishes..."
              className="mt-1 min-h-[150px]"
              required
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length}/500 characters
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={submitting || !message.trim()} 
            className="w-full bg-[#6D28D9] hover:bg-[#5B21B6]" 
            size="lg"
          >
            {submitting ? 'Sending...' : 'Send Message'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};
