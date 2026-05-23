import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Star,
  StarOff,
  Trash2,
  Search,
  MapPin,
  Users,
  Ruler,
  Building2,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useAllVenueTemplates,
  venueTemplateBackgroundUrl,
  type VenueTemplate,
} from '@/hooks/useVenueTemplates';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export const AdminVenueTemplates = () => {
  const { templates, loading, setApproval, setFeatured, updateMeta, remove } =
    useAllVenueTemplates();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<VenueTemplate | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (filter === 'pending' && t.approved) return false;
      if (filter === 'approved' && !t.approved) return false;
      if (!q) return true;
      return `${t.venue_name} ${t.room_name} ${t.city ?? ''} ${t.country ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [templates, query, filter]);

  const handle = async <T,>(id: string, p: Promise<T>) => {
    setBusyId(id);
    try {
      await p;
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = templates.filter((t) => !t.approved).length;
  const approvedCount = templates.filter((t) => t.approved).length;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5" style={{ color: '#967A59' }} />
            <h2 className="text-lg font-semibold">Venue Template Directory</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={filter === 'pending' ? 'default' : 'outline'}
              className="lv-premium-shade"
              onClick={() => setFilter('pending')}
            >
              Pending ({pendingCount})
            </Button>
            <Button
              size="sm"
              variant={filter === 'approved' ? 'default' : 'outline'}
              className="lv-premium-shade"
              onClick={() => setFilter('approved')}
            >
              Approved ({approvedCount})
            </Button>
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              className="lv-premium-shade"
              onClick={() => setFilter('all')}
            >
              All ({templates.length})
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by venue, room, or city…"
            className="pl-9 h-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading templates…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">
            No templates {filter !== 'all' ? `in ${filter} state` : 'yet'}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((t) => {
              const thumb = venueTemplateBackgroundUrl(t.background_image_path);
              const busy = busyId === t.id;
              return (
                <div
                  key={t.id}
                  className="rounded-xl border bg-card overflow-hidden flex flex-col"
                >
                  <div className="aspect-[4/3] bg-muted/40 flex items-center justify-center relative">
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
                    <div className="absolute top-2 left-2 flex gap-1">
                      {t.approved ? (
                        <Badge className="gap-1 bg-green-600 hover:bg-green-600">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      {t.featured && (
                        <Badge className="gap-1 bg-amber-500 hover:bg-amber-500">
                          <Star className="w-3 h-3" /> Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-3 space-y-2 flex-1 flex flex-col">
                    <div>
                      <div className="font-semibold text-sm truncate">{t.venue_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{t.room_name}</div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {t.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {t.city}
                          {t.country ? `, ${t.country}` : ''}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" /> {t.capacity}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Ruler className="w-3 h-3" /> {t.room_width_m}×{t.room_length_m}m
                      </span>
                    </div>
                    {t.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{t.notes}</p>
                    )}
                    <div className="mt-auto pt-2 grid grid-cols-2 gap-2">
                      {t.approved ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="lv-premium-shade"
                          disabled={busy}
                          onClick={() =>
                            handle(
                              t.id,
                              setApproval(t.id, false).then((r) => {
                                if (r.ok)
                                  toast({ title: 'Approval revoked', description: t.venue_name });
                              })
                            )
                          }
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Unapprove
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="lv-premium-shade bg-green-600 hover:bg-green-700 text-white"
                          disabled={busy}
                          onClick={() =>
                            handle(
                              t.id,
                              setApproval(t.id, true).then((r) => {
                                if (r.ok)
                                  toast({
                                    title: 'Template approved',
                                    description: `${t.venue_name} is now in the public directory.`,
                                  });
                              })
                            )
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="lv-premium-shade"
                        disabled={busy}
                        onClick={() =>
                          handle(t.id, setFeatured(t.id, !t.featured))
                        }
                      >
                        {t.featured ? (
                          <>
                            <StarOff className="w-3.5 h-3.5 mr-1" /> Unfeature
                          </>
                        ) : (
                          <>
                            <Star className="w-3.5 h-3.5 mr-1" /> Feature
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="lv-premium-shade"
                        onClick={() => setEditing(t)}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="lv-premium-shade text-destructive hover:text-destructive"
                        disabled={busy}
                        onClick={() => {
                          if (!confirm(`Delete "${t.venue_name} — ${t.room_name}" forever?`)) return;
                          handle(
                            t.id,
                            remove(t.id).then((r) => {
                              if (r.ok) toast({ title: 'Template deleted' });
                            })
                          );
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {editing && (
          <EditMetaDialog
            template={editing}
            onClose={() => setEditing(null)}
            onSave={async (patch) => {
              const r = await updateMeta(editing.id, patch);
              if (r.ok) {
                toast({ title: 'Template updated' });
                setEditing(null);
              } else {
                toast({ title: 'Update failed', description: r.error, variant: 'destructive' });
              }
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};

interface EditProps {
  template: VenueTemplate;
  onClose: () => void;
  onSave: (patch: Partial<Pick<VenueTemplate, 'venue_name' | 'room_name' | 'city' | 'country' | 'capacity' | 'notes'>>) => Promise<void>;
}

const EditMetaDialog = ({ template, onClose, onSave }: EditProps) => {
  const [venue, setVenue] = useState(template.venue_name);
  const [room, setRoom] = useState(template.room_name);
  const [city, setCity] = useState(template.city ?? '');
  const [country, setCountry] = useState(template.country ?? '');
  const [capacity, setCapacity] = useState(template.capacity);
  const [notes, setNotes] = useState(template.notes ?? '');
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit template</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Venue name</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Room name</Label>
            <Input value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Country</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Capacity</Label>
            <Input
              type="number"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="lv-premium-shade" onClick={onClose}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button
            className="lv-premium-shade"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onSave({
                venue_name: venue,
                room_name: room,
                city: city || null,
                country: country || null,
                capacity,
                notes: notes || null,
              } as any);
              setSaving(false);
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
