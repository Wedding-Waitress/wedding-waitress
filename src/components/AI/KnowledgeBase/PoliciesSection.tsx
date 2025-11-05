import { useState, useEffect } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Save, UserPlus, Baby, Camera, Smartphone } from 'lucide-react';
import { KnowledgeBaseEntry } from '@/hooks/useKnowledgeBase';

interface PoliciesSectionProps {
  policiesEntry: KnowledgeBaseEntry | undefined;
  onSave: (entry: Partial<KnowledgeBaseEntry>) => Promise<boolean>;
}

interface Policies {
  noPlusOnes: boolean;
  adultsOnly: boolean;
  unpluggedCeremony: boolean;
  socialMediaOk: boolean;
  giftRegistry: string;
  dressCode: string;
  dressCodeDetails: string;
  dressCodeNotes: string;
  rsvpDeadline: string;
  healthProtocols: string;
  customPolicies: string;
}

export const PoliciesSection = ({ policiesEntry, onSave }: PoliciesSectionProps) => {
  const [policies, setPolicies] = useState<Policies>({
    noPlusOnes: false,
    adultsOnly: false,
    unpluggedCeremony: false,
    socialMediaOk: true,
    giftRegistry: '',
    dressCode: '',
    dressCodeDetails: '',
    dressCodeNotes: '',
    rsvpDeadline: '',
    healthProtocols: '',
    customPolicies: ''
  });

  useEffect(() => {
    if (policiesEntry?.answer) {
      try {
        const parsed = JSON.parse(policiesEntry.answer);
        setPolicies(parsed);
      } catch (e) {
        console.error('Failed to parse policies:', e);
      }
    }
  }, [policiesEntry]);

  const updatePolicy = (field: keyof Policies, value: string | boolean) => {
    setPolicies((prev) => ({ ...prev, [field]: value }));
  };

  const savePolicies = async () => {
    await onSave({
      id: policiesEntry?.id,
      category: 'policies',
      answer: JSON.stringify(policies),
      sort_order: 0,
      is_active: true
    });
  };

  return (
    <AccordionItem value="policies">
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          <span>Policies & Rules</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Quick Policies</Label>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">No Plus Ones</p>
                  <p className="text-sm text-muted-foreground">Only invited guests allowed</p>
                </div>
              </div>
              <Switch
                checked={policies.noPlusOnes}
                onCheckedChange={(v) => updatePolicy('noPlusOnes', v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Baby className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Adults Only</p>
                  <p className="text-sm text-muted-foreground">No children under 18</p>
                </div>
              </div>
              <Switch
                checked={policies.adultsOnly}
                onCheckedChange={(v) => updatePolicy('adultsOnly', v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Unplugged Ceremony</p>
                  <p className="text-sm text-muted-foreground">No phones/cameras during ceremony</p>
                </div>
              </div>
              <Switch
                checked={policies.unpluggedCeremony}
                onCheckedChange={(v) => updatePolicy('unpluggedCeremony', v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Social Media Sharing</p>
                  <p className="text-sm text-muted-foreground">Guests can post photos</p>
                </div>
              </div>
              <Switch
                checked={policies.socialMediaOk}
                onCheckedChange={(v) => updatePolicy('socialMediaOk', v)}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-base font-semibold">Gift Registry</Label>
            <Textarea
              placeholder="We're registered at Target and Amazon. Your presence is the best gift, but if you wish to contribute, we'd be grateful."
              rows={3}
              value={policies.giftRegistry}
              onChange={(e) => updatePolicy('giftRegistry', e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-base font-semibold">Dress Code</Label>
            <Select value={policies.dressCode} onValueChange={(v) => updatePolicy('dressCode', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select dress code" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="white-tie">White Tie (Ultra Formal)</SelectItem>
                <SelectItem value="black-tie">Black Tie</SelectItem>
                <SelectItem value="black-tie-optional">Black Tie Optional</SelectItem>
                <SelectItem value="formal">Formal / Cocktail Attire</SelectItem>
                <SelectItem value="semi-formal">Semi-Formal</SelectItem>
                <SelectItem value="dressy-casual">Dressy Casual</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="themed">Themed (Custom)</SelectItem>
              </SelectContent>
            </Select>
            {policies.dressCode === 'themed' && (
              <Input
                placeholder="Describe your theme (e.g., Tropical, Vintage, Garden Party)"
                value={policies.dressCodeDetails}
                onChange={(e) => updatePolicy('dressCodeDetails', e.target.value)}
              />
            )}
            <Textarea
              placeholder="Additional dress code guidance (optional)"
              rows={2}
              value={policies.dressCodeNotes}
              onChange={(e) => updatePolicy('dressCodeNotes', e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-base font-semibold">RSVP Deadline</Label>
            <Input
              type="date"
              value={policies.rsvpDeadline}
              onChange={(e) => updatePolicy('rsvpDeadline', e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-base font-semibold">Health & Safety (Optional)</Label>
            <Textarea
              placeholder="Any health protocols guests should be aware of..."
              rows={2}
              value={policies.healthProtocols}
              onChange={(e) => updatePolicy('healthProtocols', e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-base font-semibold">Additional Policies</Label>
            <Textarea
              placeholder="Any other rules or requests for guests..."
              rows={3}
              value={policies.customPolicies}
              onChange={(e) => updatePolicy('customPolicies', e.target.value)}
            />
          </div>

          <Button onClick={savePolicies} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save Policies
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
