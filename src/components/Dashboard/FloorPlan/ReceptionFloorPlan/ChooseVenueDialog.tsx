import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, MapPin, Users, Ruler, Sparkles, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useApprovedVenueTemplates,
  venueTemplateBackgroundUrl,
  applyVenueTemplateToPlan,
  type VenueTemplate,
} from '@/hooks/useVenueTemplates';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: ReceptionFloorPlan;
  onApply: (mutator: (p: ReceptionFloorPlan) => ReceptionFloorPlan) => void;
}

export const ChooseVenueDialog = ({ open, onOpenChange, plan, onApply }: Props) => {
  const { templates, loading } = useApprovedVenueTemplates();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('all');
  const [capacityBand, setCapacityBand] = useState('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const countries = useMemo(() => {
    const s = new Set<string>();
    templates.forEach((t) => { if (t.country) s.add(t.country); });
    return Array.from(s).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (featuredOnly && !t.featured) return false;
      if (country !== 'all' && (t.country ?? '') !== country) return false;
      if (capacityBand !== 'all') {
        const c = t.capacity;
        if (capacityBand === 's' && !(c > 0 && c <= 80)) return false;
        if (capacityBand === 'm' && !(c > 80 && c <= 200)) return false;
        if (capacityBand === 'l' && !(c > 200)) return false;
      }
      if (!q) return true;
      const hay = `${t.venue_name} ${t.room_name} ${t.city ?? ''} ${t.country ?? ''} ${t.capacity}`.toLowerCase();
      return hay.includes(q);
    });
  }, [templates, query, country, capacityBand, featuredOnly]);

  const selected = useMemo(
    () => filtered.find((t) => t.id === selectedId) || templates.find((t) => t.id === selectedId) || null,
    [filtered, templates, selectedId]
  );

  const handleApply = async () => {
    if (!selected) return;
    setApplying(true);
    try {
      const next = await applyVenueTemplateToPlan(selected, plan);
      onApply(() => next);
      toast({
        title: 'Venue template applied',
        description: `${selected.venue_name} — ${selected.room_name} loaded. Drag your tables in to seat guests.`,
      });
      onOpenChange(false);
      setSelectedId(null);
    } catch (e) {
      console.error('apply template', e);
      toast({
        title: 'Could not apply template',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="reception-portal-surface max-w-4xl max-lg:max-w-[calc(100vw-1.5rem)] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 max-lg:px-4 pt-6 max-lg:pt-5 pb-3 border-b">
          <DialogTitle className="text-lg max-lg:text-center flex items-center gap-2 max-lg:justify-center">
            <Building2 className="w-5 h-5 text-primary" />
            Choose a venue template
          </DialogTitle>
          <p className="text-xs text-muted-foreground max-lg:text-center pt-1">
            Load an approved venue layout. Your tables stay in your event — only the room shape,
            fixtures, and venue background are applied.
          </p>
        </DialogHeader>

        <div className="px-6 max-lg:px-4 pt-3 pb-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by venue, room, or city…"
              className="pl-9 h-10 max-lg:h-11 max-lg:text-base"
            />
          </div>
          <div className="flex flex-wrap gap-2 max-lg:grid max-lg:grid-cols-2">
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-9 max-lg:h-11 max-lg:text-base flex-1 min-w-[140px]"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent className="reception-portal-surface">
                <SelectItem value="all">All countries</SelectItem>
                {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={capacityBand} onValueChange={setCapacityBand}>
              <SelectTrigger className="h-9 max-lg:h-11 max-lg:text-base flex-1 min-w-[140px]"><SelectValue placeholder="Capacity" /></SelectTrigger>
              <SelectContent className="reception-portal-surface">
                <SelectItem value="all">Any capacity</SelectItem>
                <SelectItem value="s">Up to 80</SelectItem>
                <SelectItem value="m">81–200</SelectItem>
                <SelectItem value="l">200+</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={featuredOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFeaturedOnly((v) => !v)}
              className="lv-premium-shade h-9 max-lg:h-11 max-lg:text-base"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Featured only
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 max-lg:px-4 pb-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading venue directory…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">
              No approved venues match your search yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((t) => {
                const isSelected = selectedId === t.id;
                const thumb = venueTemplateBackgroundUrl(t.background_image_path);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`text-left rounded-xl border bg-card overflow-hidden transition-all lv-premium-shade ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/40 shadow-md'
                        : 'border-border hover:border-primary/60 hover:shadow-sm'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-muted/40 flex items-center justify-center overflow-hidden">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={`${t.venue_name} ${t.room_name}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Building2 className="w-10 h-10 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-foreground truncate">
                            {t.venue_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{t.room_name}</div>
                        </div>
                        {t.featured && (
                          <Badge variant="secondary" className="shrink-0 gap-1">
                            <Sparkles className="w-3 h-3" /> Featured
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1">
                        {t.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {t.city}
                            {t.country ? `, ${t.country}` : ''}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" /> {t.capacity} cap
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Ruler className="w-3 h-3" /> {t.room_width_m}×{t.room_length_m}m
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 max-lg:px-4 py-3 border-t bg-muted/30 gap-2 max-lg:gap-3 flex-row max-lg:flex-row">
          <Button
            variant="outline"
            className="lv-premium-shade h-9 max-lg:h-11 max-lg:flex-1 max-lg:text-base order-2 max-lg:order-2 bg-white text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="reception-primary-action lv-premium-shade h-9 max-lg:h-11 max-lg:flex-1 max-lg:text-base bg-[#967A59] hover:bg-[#7a6347] text-white order-1 max-lg:order-1 ml-auto max-lg:ml-0"
            onClick={handleApply}
            disabled={!selected || applying}
          >
            {applying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {applying ? 'Applying…' : selected ? `Use ${selected.venue_name}` : 'Select a venue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
