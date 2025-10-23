import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface HeaderOverrides {
  dj_name?: string;
  dj_mobile?: string;
  mc_name?: string;
  mc_mobile?: string;
  ceremony_start?: string;
  ceremony_finish?: string;
  canapes_start?: string;
  canapes_finish?: string;
  reception_start?: string;
  reception_finish?: string;
  venue_override?: string;
}

interface HeaderOverridesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentOverrides: Record<string, any>;
  onSave: (overrides: HeaderOverrides) => Promise<void>;
}

export const HeaderOverridesModal = ({
  open,
  onOpenChange,
  currentOverrides,
  onSave,
}: HeaderOverridesModalProps) => {
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<HeaderOverrides>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setOverrides(currentOverrides as HeaderOverrides);
    }
  }, [open, currentOverrides]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(overrides);
      toast({
        title: 'Header Updated',
        description: 'Header details have been saved successfully',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save header details',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Header Details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Venue */}
          <div className="space-y-2">
            <Label htmlFor="venue_override">Venue Name (Override)</Label>
            <Input
              id="venue_override"
              value={overrides.venue_override || ''}
              onChange={(e) => setOverrides({ ...overrides, venue_override: e.target.value })}
              placeholder="Override venue name"
            />
          </div>

          {/* DJ Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dj_name">DJ Name</Label>
              <Input
                id="dj_name"
                value={overrides.dj_name || ''}
                onChange={(e) => setOverrides({ ...overrides, dj_name: e.target.value })}
                placeholder="DJ name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dj_mobile">DJ Mobile</Label>
              <Input
                id="dj_mobile"
                type="tel"
                value={overrides.dj_mobile || ''}
                onChange={(e) => setOverrides({ ...overrides, dj_mobile: e.target.value })}
                placeholder="DJ mobile number"
              />
            </div>
          </div>

          {/* MC Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mc_name">MC Name</Label>
              <Input
                id="mc_name"
                value={overrides.mc_name || ''}
                onChange={(e) => setOverrides({ ...overrides, mc_name: e.target.value })}
                placeholder="MC name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc_mobile">MC Mobile</Label>
              <Input
                id="mc_mobile"
                type="tel"
                value={overrides.mc_mobile || ''}
                onChange={(e) => setOverrides({ ...overrides, mc_mobile: e.target.value })}
                placeholder="MC mobile number"
              />
            </div>
          </div>

          {/* Ceremony Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ceremony_start">Ceremony Start</Label>
              <Input
                id="ceremony_start"
                type="time"
                value={overrides.ceremony_start || ''}
                onChange={(e) => setOverrides({ ...overrides, ceremony_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ceremony_finish">Ceremony Finish</Label>
              <Input
                id="ceremony_finish"
                type="time"
                value={overrides.ceremony_finish || ''}
                onChange={(e) => setOverrides({ ...overrides, ceremony_finish: e.target.value })}
              />
            </div>
          </div>

          {/* Canapés Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="canapes_start">Canapés Start</Label>
              <Input
                id="canapes_start"
                type="time"
                value={overrides.canapes_start || ''}
                onChange={(e) => setOverrides({ ...overrides, canapes_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="canapes_finish">Canapés Finish</Label>
              <Input
                id="canapes_finish"
                type="time"
                value={overrides.canapes_finish || ''}
                onChange={(e) => setOverrides({ ...overrides, canapes_finish: e.target.value })}
              />
            </div>
          </div>

          {/* Reception Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reception_start">Reception Start</Label>
              <Input
                id="reception_start"
                type="time"
                value={overrides.reception_start || ''}
                onChange={(e) => setOverrides({ ...overrides, reception_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reception_finish">Reception Finish</Label>
              <Input
                id="reception_finish"
                type="time"
                value={overrides.reception_finish || ''}
                onChange={(e) => setOverrides({ ...overrides, reception_finish: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: '#6D28D9', color: 'white' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
