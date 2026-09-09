import {venueCountries,venueRegions} from '@/lib/venueLocations';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitVenueTemplate } from '@/hooks/useVenueTemplates';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: ReceptionFloorPlan;
  backgroundUrl: string | null;
  uploading: boolean;
  onUpload: (file: File) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export const SubmitTemplateDialog = ({ open, onOpenChange, plan, backgroundUrl, uploading, onUpload }: Props) => {
  const { toast } = useToast();
  const [venueName, setVenueName] = useState('');
  const [venueEmail, setVenueEmail] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueContactNumber, setVenueContactNumber] = useState('');
  const [roomName, setRoomName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [stateRegion,setStateRegion]=useState('');
  const [capacity, setCapacity] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [choosingUpload, setChoosingUpload] = useState(false);
  const [uploadedName, setUploadedName] = useState('');
  const handleUpload = async (file?: File) => {
    if (!file) return;
    setChoosingUpload(true);
    try {
      const result = await onUpload(file);
      if (result.ok === false) throw new Error(result.error);
      setUploadedName(file.name);
      toast({ title: 'Venue floor plan uploaded', description: 'Your floor plan is ready to include with this template.' });
    } catch (error) {
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setChoosingUpload(false);
    }
  };

  const reset = () => {
    setVenueName('');
    setVenueEmail('');
    setVenueAddress('');
    setVenueContactNumber('');
    setRoomName('');
    setCity('');
    setCountry('');
    setStateRegion('');
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
        venue_email: venueEmail,
        venue_address: venueAddress,
        venue_contact_number: venueContactNumber,
        room_name: roomName,
        city,
        country,
        state_region: stateRegion,
        capacity,
        notes,
      },
    });
    setSubmitting(false);
    if (res.ok === true) {
      toast({
        title: 'Template saved',
        description:
          'Your venue template is now in the shared worldwide library. Select Look Up Venue Template to use it.',
      });
      reset();
      onOpenChange(false);
    } else {
      toast({ title: 'Could not save template', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="reception-portal-surface max-w-lg max-lg:max-w-[calc(100vw-1.5rem)] p-0 max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="px-6 max-lg:px-4 pt-6 max-lg:pt-5 pb-3 border-b">
          <DialogTitle className="text-lg max-lg:text-center flex items-center gap-2 max-lg:justify-center">
            <UploadCloud className="w-5 h-5 text-primary" />
            Save Venue Template
          </DialogTitle>
          <p className="text-xs text-muted-foreground max-lg:text-center pt-1">
            Saving shares this venue floor plan, address, phone, email and notes with other Wedding Waitress users worldwide. Tables and fixtures are not included. Only upload plans you have permission to share.
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
              <Label htmlFor="vt-country" className="text-xs">Country</Label>
              <Input
                id="vt-country" list="save-countries"
                value={country}
                onChange={(e) => {setCountry(e.target.value);setStateRegion('');}}
                className="h-10 max-lg:h-11 max-lg:text-base"
                placeholder="Australia"
              />
            </div>
            <datalist id="save-countries">{venueCountries.map(c=><option key={c.code} value={c.name}/>)}</datalist>
            <div className="space-y-1"><Label htmlFor="vt-state">State / Region</Label><Input id="vt-state" list="save-regions" value={stateRegion} onChange={e=>setStateRegion(e.target.value)} placeholder="Choose or type a state / region" /><datalist id="save-regions">{venueRegions(country).map(s=><option key={s} value={s}/>)}</datalist></div>
            <div className="space-y-1">
              <Label htmlFor="vt-city" className="text-xs">Suburb / City (optional)</Label>
              <Input
                id="vt-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-10 max-lg:h-11 max-lg:text-base"
                placeholder="Sydney"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vt-address" className="text-xs">Venue Address</Label>
              <Input id="vt-address" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} className="h-10 max-lg:h-11 max-lg:text-base" placeholder="Street address" />
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
              <Label htmlFor="vt-contact-number" className="text-xs">Venue Contact Number</Label>
              <Input id="vt-contact-number" type="tel" value={venueContactNumber} onChange={(e) => setVenueContactNumber(e.target.value)} className="h-10 max-lg:h-11 max-lg:text-base" placeholder="e.g. 02 1234 5678" />
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
              <Label htmlFor="vt-email" className="text-xs">Venue Email</Label>
              <Input id="vt-email" type="email" value={venueEmail} onChange={(e) => setVenueEmail(e.target.value)} className="h-10 max-lg:h-11 max-lg:text-base" placeholder="e.g. events@venue.com.au" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="vt-floor-plan" className="text-xs">Upload Venue Floor Plan Template</Label>
              <Input
                id="vt-floor-plan"
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                disabled={uploading || choosingUpload || submitting}
                className="h-auto min-h-10 max-lg:min-h-11 text-xs"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  e.currentTarget.value = '';
                  void handleUpload(file);
                }}
              />
              <p className="text-xs text-muted-foreground" role="status">
                {uploading || choosingUpload ? 'Uploading…' : uploadedName || (plan.background.path ? 'Current venue floor plan attached.' : 'PNG, JPG or PDF, up to 25 MB. PDFs use page 1.')}
              </p>
              <p className="text-xs text-muted-foreground">This also updates your reception background.</p>
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
            className="venue-cancel-action lv-premium-shade !rounded-full h-9 max-lg:h-11 max-lg:flex-1 max-lg:text-base order-2 border-0 text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4 mr-2 !text-white" /> Cancel
          </Button>
          <Button
            className="reception-primary-action lv-premium-shade !rounded-full border-0 h-9 max-lg:h-11 max-lg:flex-1 max-lg:text-base text-white order-1 ml-auto max-lg:ml-0"
            onClick={handleSubmit}
            disabled={submitting || uploading || choosingUpload || (!!plan.background.path && !backgroundUrl)}
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2 !text-white" />}
            {submitting ? 'Saving…' : 'Save Floor Plan Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
