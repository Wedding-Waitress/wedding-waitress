import {supabase} from '@/integrations/supabase/client';
import {RequestVenueFloorPlanDialog} from './RequestVenueFloorPlanDialog';
import {venueCountries,venueRegions,matchesVenueLocation} from '@/lib/venueLocations';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';


import { Loader2, Building2, X, Check, CircleArrowRight, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useApprovedVenueTemplates,
  applyVenueTemplateToPlan,

} from '@/hooks/useVenueTemplates';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: ReceptionFloorPlan;
  onApply: (mutator: (p: ReceptionFloorPlan) => ReceptionFloorPlan) => void;
}

export const ChooseVenueDialog = ({ open, onOpenChange, plan, onApply }: Props) => {
  const { templates, loading, refresh } = useApprovedVenueTemplates();
  useEffect(() => { if (open) void refresh(); }, [open, refresh]);
  const { toast } = useToast();
  const [owner,setOwner]=useState(false);
  const [deleteTarget,setDeleteTarget]=useState<{id:string;venue_name:string;room_name:string;background_image_path:string|null}|null>(null);
  const [deleting,setDeleting]=useState(false);
  useEffect(()=>{let active=true;setOwner(false);if(open)void supabase.rpc('has_platform_owner_access').then(({data,error})=>{if(active)setOwner(!error&&data===true)});return()=>{active=false}},[open]);
  const deleteVenue=async()=>{if(!owner||!deleteTarget)return;setDeleting(true);try{const {data,error}=await supabase.from('venue_floor_plan_templates').delete().eq('id',deleteTarget.id).select('id');if(error)throw error;if(!data?.length)throw Error('Only the platform owner can delete this template.');if(deleteTarget.background_image_path){const {error:storageError}=await supabase.storage.from('venue-template-backgrounds').remove([deleteTarget.background_image_path]);if(storageError)console.warn('Template removed; image cleanup pending',storageError.message);}setSelectedId(null);setDeleteTarget(null);await refresh();toast({title:'Venue template deleted',description:'Removed from the shared venue library.'});}catch(e){toast({title:'Could not delete template',description:e instanceof Error?e.message:'Please try again.',variant:'destructive'});}finally{setDeleting(false)}};
  const [query, setQuery] = useState('');
  const [requestOpen,setRequestOpen]=useState(false);
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [suburb, setSuburb] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const regions = useMemo(()=>venueRegions(country),[country]);
  const searchReady = !!country.trim() && !!region.trim();
  const filtered = useMemo(()=>!country.trim() || !region.trim() ? [] : templates.filter(t=>matchesVenueLocation(t,country,region,query,suburb)),[templates,country,region,query,suburb]);
  const selected = useMemo(
    () => filtered.find((t) => t.id === selectedId) || null,
    [filtered, selectedId]
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
      setConfirmOpen(false);
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
            Lookup Venue Floor Plan Template
          </DialogTitle>
          <p className="text-xs text-muted-foreground max-lg:text-center pt-1">
            Browse venue templates from Australia and around the world. Select a template, then click Use This Floor Plan Template to replace the current layout with an empty venue floor plan. Add tables and fixtures manually; your Tables page and guest assignments remain saved.
          </p>
        </DialogHeader>

        <div className="px-6 max-lg:px-4 pt-3 pb-2 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label className="block mb-2" htmlFor="lookup-country">Country</Label><Input id="lookup-country" list="lookup-countries" placeholder="Choose or type a country" value={country} onChange={e=>{setCountry(e.target.value);setRegion('');setSuburb('');setQuery('');setSelectedId(null);}} /><datalist id="lookup-countries">{venueCountries.map(c=><option key={c.code} value={c.name}/>)}</datalist></div>
            <div><Label className="block mb-2" htmlFor="lookup-region">State / Region</Label><Input id="lookup-region" list="lookup-regions" disabled={!country} placeholder="Choose or type a state / region" value={region} onChange={e=>{setRegion(e.target.value);setSuburb('');setQuery('');setSelectedId(null);}} /><datalist id="lookup-regions">{regions.map(s=><option key={s} value={s}/>)}</datalist></div>
            <div><Label className="block mb-2" htmlFor="lookup-suburb">Suburb / City (optional)</Label><Input id="lookup-suburb" disabled={!searchReady} value={suburb} onChange={e=>{setSuburb(e.target.value);setSelectedId(null);}} placeholder="Search by suburb or city…" /></div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3"><div className="flex-1 min-w-0"><Label className="block mb-2" htmlFor="lookup-venue">Venue name</Label><Input id="lookup-venue" disabled={!searchReady} value={query} onChange={e=>{setQuery(e.target.value);setSelectedId(null);}} placeholder="Search by venue name…" /></div><Button variant="outline" className="lv-premium-shade !rounded-full shrink-0" onClick={()=>setRequestOpen(true)}>Request Your Venue Floor Plan</Button></div>
        </div>

        <div className="flex-1 min-h-0 max-h-[280px] overflow-y-auto px-6 max-lg:px-4 pb-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading venue templates…
            </div>
          ) : !searchReady || filtered.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">
              {!searchReady ? 'Choose a country and state / region to find venue floor plan templates.' : 'No venue templates match your search yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 auto-rows-[44px] gap-3">
              {filtered.map((t) => {
                const isSelected = selectedId === t.id;
                return (
                  <div key={t.id} className="relative min-w-0">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedId(t.id)}
                    className={`${owner ? 'pr-36' : ''} venue-result-card w-full h-full text-left rounded-xl border bg-card overflow-hidden transition-all lv-premium-shade ${
                      isSelected
                        ? 'reception-primary-action border-0 shadow-md'
                        : 'border-border hover:border-primary/60 hover:shadow-sm'
                    }`}
                  >
                    <div className="px-3 py-1.5">
                      <div className="flex items-center gap-3"><CircleArrowRight aria-hidden="true" className="w-6 h-6 shrink-0" />
                        <div className="min-w-0 flex flex-wrap items-baseline gap-x-8 gap-y-1">
                          <div className="font-semibold text-sm text-foreground truncate">
                            {t.venue_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{t.room_name}</div>
                          {t.state_region && <div className="text-xs text-muted-foreground">{t.state_region}</div>}
                        </div>
                      </div>
                    </div>
                  </button>
                  {owner&&<Button type="button" aria-label={`Admin Delete ${t.venue_name} ${t.room_name}`} className="venue-cancel-action lv-premium-shade !rounded-full absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3 gap-1 border-0 !text-white" onClick={e=>{e.stopPropagation();setDeleteTarget(t)}}><Trash2 className="w-4 h-4 !text-white"/>Admin Delete</Button>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 max-lg:px-4 py-3 border-t bg-muted/30 gap-2 max-lg:gap-3 flex-row max-lg:flex-row">
            <Button
              type="button"
              size="sm"
              className="reception-primary-action lv-premium-shade !rounded-full h-9 max-lg:h-11 max-lg:text-base border-0 text-white max-lg:flex-1 order-1"
              onClick={() => setConfirmOpen(true)}
              disabled={!selected || applying}
            >
              {applying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2 !text-white" />}
              {applying ? 'Applying…' : 'Use This Floor Plan Template'}
            </Button>
          <Button
            variant="outline"
            className="venue-cancel-action lv-premium-shade h-9 max-lg:h-11 max-lg:flex-1 max-lg:text-base order-2 border-0 text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4 mr-2 !text-white" /> Cancel
          </Button>

        </DialogFooter>
        <AlertDialog open={confirmOpen} onOpenChange={(value) => { if (!applying) setConfirmOpen(value); }}>
          <AlertDialogContent className="reception-portal-surface max-w-[calc(100vw-2rem)] sm:max-w-lg rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Replace your current floor plan?</AlertDialogTitle>
              <AlertDialogDescription>
                Using {selected?.venue_name || 'this venue template'} will override your existing floor plan, including the default layout and any changes you have made. Only the venue floor plan template will remain. You will need to add and position all tables, the dance floor, DJ / band and every other fixture again. Your saved tables and guest assignments on the Tables page will remain unchanged.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row justify-end gap-2">
              <AlertDialogAction disabled={applying || !selected} className="reception-primary-action lv-premium-shade !rounded-full border-0 text-white" onClick={(event) => { event.preventDefault(); void handleApply(); }}>
                <Check className="w-4 h-4 mr-2 !text-white" />{applying ? 'Applying…' : 'Use This Floor Plan Template'}
              </AlertDialogAction>
              <AlertDialogCancel disabled={applying} className="venue-cancel-action lv-premium-shade !rounded-full mt-0 border-0"><X className="w-4 h-4 mr-2 !text-white" />Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={!!deleteTarget} onOpenChange={v=>{if(!v&&!deleting)setDeleteTarget(null)}}><AlertDialogContent className="reception-portal-surface"><AlertDialogHeader><AlertDialogTitle>Delete this venue template?</AlertDialogTitle><AlertDialogDescription>{deleteTarget?.venue_name} — {deleteTarget?.room_name} will be removed from the shared library. Floor plans already applied to events will remain unchanged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction disabled={deleting} className="venue-cancel-action lv-premium-shade !rounded-full" onClick={e=>{e.preventDefault();void deleteVenue()}}><Trash2 className="mr-2 w-4 h-4"/>{deleting?'Deleting…':'Admin Delete'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <RequestVenueFloorPlanDialog open={requestOpen} onOpenChange={setRequestOpen} />
      </DialogContent>
    </Dialog>
  );
};
