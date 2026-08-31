import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitVenueTemplate } from '@/hooks/useVenueTemplates';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: ReceptionFloorPlan;
  backgroundUrl: string | null;
}

export const SubmitTemplateDialog = ({ open, onOpenChange, plan, backgroundUrl }: Props) => {
  const { toast } = useToast();
  const [venueName, setVenueName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [capacity, setCapacity] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setVenueName('');
    setRoomName('');
    setCity('');
    setCountry('');
    setCapacity(0);
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!venueName.trim() || !roomName.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Venue name and room name are required.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    const res = await submitVenueTemplate({
      plan,
      backgroundUrl,
      meta: {
        venue_name: venueName,
        room_name: roomName,
        city,
        country,
        capacity,
        notes,
      },
    });
    setSubmitting(false);
    if (res.ok === true) {
      toast({
        title: 'Submitted for review',
        description:
          'Your venue template has been sent to the admin team. It will appear in the public directory once approved.',
      });
      reset();
      onOpenChange(false);
    } else {
      toast({ title: 'Could not submit', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="reception-portal-surface max-w-lg max-lg:max-w-[calc(100vw-1.5rem)] p-0 overflow-hidden">
        <DialogHeader className="px-6 max-lg:px-4 pt-6 max-lg:pt-5 pb-3 border-b">
          <DialogTitle className="text-lg max-lg:text-center flex items-center gap-2 max-lg:justify-center">
            <UploadCloud className="w-5 h-5 text-primary" />
            Submit this layout as a venue template
          </DialogTitle>
          <p className="text-xs text-muted-foreground max-lg:text-center pt-1">
            Share the room shape, fixtures, and background. Your guest-specific table placements are
            never included. An admin reviews before it appears in the public directory.
          </p>
        </DialogHeader>

        <div className="px-6 max-lg:px-4 py-4 space-y-3 max-lg:space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-lg:gap-5">
            <div className="space-y-1">
              <Label htmlFor="vt-venue" className="text-xs">Venue name *</Label>
              <Input
                id="vt-venue"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="h-10 max-lg:h-11 max-lg:text-base"
                placeholder="e.g. The Grand Ballroom"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vt-room" className="text-xs">Room name *</Label>
              <Input
                id="vt-room"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="h-10 max-lg:h-11 max-lg:text-base"
                placeholder="e.g. Crystal Hall"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vt-city" className="text-xs">City</Label>
              <Input
                id="vt-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-10 max-lg:h-11 max-lg:text-base"
                placeholder="Sydney"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vt-country" className="text-xs">Country</Label>
              <Input
                id="vt-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-10 max-lg:h-11 max-lg:text-base"
                placeholder="Australia"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vt-capacity" className="text-xs">Capacity (guests)</Label>
              <Input
                id="vt-capacity"
                type="number"
                min={0}
                value={capacity}
                onChange={(e) => setCapacity(Math.max(0, Number(e.target.value) || 0))}
                className="h-10 max-lg:h-11 max-lg:text-base"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Dimensions</Label>
              <div className="h-10 max-lg:h-11 px-3 rounded-md border bg-muted/30 text-sm text-muted-foreground flex items-center">
                {plan.room_width_m}m × {plan.room_length_m}m
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="vt-notes" className="text-xs">Notes (optional)</Label>
            <Textarea
              id="vt-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything coordinators should know about this room…"
              className="max-lg:text-base"
            />
          </div>
        </div>

        <DialogFooter className="px-6 max-lg:px-4 py-3 border-t bg-muted/30 gap-2 max-lg:gap-3 flex-row">
          <Button
            variant="outline"
            className="lv-premium-shade h-9 max-lg:h-11 max-lg:flex-1 max-lg:text-base order-2 bg-white text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="reception-primary-action lv-premium-shade h-9 max-lg:h-11 max-lg:flex-1 max-lg:text-base bg-[#967A59] hover:bg-[#7a6347] text-white order-1 ml-auto max-lg:ml-0"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {submitting ? 'Submitting…' : 'Submit for review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
