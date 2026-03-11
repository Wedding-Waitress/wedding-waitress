import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEvents } from '@/hooks/useEvents';
import { useInvitationCardSettings, CardType } from '@/hooks/useInvitationCardSettings';
import { InvitationCardCustomizer } from './InvitationCardCustomizer';
import { InvitationCardPreview } from './InvitationCardPreview';
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils';
import { Loader2, FileText, Calendar, Mail, Plus, Copy, Trash2, Pencil } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InvitationsPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

const CARD_TYPE_LABELS: Record<CardType, string> = {
  invitation: 'Invitation',
  save_the_date: 'Save the Date',
  thank_you: 'Thank You',
};

export const InvitationsPage: React.FC<InvitationsPageProps> = ({
  selectedEventId,
  onEventSelect,
}) => {
  const { events, loading: eventsLoading } = useEvents();
  const {
    artworks,
    activeArtwork,
    activeArtworkId,
    setActiveArtwork,
    createArtwork,
    deleteArtwork,
    duplicateArtwork,
    renameArtwork,
    loading: settingsLoading,
    updateSettings,
  } = useInvitationCardSettings(selectedEventId);

  const [activeCardType, setActiveCardType] = useState<CardType>('invitation');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newArtworkName, setNewArtworkName] = useState('');
  const [newArtworkSize, setNewArtworkSize] = useState('A4');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  const eventData = useMemo(() => {
    if (!selectedEvent) return {};
    const p1 = selectedEvent.partner1_name || '';
    const p2 = selectedEvent.partner2_name || '';
    const coupleNames = p1 && p2 ? `${p1} & ${p2}` : p1 || p2 || selectedEvent.name;

    return {
      couple_names: coupleNames,
      event_name: selectedEvent.name || '',
      date: selectedEvent.date ? formatDisplayDate(selectedEvent.date) : '',
      venue: selectedEvent.venue || '',
      time: selectedEvent.start_time ? formatDisplayTime(selectedEvent.start_time) : '',
      rsvp_deadline: selectedEvent.rsvp_deadline ? formatDisplayDate(selectedEvent.rsvp_deadline) : '',
      ceremony_enabled: selectedEvent.ceremony_enabled ? 'true' : 'false',
      ceremony_venue: selectedEvent.ceremony_venue || '',
      ceremony_time: selectedEvent.ceremony_start_time ? formatDisplayTime(selectedEvent.ceremony_start_time) : '',
      reception_enabled: selectedEvent.reception_enabled ? 'true' : 'false',
    };
  }, [selectedEvent]);

  const filteredArtworks = useMemo(
    () => artworks.filter(a => a.card_type === activeCardType),
    [artworks, activeCardType]
  );

  const ALLOWED_SIZES: Record<CardType, string[]> = {
    invitation: ['A4'],
    save_the_date: ['A4', 'A5'],
    thank_you: ['A4', 'A5', 'A6'],
  };

  const DEFAULT_SIZE: Record<CardType, string> = {
    invitation: 'A4',
    save_the_date: 'A5',
    thank_you: 'A6',
  };

  const handleOpenCreateDialog = () => {
    const sizes = ALLOWED_SIZES[activeCardType];
    if (sizes.length === 1) {
      // Auto-create for invitation (A4 only)
      createArtwork(activeCardType, `New ${CARD_TYPE_LABELS[activeCardType]}`, sizes[0]);
      return;
    }
    setNewArtworkName(`New ${CARD_TYPE_LABELS[activeCardType]}`);
    setNewArtworkSize(DEFAULT_SIZE[activeCardType]);
    setCreateDialogOpen(true);
  };

  const handleConfirmCreate = async () => {
    const name = newArtworkName.trim() || `New ${CARD_TYPE_LABELS[activeCardType]}`;
    await createArtwork(activeCardType, name, newArtworkSize);
    setCreateDialogOpen(false);
  };

  const handleEventChange = (eventId: string) => {
    if (eventId === "no-event") return;
    onEventSelect(eventId);
  };

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const handleFinishRename = async () => {
    if (renamingId && renameValue.trim()) {
      await renameArtwork(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading events...</span>
      </div>
    );
  }

  if (!events.length) {
    return (
      <Card className="ww-box">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Events Found</h3>
            <p className="text-sm text-muted-foreground">Create an event first to design invitations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Combined Header Box */}
      <Card className="ww-box">
        <CardContent className="space-y-4 pt-6">
          <div className="text-left">
            <h1 className="text-2xl font-medium text-foreground">Invitations, Save the Date & Thank You Cards</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create professional invitations (A4), save the dates (A4/A5), and thank you cards (A4/A5/A6) to send digitally or download to print
            </p>
          </div>

          {selectedEvent && (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 border border-primary rounded-xl p-4 text-sm space-y-2">
                <p className="font-medium text-green-600">
                  Manage your A4-A5 invitations and cards
                </p>
                <div className="text-muted-foreground space-y-1 mt-3">
                  <p>• All exports are 300 DPI for professional quality</p>
                  <p>• PDF exports maintain exact A4/A5 dimensions</p>
                  <p>• Image exports are 2480×3508 pixels (A4 @ 300 DPI)</p>
                  <p>• Send digitally or download to print at home or your local printer</p>
                  <p>• Background images must be smaller than 5MB</p>
                </div>
              </div>
            </div>
          )}

          <div className="border-b border-border" />

          <div className="flex items-center justify-between gap-8 flex-nowrap pt-2">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Choose Event:
              </label>
              <Select value={selectedEventId || "no-event"} onValueChange={handleEventChange}>
                <SelectTrigger className="w-full sm:w-[300px] border-primary focus:ring-primary font-bold text-primary">
                  <SelectValue placeholder="Choose Event" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {events.length > 0 ? (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>{event.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-events" disabled>
                      {eventsLoading ? "Loading events..." : "No events found"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedEvent && (
              <div className="border border-primary rounded-xl p-3 flex flex-col gap-2 whitespace-nowrap">
                <div className="text-sm">
                  <span className="font-medium">Export Controls</span>
                  <span className="text-muted-foreground ml-2">Download your invitations as PDF ready for printing.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled
                    className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
                  >
                    <FileText className="w-3 h-3" />
                    Download PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedEventId && (
        <Card className="ww-box p-12 text-center">
          <Mail className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="text-xl mb-2 text-muted-foreground">Select an Event</CardTitle>
          <CardDescription className="text-base">
            Choose an event above to start designing your invitations
          </CardDescription>
        </Card>
      )}

      {/* Artwork Management Bar */}
      {selectedEventId && selectedEvent && !settingsLoading && (
        <Card className="ww-box">
          <CardContent className="pt-6 space-y-4">
            {/* Card Type Tabs */}
            <Tabs value={activeCardType} onValueChange={(v) => setActiveCardType(v as CardType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="invitation">Invitation</TabsTrigger>
                <TabsTrigger value="save_the_date">Save the Date</TabsTrigger>
                <TabsTrigger value="thank_you">Thank You</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Artwork List */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {filteredArtworks.map(artwork => (
                <div
                  key={artwork.id}
                  onClick={() => setActiveArtwork(artwork.id!)}
                  className={`flex-shrink-0 w-48 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    activeArtworkId === artwork.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="h-20 rounded-lg bg-muted mb-2 overflow-hidden flex items-center justify-center">
                    {artwork.background_image_url ? (
                      <img src={artwork.background_image_url} alt={artwork.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full" style={{ backgroundColor: artwork.background_color }} />
                    )}
                  </div>

                  {/* Name */}
                  {renamingId === artwork.id ? (
                    <Input
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={handleFinishRename}
                      onKeyDown={e => e.key === 'Enter' && handleFinishRename()}
                      className="h-7 text-xs"
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <p className="text-xs font-medium truncate">{artwork.name}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleStartRename(artwork.id!, artwork.name)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => duplicateArtwork(artwork.id!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{artwork.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteArtwork(artwork.id!)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}

              {/* New Artwork Button */}
              <button
                onClick={handleOpenCreateDialog}
                className="flex-shrink-0 w-48 h-[140px] rounded-xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium text-primary">New {CARD_TYPE_LABELS[activeCardType]}</span>
              </button>
            </div>

            {filteredArtworks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No {CARD_TYPE_LABELS[activeCardType].toLowerCase()} designs yet. Click the button above to create one.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Creation Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New {CARD_TYPE_LABELS[activeCardType]}</DialogTitle>
            <DialogDescription>Choose a size and name for your new design.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-2 block">Card Size</Label>
              <RadioGroup value={newArtworkSize} onValueChange={setNewArtworkSize}>
                {ALLOWED_SIZES[activeCardType].map(size => (
                  <div key={size} className="flex items-center space-x-2">
                    <RadioGroupItem value={size} id={`size-${size}`} />
                    <Label htmlFor={`size-${size}`} className="cursor-pointer">
                      {size === 'A4' && 'A4 (210 × 297mm)'}
                      {size === 'A5' && 'A5 (148 × 210mm)'}
                      {size === 'A6' && 'A6 (105 × 148mm) — fits C6 envelope'}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label className="mb-2 block">Design Name</Label>
              <Input
                value={newArtworkName}
                onChange={e => setNewArtworkName(e.target.value)}
                placeholder="e.g. Main Save the Date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Section - Grid Layout */}
      {selectedEventId && selectedEvent && !settingsLoading && activeArtwork && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <InvitationCardCustomizer
              settings={activeArtwork}
              onSettingsChange={updateSettings}
              eventData={eventData}
            />
          </div>
          <div className="lg:col-span-3">
            <InvitationCardPreview
              settings={activeArtwork}
              eventData={eventData}
              selectedZoneId={selectedZoneId}
              onSelectZone={setSelectedZoneId}
              onZoneUpdate={(zoneId, updates) => {
                const newZones = (activeArtwork?.text_zones || []).map(z =>
                  z.id === zoneId ? { ...z, ...updates } : z
                );
                updateSettings({ text_zones: newZones });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
