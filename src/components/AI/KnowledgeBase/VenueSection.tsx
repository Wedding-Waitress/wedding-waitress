import { useState, useEffect } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Save } from 'lucide-react';
import { KnowledgeBaseEntry } from '@/hooks/useKnowledgeBase';

interface VenueSectionProps {
  venueEntry: KnowledgeBaseEntry | undefined;
  eventVenue?: string;
  onSave: (entry: Partial<KnowledgeBaseEntry>) => Promise<boolean>;
}

interface VenueInfo {
  directions: string;
  parking: string;
  accessibility: string;
  hotels: string;
  weather: string;
  mapLink: string;
}

export const VenueSection = ({ venueEntry, eventVenue, onSave }: VenueSectionProps) => {
  const [venueInfo, setVenueInfo] = useState<VenueInfo>({
    directions: '',
    parking: '',
    accessibility: '',
    hotels: '',
    weather: '',
    mapLink: ''
  });

  useEffect(() => {
    if (venueEntry?.answer) {
      try {
        const parsed = JSON.parse(venueEntry.answer);
        setVenueInfo(parsed);
      } catch (e) {
        console.error('Failed to parse venue info:', e);
      }
    }
  }, [venueEntry]);

  const updateField = (field: keyof VenueInfo, value: string) => {
    setVenueInfo((prev) => ({ ...prev, [field]: value }));
  };

  const saveVenueInfo = async () => {
    await onSave({
      id: venueEntry?.id,
      category: 'venue',
      answer: JSON.stringify(venueInfo),
      sort_order: 0,
      is_active: true
    });
  };

  return (
    <AccordionItem value="venue">
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          <span>Venue Information</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          {eventVenue && (
            <div className="bg-muted p-4 rounded-lg">
              <Label className="text-xs text-muted-foreground">Venue Name</Label>
              <p className="font-medium">{eventVenue}</p>
            </div>
          )}

          <div>
            <Label>Detailed Directions</Label>
            <Textarea
              placeholder="From downtown, take Highway 101 North. Exit at Main Street..."
              rows={4}
              value={venueInfo.directions}
              onChange={(e) => updateField('directions', e.target.value)}
            />
          </div>

          <div>
            <Label>Parking Instructions</Label>
            <Textarea
              placeholder="Free parking available in the main lot. Enter from Oak Street. Valet service available at main entrance ($15)."
              rows={3}
              value={venueInfo.parking}
              onChange={(e) => updateField('parking', e.target.value)}
            />
          </div>

          <div>
            <Label>Accessibility Information</Label>
            <Textarea
              placeholder="The venue is fully wheelchair accessible. Accessible parking is available near the main entrance."
              rows={2}
              value={venueInfo.accessibility}
              onChange={(e) => updateField('accessibility', e.target.value)}
            />
          </div>

          <div>
            <Label>Nearby Hotels (for out-of-town guests)</Label>
            <Textarea
              placeholder="Hilton Downtown (5 min drive) - mention 'Wedding Group' for discount"
              rows={4}
              value={venueInfo.hotels}
              onChange={(e) => updateField('hotels', e.target.value)}
            />
          </div>

          <div>
            <Label>Weather Considerations</Label>
            <Textarea
              placeholder="Ceremony is outdoors. In case of rain, we'll move to the indoor ballroom. Bring a light jacket for evening."
              rows={2}
              value={venueInfo.weather}
              onChange={(e) => updateField('weather', e.target.value)}
            />
          </div>

          <div>
            <Label>Google Maps Link (optional)</Label>
            <Input
              placeholder="https://maps.google.com/..."
              value={venueInfo.mapLink}
              onChange={(e) => updateField('mapLink', e.target.value)}
            />
          </div>

          <Button onClick={saveVenueInfo} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save Venue Information
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
