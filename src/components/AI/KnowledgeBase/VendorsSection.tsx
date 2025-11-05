import { useState } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Plus, Edit2, Trash2, Phone, Globe } from 'lucide-react';
import { KnowledgeBaseEntry } from '@/hooks/useKnowledgeBase';
import { VENDOR_ICONS } from '@/lib/knowledgeTemplates';

interface VendorsSectionProps {
  vendors: KnowledgeBaseEntry[];
  onSave: (entry: Partial<KnowledgeBaseEntry>) => Promise<boolean>;
  onDelete: (id: string) => void;
}

interface VendorData {
  type: string;
  name: string;
  contact: string;
  website: string;
  notes: string;
}

export const VendorsSection = ({ vendors, onSave, onDelete }: VendorsSectionProps) => {
  const [newVendor, setNewVendor] = useState<VendorData>({
    type: '',
    name: '',
    contact: '',
    website: '',
    notes: ''
  });

  const addVendor = async () => {
    if (!newVendor.type || !newVendor.name) return;

    const success = await onSave({
      category: 'vendors',
      answer: JSON.stringify(newVendor),
      sort_order: vendors.length,
      is_active: true
    });

    if (success) {
      setNewVendor({ type: '', name: '', contact: '', website: '', notes: '' });
    }
  };

  const parseVendor = (answer: string): VendorData => {
    try {
      return JSON.parse(answer);
    } catch {
      return { type: '', name: '', contact: '', website: '', notes: answer };
    }
  };

  return (
    <AccordionItem value="vendors">
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          <span>Vendors & Services</span>
          <Badge variant="secondary">{vendors.length} vendors</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          {vendors.map((vendor) => {
            const data = parseVendor(vendor.answer);
            return (
              <Card key={vendor.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{VENDOR_ICONS[data.type] || VENDOR_ICONS.other}</span>
                      <div>
                        <CardTitle className="text-lg">{data.name}</CardTitle>
                        <CardDescription>{data.type}</CardDescription>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(vendor.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {data.contact && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{data.contact}</span>
                      </div>
                    )}
                    {data.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {data.website}
                        </a>
                      </div>
                    )}
                    {data.notes && (
                      <p className="text-muted-foreground mt-2">{data.notes}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Card className="border-dashed border-2">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Vendor Type</Label>
                    <Select value={newVendor.type} onValueChange={(v) => setNewVendor({ ...newVendor, type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="photographer">📸 Photographer</SelectItem>
                        <SelectItem value="videographer">🎥 Videographer</SelectItem>
                        <SelectItem value="dj">🎵 DJ / Band</SelectItem>
                        <SelectItem value="caterer">🍽️ Caterer</SelectItem>
                        <SelectItem value="florist">💐 Florist</SelectItem>
                        <SelectItem value="planner">📋 Planner</SelectItem>
                        <SelectItem value="makeup">💄 Makeup Artist</SelectItem>
                        <SelectItem value="other">🔧 Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Vendor Name</Label>
                    <Input
                      placeholder="Smith Photography"
                      value={newVendor.name}
                      onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Contact Info</Label>
                  <Input
                    placeholder="(555) 123-4567 or info@vendor.com"
                    value={newVendor.contact}
                    onChange={(e) => setNewVendor({ ...newVendor, contact: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Website (optional)</Label>
                  <Input
                    placeholder="https://vendorwebsite.com"
                    value={newVendor.website}
                    onChange={(e) => setNewVendor({ ...newVendor, website: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Notes for Guests</Label>
                  <Textarea
                    placeholder="Available for candid shots throughout the event. Feel free to ask for family photos!"
                    rows={2}
                    value={newVendor.notes}
                    onChange={(e) => setNewVendor({ ...newVendor, notes: e.target.value })}
                  />
                </div>
                <Button onClick={addVendor} className="w-full" disabled={!newVendor.type || !newVendor.name}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vendor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
