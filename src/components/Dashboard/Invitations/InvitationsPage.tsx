import { Printer as ExportControlsPrinter } from 'lucide-react';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Event } from '@/hooks/useEvents';
import { useInvitationCardSettings, CardType, QrConfig } from '@/hooks/useInvitationCardSettings';
import { InvitationCardCustomizer, PRESET_ZONES, PRESET_Y_POSITIONS, PRESET_STYLES } from './InvitationCardCustomizer';
import { InvitationCardPreview } from './InvitationCardPreview';
import { Loader2, LoaderCircle, FileText, CalendarDays, Mail, MailOpen, CalendarHeart, HandHeart, BadgeCheck, Printer, Download, Plus, Copy, Trash2, Pencil } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/enhanced-button';
import { generateInvitationQR } from '@/lib/invitationQR';
import {invitationEventDataFromEvent} from '@/lib/invitationEventData';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import styles from './InvitationsPage.module.css';
import { useSignageImageFit } from '../Signage/useSignageImageFit';
import { INVITATION_CARD_SIZES, ALLOWED_INVITATION_SIZES, DEFAULT_INVITATION_SIZES, type InvitationCardSize } from '@/lib/invitationCardSizes';
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
  events: Event[];
  eventsLoading: boolean;
}

const CARD_TYPE_LABELS: Record<CardType, string> = {
  invitation: 'Invitation',
  save_the_date: 'Save the Date',
  thank_you: 'Thank You',
};

export const InvitationsPage: React.FC<InvitationsPageProps> = ({
  selectedEventId,
  onEventSelect,
  events,
  eventsLoading,
}) => {
  const {
    artworks,
    activeArtwork: storedActiveArtwork,
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
  const activeArtwork = storedActiveArtwork?.card_type === activeCardType ? storedActiveArtwork : null;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newArtworkName, setNewArtworkName] = useState('');
  const [newArtworkSize, setNewArtworkSize] = useState('A4');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const previewDocumentRef = useRef<HTMLDivElement | null>(null);

  const { confirmFit, rememberFit, dialog: imageFitDialog } = useSignageImageFit();
  const approvedUpload = useRef<{ label: string; widthMm: number; heightMm: number } | null>(null);
  const cardPaper = useMemo(() => {
    const dimensions = INVITATION_CARD_SIZES[activeArtwork?.card_size as InvitationCardSize] || INVITATION_CARD_SIZES.A5;
    return { label: activeArtwork?.card_size || 'A5', widthMm: activeArtwork?.orientation === 'landscape' ? dimensions.h : dimensions.w, heightMm: activeArtwork?.orientation === 'landscape' ? dimensions.w : dimensions.h };
  }, [activeArtwork?.card_size, activeArtwork?.orientation]);
  const beforeBackgroundUpload = async (file: File) => {
    const url = URL.createObjectURL(file);
    try {
      const approved = await confirmFit(url, cardPaper);
      approvedUpload.current = approved ? cardPaper : null;
      return approved;
    } finally { URL.revokeObjectURL(url); }
  };
  const updateCardSettings = async (updates: Partial<import('@/hooks/useInvitationCardSettings').InvitationCardSettings>) => {
    if (updates.background_image_url && updates.background_image_url !== activeArtwork?.background_image_url) {
      if (approvedUpload.current) { rememberFit(updates.background_image_url, approvedUpload.current); approvedUpload.current = null; }
      if (!await confirmFit(updates.background_image_url, cardPaper)) return false;
      updates = { ...updates, background_image_type: 'full', background_image_x_position: 50, background_image_y_position: 50 };
    }
    return updateSettings(updates);
  };

  // Generate QR when qr_config changes
  useEffect(() => {
    const qrConfig = activeArtwork?.qr_config;
    if (!qrConfig?.enabled || !qrConfig.event_id) {
      setQrDataUrl(null);
      return;
    }
    const qrEvent = events.find(e => e.id === qrConfig.event_id);
    if (!qrEvent?.slug) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    setQrDataUrl(null);
    generateInvitationQR(qrEvent.slug, qrEvent.id).then(url => {
      if (!cancelled) setQrDataUrl(url);
    }).catch(() => {
      if (!cancelled) setQrDataUrl(null);
    });
    return () => { cancelled = true; };
  }, [activeArtwork?.qr_config?.enabled, activeArtwork?.qr_config?.event_id, events]);

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  const eventData = useMemo(() => invitationEventDataFromEvent(selectedEvent), [selectedEvent]);

  const CARD_SIZE_MM = INVITATION_CARD_SIZES;

  const handleDownloadPDF = useCallback(async () => {
    if (!activeArtwork) return;
    try {
      const size = CARD_SIZE_MM[activeArtwork.card_size as InvitationCardSize] || CARD_SIZE_MM.A4;
      const isLandscape = activeArtwork.orientation === 'landscape';
      const widthMm = isLandscape ? size.h : size.w;
      const heightMm = isLandscape ? size.w : size.h;

      if (activeArtwork.qr_config?.enabled && !qrDataUrl) throw new Error('Wait for the QR code to finish loading before exporting.');
      if (activeArtwork.background_image_type === 'full' && activeArtwork.background_image_url && !await confirmFit(activeArtwork.background_image_url, cardPaper, activeArtwork.background_image_x_position, activeArtwork.background_image_y_position)) return;
      setExporting(true);
      setSelectedZoneId(null);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!previewDocumentRef.current) throw new Error('The card preview is not ready.');
      const { exportInvitationPreviewPDF } = await import('@/lib/invitationPreviewPdfExporter');
      await exportInvitationPreviewPDF({ pageElement: previewDocumentRef.current, widthMm, heightMm },
        CARD_TYPE_LABELS[activeArtwork.card_type] + '-WeddingWaitress-' + (selectedEvent?.name || 'Event') + '.pdf');
      toast({ title: 'PDF downloaded', description: 'Your invitation PDF has been saved.' });
    } catch (err) {
      console.error('PDF export error:', err);
      toast({ title: 'Export failed', description: err instanceof Error ? err.message : 'Could not generate the PDF. Please try again.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }, [activeArtwork, qrDataUrl, selectedEvent?.name, confirmFit, cardPaper]);


  const filteredArtworks = useMemo(
    () => artworks.filter(a => a.card_type === activeCardType),
    [artworks, activeCardType]
  );

  const ALLOWED_SIZES = ALLOWED_INVITATION_SIZES;
  const [preferredSizes, setPreferredSizes] = useState(DEFAULT_INVITATION_SIZES);
  const selectedSize = activeArtwork?.card_type === activeCardType ? activeArtwork.card_size : preferredSizes[activeCardType];
  const chooseSize = async (size: InvitationCardSize) => {
    if (activeArtwork?.card_type === activeCardType && activeArtwork.background_image_type === 'full' && activeArtwork.background_image_url) {
      const d = INVITATION_CARD_SIZES[size];
      const paper = { label: size, widthMm: activeArtwork.orientation === 'landscape' ? d.h : d.w, heightMm: activeArtwork.orientation === 'landscape' ? d.w : d.h };
      if (!await confirmFit(activeArtwork.background_image_url, paper, activeArtwork.background_image_x_position, activeArtwork.background_image_y_position)) return;
    }
    setPreferredSizes(prev => ({ ...prev, [activeCardType]: size }));
    if (activeArtwork?.card_type === activeCardType) void updateSettings({ card_size: size });
  };
  const chooseCardType = (kind: CardType) => {
    setSelectedZoneId(null);
    setActiveCardType(kind);
    setActiveArtwork(artworks.find(a => a.card_type === kind)?.id || null);
  };

  const handleOpenCreateDialog = () => {
    const sizes = ALLOWED_SIZES[activeCardType];
    if (sizes.length === 1) {
      // One supported size needs no size dialog
      createArtwork(activeCardType, `New ${CARD_TYPE_LABELS[activeCardType]}`, sizes[0]);
      return;
    }
    setNewArtworkName(`New ${CARD_TYPE_LABELS[activeCardType]}`);
    setNewArtworkSize(preferredSizes[activeCardType]);
    setCreateDialogOpen(true);
  };

  const handleConfirmCreate = async () => {
    const name = newArtworkName.trim() || `New ${CARD_TYPE_LABELS[activeCardType]}`;
    const created = await createArtwork(activeCardType, name, newArtworkSize);
    if (created) setCreateDialogOpen(false);
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
      <div className={`${styles.page} flex items-center justify-center h-64`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading events...</span>
      </div>
    );
  }

  if (!events.length) {
    return (
      <Card className={`${styles.page} ww-box`}>
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
    <div {...(exporting ? { inert: "" } as any : {})} className={`${styles.page} space-y-6 ww-invitations-light`}>
      {imageFitDialog}
      {/* Combined Header Box */}
      <Card className={`${styles.headerPanel} border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]`}>
        <CardContent className="space-y-4 pt-6">
          <div className="text-left">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><MailOpen className="h-6 w-6 text-primary shrink-0" strokeWidth={1.8} aria-hidden="true" />Invitations, Save the Date & Thank You Cards</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create invitations and save the dates (A4/A5), and thank you cards (A6) to send digitally or download to print
            </p>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-8 lg:flex-nowrap pt-2">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 w-full lg:w-auto">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Choose Event:
              </label>
              <Select value={selectedEventId || "no-event"} onValueChange={handleEventChange}>
                <SelectTrigger className={`${styles.selectTrigger} w-full lg:w-[300px] border-primary focus:ring-primary font-bold text-primary`}>
                  <SelectValue placeholder="Choose Event" />
                </SelectTrigger>
                <SelectContent className="ww-invitations-premium-portal ww-invitations-studio-portal bg-popover border-border z-50">
                  {events.length > 0 ? (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center space-x-2">
                          <CalendarDays className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden="true" />
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
              <div data-export-controls-panel className={`${styles.exportPanel} border border-primary rounded-xl p-3 flex flex-col gap-2 w-full lg:w-auto lg:whitespace-nowrap`}>
                <div className="text-sm">
                  <span data-export-controls-heading><ExportControlsPrinter size={16} strokeWidth={2} aria-hidden="true" />Export Controls</span>

                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={!activeArtwork || exporting}
                    onClick={handleDownloadPDF}
                    className={`${styles.exportButton} inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 rounded-full transition-[filter,box-shadow] hover:brightness-105 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap`}
                  >
                    {exporting ? <LoaderCircle className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" /> : <Download className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />}
                    {exporting ? 'Exporting…' : 'Download PDF'}
                  </button>
                </div>
              </div>
            )}
          </div>


          {selectedEvent && (
            <div className={`${styles.guidelinesRow} flex flex-wrap items-start justify-between gap-4`}>
              <div className={`${styles.guidelinesPanel} flex-1 border border-primary rounded-xl p-4 text-sm grid md:grid-cols-2 gap-4`}><div>
                <p className={`${styles.manageHeading} flex items-center gap-2 font-medium text-green-600`}>
                  <BadgeCheck className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  Manage your invitations and cards
                </p>
                <div className="text-muted-foreground space-y-1 mt-3">
                  <p>• All exports are 300 DPI for professional quality</p>
                  <p>• PDFs use your selected A4, A5 or A6 dimensions</p>
                  <p>• The downloaded PDF matches your card preview</p>
                  <p>• Download a PDF to share digitally or print</p>
                  <p>• Background images must be smaller than 5MB</p>
                </div>
                </div>
                <div className={styles.sizeOptions} role="group" aria-label={CARD_TYPE_LABELS[activeCardType] + ' card size'}>
                  {ALLOWED_SIZES[activeCardType].map(size => (
                    <button key={size} type="button" aria-pressed={selectedSize === size}
                      className={styles.sizeOption} onClick={() => chooseSize(size)} disabled={exporting}>
                      <strong>{size}</strong>
                      <span>{INVITATION_CARD_SIZES[size].w} × {INVITATION_CARD_SIZES[size].h} mm</span>
                      <span>{size === 'A6' ? 'Thank You · fits a C6 envelope' : size === 'A5' ? 'Compact invitation or save the date' : 'Larger invitation or save the date'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

      {/* Artwork Management Bar */}
      {selectedEventId && selectedEvent && !settingsLoading && (
        <div className={styles.managementPanel}>
          <div className="space-y-4">
            {/* Card Type Tabs */}
            <Tabs value={activeCardType} onValueChange={(v) => chooseCardType(v as CardType)}>
              <TabsList className="grid w-full grid-cols-3 max-sm:h-auto max-sm:gap-1 max-sm:p-1">
                <TabsTrigger value="invitation" className="max-sm:text-[13px] max-sm:px-1 max-sm:py-1.5 gap-1.5"><MailOpen className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />Invitation</TabsTrigger>
                <TabsTrigger value="save_the_date" className="max-sm:text-[13px] max-sm:px-1 max-sm:py-1.5 gap-1.5"><CalendarHeart className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />Save the Date</TabsTrigger>
                <TabsTrigger value="thank_you" className="max-sm:text-[13px] max-sm:px-1 max-sm:py-1.5 gap-1.5"><HandHeart className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />Thank You</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Artwork List */}
            <div className={`${styles.artworkList} flex items-center gap-3 overflow-x-auto pb-2 max-sm:flex-col max-sm:items-stretch max-sm:overflow-visible`}>
              {filteredArtworks.map(artwork => (
                <div
                  key={artwork.id}
                  onClick={() => setActiveArtwork(artwork.id!)}
                  className={`${styles.artworkCard} ${activeArtworkId === artwork.id ? styles.artworkCardActive : ''} flex-shrink-0 w-48 p-3 rounded-xl cursor-pointer transition-all max-sm:w-full ${
                    activeArtworkId === artwork.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className={`${styles.thumbnail} h-20 max-sm:h-40 rounded-lg bg-muted mb-2 overflow-hidden flex items-center justify-center`}>
                    {artwork.background_image_url ? (
                      <img src={artwork.background_image_url} alt={artwork.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`${styles.blankThumbnail} w-full h-full`} />
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
                    <p className={`${styles.artworkTitle} text-xs font-medium truncate`}>{artwork.name}</p>
                  )}

                  {/* Actions */}
                  <div className={`${styles.artworkActions} flex items-center gap-1 mt-1`} onClick={e => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleStartRename(artwork.id!, artwork.name)}
                      aria-label="Edit card"
                      title="Edit card"
                    >
                      <Pencil className="h-[15px] w-[15px]" strokeWidth={1.8} aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => duplicateArtwork(artwork.id!)}
                      aria-label="Duplicate card"
                      title="Duplicate card"
                    >
                      <Copy className="h-[15px] w-[15px]" strokeWidth={1.8} aria-hidden="true" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" aria-label="Delete card" title="Delete card">
                          <Trash2 className="h-[15px] w-[15px] text-destructive" strokeWidth={1.8} aria-hidden="true" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="ww-invitations-premium-dialog ww-invitations-delete-dialog">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{artwork.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="ww-invitations-cancel-action">Cancel</AlertDialogCancel>
                          <AlertDialogAction className="ww-invitations-delete-action" onClick={() => deleteArtwork(artwork.id!)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}

              {/* New Artwork Button */}
              <button
                onClick={handleOpenCreateDialog}
                className={`${styles.newArtwork} flex-shrink-0 w-48 h-[140px] max-sm:w-full max-sm:h-[160px] rounded-xl border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer`}
              >
                <Plus className="h-[22px] w-[22px] text-primary" strokeWidth={1.8} aria-hidden="true" />
                <span className={`${styles.artworkTitle} text-xs font-medium text-primary`}>New {CARD_TYPE_LABELS[activeCardType]}</span>
              </button>
            </div>
            {filteredArtworks.length === 0 && (
              <p className={`${styles.emptyMessage} text-sm text-muted-foreground text-center py-2`}>
                No {CARD_TYPE_LABELS[activeCardType].toLowerCase()} designs yet. Click the button above to create one.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Premium info bar — mirrors Seating Chart Signs */}
      {selectedEventId && selectedEvent && !settingsLoading && activeArtwork && (
        <div className={`${styles.infoStrip} rounded-xl shadow-soft px-5 py-4 flex items-center justify-center`}>
          <p className="text-sm text-foreground/85 font-medium text-center">
            Card layouts match the selected print size. <span className="mx-1">•</span> 300 DPI • Australian standard print sizes • Print-shop ready PDFs
          </p>
        </div>
      )}

        </CardContent>
      </Card>

      {!selectedEventId && (
        <Card className="ww-box p-12 text-center">
          <MailOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" strokeWidth={1.8} aria-hidden="true" />
          <CardTitle className="text-xl mb-2 text-muted-foreground">Select an Event</CardTitle>
          <CardDescription className="text-base">
            Choose an event above to start designing your invitations
          </CardDescription>
        </Card>
      )}

      {/* Creation Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="ww-invitations-premium-dialog ww-invitations-create-dialog sm:max-w-md">
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
            <Button className="ww-invitations-cancel-action" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button className="ww-invitations-create-action" onClick={handleConfirmCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Section - Grid Layout */}
      {selectedEventId && selectedEvent && !settingsLoading && activeArtwork && (
        <div {...(exporting ? { inert: "" } as any : {})} className={`${styles.editorLayout} grid grid-cols-1 2xl:grid-cols-5 gap-6 items-start`}>
          <div className={`${styles.designerShell} 2xl:col-span-2`}>
            <InvitationCardCustomizer
              headerTitle={"Invitations, Save the Date &\nThank You Cards Designer"}
              key={activeArtwork.id}
              settings={activeArtwork}
              notes={activeArtwork.notes || ''}
              onNotesChange={notes => updateSettings({ notes })}
              onSettingsChange={updateCardSettings}
              beforeBackgroundUpload={beforeBackgroundUpload}
              eventData={eventData}
              events={events}
              qrDataUrl={qrDataUrl}
              onQrEventChange={(eventId) => {
                // QR generation is handled by the useEffect above
              }}
              appearance="signage-premium"
              portalScopeClassName="ww-invitations-studio-portal"
            />
          </div>
          <div className={`${styles.previewStage} ww-invitations-preview 2xl:col-span-3 2xl:mt-12 w-full max-w-full mx-auto pb-6 max-sm:pb-2 max-sm:px-0 max-sm:overflow-x-auto max-sm:overflow-y-hidden md:max-2xl:overflow-hidden md:max-2xl:flex md:max-2xl:justify-center`}>
            <div className="w-full min-w-0">
            <div className="w-full min-w-0 mx-auto">
            <InvitationCardPreview
              documentRef={previewDocumentRef}
              documentId="invitation-card"
              fitToContainer
              fitToWidth
              qrWhitePlate
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
              onZoneDelete={(zoneId) => {
                const newZones = (activeArtwork?.text_zones || []).filter(z => z.id !== zoneId);
                updateSettings({ text_zones: newZones });
                setSelectedZoneId(null);
              }}
              onZoneReset={(zoneId) => {
                const zones = activeArtwork?.text_zones || [];
                const zone = zones.find(z => z.id === zoneId);
                if (!zone) return;

                const preset = PRESET_ZONES.find(p => p.field === zone.preset_field);
                const style = zone.preset_field ? PRESET_STYLES[zone.preset_field] : undefined;
                const defaultY = zone.preset_field ? PRESET_Y_POSITIONS[zone.preset_field] : 50;

                const defaultText = preset?.getText
                  ? preset.getText(eventData)
                  : (zone.preset_field ? eventData[zone.preset_field] || preset?.defaultText || '' : '');

                const newZones = zones.map(z =>
                  z.id === zoneId ? {
                    ...z,
                    text: defaultText,
                    font_family: style?.font_family || 'Lora',
                    font_size: style?.font_size || 20,
                    font_color: '#000000',
                    font_weight: 'normal' as const,
                    font_style: 'normal' as const,
                    text_align: 'center' as const,
                    text_case: 'default',
                    x_percent: 50,
                    y_percent: defaultY ?? 50,
                    width_percent: 80,
                    rotation: 0,
                  } : z
                );
                updateSettings({ text_zones: newZones });
              }}
              onZoneDuplicate={(zoneId) => {
                const zones = activeArtwork?.text_zones || [];
                const zone = zones.find(z => z.id === zoneId);
                if (!zone) return;
                const newZone = { ...zone, id: crypto.randomUUID(), x_percent: Math.min(100, zone.x_percent + 3), y_percent: Math.min(100, zone.y_percent + 3) };
                updateSettings({ text_zones: [...zones, newZone] });
                setSelectedZoneId(newZone.id);
              }}
              qrDataUrl={qrDataUrl}
              onQrConfigUpdate={(updates) => {
                const current = activeArtwork?.qr_config || { enabled: false, x_percent: 50, y_percent: 90, size_percent: 15, rotation: 0, event_id: null };
                updateSettings({ qr_config: { ...current, ...updates } });
              }}
            />
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
