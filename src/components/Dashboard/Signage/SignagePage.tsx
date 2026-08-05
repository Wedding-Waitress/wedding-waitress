import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEvents } from '@/hooks/useEvents';
import { useSignageSettings, DEFAULT_PORTRAIT_QR, DEFAULT_LANDSCAPE_QR } from '@/hooks/useSignageSettings';
import {
  InvitationCardCustomizer,
  PresetZoneDef,
} from '../Invitations/InvitationCardCustomizer';
import { InvitationCardPreview } from '../Invitations/InvitationCardPreview';
import { SignageGalleryModal } from './SignageGalleryModal';
import { checkPrintFit, useOptimizedPreview } from '@/lib/imagePipeline';
import { exportSignagePDF } from '@/lib/signagePdfExporter';
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils';
import { Loader2, LoaderCircle, FileText, CalendarDays, Printer, LayoutTemplate, BadgeCheck, CircleCheck, Star, Download, Contact, PanelsTopLeft, Mail } from 'lucide-react';
import { PinchZoomContainer } from '@/components/ui/PinchZoomContainer';
import { generateInvitationQR } from '@/lib/invitationQR';
import { exportInvitationPDF, exportInvitationPNG } from '@/lib/invitationExporter';
import { toast } from '@/hooks/use-toast';
import type { TextZone, QrConfig } from '@/hooks/useInvitationCardSettings';

interface SignagePageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

// Signage preset zones (sibling to Invitations PRESET_ZONES, curated for QR signage).
const SIGNAGE_PRESET_ZONES: PresetZoneDef[] = [
  { field: 'couple_names', label: 'Couple Names', defaultText: '', getText: (ed) => ed.couple_names || '' },
  { field: 'event_name', label: 'Event Name', defaultText: '', getText: (ed) => ed.event_name || '' },
  { field: 'date', label: 'Event Date', defaultText: '', getText: (ed) => ed.date || '' },
  { field: 'venue', label: 'Venue', defaultText: '', getText: (ed) => ed.venue || '' },
  { field: 'welcome_message', label: 'Welcome Message', defaultText: 'Please scan the QR code to find your table.', getText: () => 'Please scan the QR code to find your table.' },
  { field: 'welcome_to_our_wedding', label: 'Welcome To Our Wedding', defaultText: 'Welcome To Our Wedding', getText: () => 'Welcome To Our Wedding' },
  { field: 'qr_instructions', label: 'QR Instructions', defaultText: 'Scan to find your seat', getText: () => 'Scan to find your seat' },
];

const SIGNAGE_PRESET_Y_POSITIONS: Record<string, number> = {
  couple_names: 14,
  event_name: 24,
  date: 34,
  venue: 42,
  welcome_message: 54,
  welcome_to_our_wedding: 60,
  qr_instructions: 66,
};

const SIGNAGE_PRESET_STYLES: Record<string, { font_family: string; font_size: number }> = {
  couple_names: { font_family: 'Great Vibes', font_size: 56 },
  event_name: { font_family: 'ET Emilia Grace Demo', font_size: 28 },
  welcome_message: { font_family: 'ET Emilia Grace Demo', font_size: 22 },
  welcome_to_our_wedding: { font_family: 'Great Vibes', font_size: 36 },
  qr_instructions: { font_family: 'ET Emilia Grace Demo', font_size: 18 },
};

// Australian print sizes (portrait). UI-only — does not affect canvas/exporter yet.
const PRINT_SIZES: ReadonlyArray<{
  id: string;
  label: string;
  dims: string;
  best: string;
  recommended?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  
  { id: 'a1', label: 'A1', dims: '594 × 841 mm', best: 'Best for foyer seating charts & easels', recommended: true, icon: FileText },
  { id: 'a2', label: 'A2', dims: '420 × 594 mm', best: 'Best for entry-table signs', icon: FileText },
  { id: 'a3', label: 'A3', dims: '297 × 420 mm', best: 'Best for welcome signs', icon: FileText },
  { id: 'a4', label: 'A4', dims: '210 × 297 mm', best: 'Best for table signage', icon: FileText },
  { id: 'a5', label: 'A5', dims: '148 × 210 mm', best: 'Best for small table cards', icon: FileText },
  { id: 'dl', label: 'DL Card', dims: '99 × 210 mm', best: 'Best for upload QR cards', icon: PanelsTopLeft },
  { id: 'postcard', label: 'Postcard', dims: '105 × 148 mm', best: 'Best for keepsake QR cards', icon: Mail },
  { id: 'business', label: 'Business Card', dims: '90 × 55 mm', best: 'Best for guest QR handouts', icon: Contact },
];

const PRINT_DIMENSIONS: Record<string, { widthMm: number; heightMm: number }> = {
  
  a1: { widthMm: 594, heightMm: 841 },
  a2: { widthMm: 420, heightMm: 594 },
  a3: { widthMm: 297, heightMm: 420 },
  a4: { widthMm: 210, heightMm: 297 },
  a5: { widthMm: 148, heightMm: 210 },
  dl: { widthMm: 99, heightMm: 210 },
  postcard: { widthMm: 105, heightMm: 148 },
  business: { widthMm: 90, heightMm: 55 },
};

// QR safety: enforce ≥35mm rendered size (real venue scannability).
// A4 portrait width = 210mm → 35/210 ≈ 16.7% ; landscape width = 297mm → 35/297 ≈ 11.8%
const MIN_QR_SIZE_PERCENT_PORTRAIT = 17;
const MIN_QR_SIZE_PERCENT_LANDSCAPE = 12;

export const SignagePage: React.FC<SignagePageProps> = ({ selectedEventId, onEventSelect }) => {
  const { events, loading: eventsLoading } = useEvents();
  const {
    settings,
    asInvitationSettings,
    loading: settingsLoading,
    updateSettings,
  } = useSignageSettings(selectedEventId);

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState<null | 'pdf' | 'png'>(null);
  const [printSize, setPrintSize] = useState<string | null>(() => {
    const rec = PRINT_SIZES.find(p => p.recommended) || PRINT_SIZES[0];
    return rec ? rec.id : null;
  });

  // Tracks the lightweight preview URL last chosen from the gallery so we can detect
  // when the user switches to a non-gallery source (Choose File / Remove) and drop
  // the now-stale master print URL.
  const lastGalleryPreviewRef = useRef<string | null>(null);

  // Adapter: shared InvitationCardCustomizer expects onSelectImage(url) → background_image_url.
  // We bypass the customizer's single-field path and persist BOTH the lightweight preview URL
  // (for editor/preview) AND the master URL (for print-ready PDF) in one atomic update,
  // so the debounced save doesn't drop one of them. Then we close the modal.
  const SignageGalleryAdapter = useMemo(() => {
    const Adapter: React.FC<{
      open: boolean;
      onOpenChange: (open: boolean) => void;
      onSelectImage: (imageUrl: string) => void;
    }> = (adapterProps) => (
      <SignageGalleryModal
        open={adapterProps.open}
        onOpenChange={adapterProps.onOpenChange}
        onSelectImage={(previewUrl, printUrl) => {
          lastGalleryPreviewRef.current = previewUrl;
          updateSettings({
            background_image_url: previewUrl,
            background_image_print_url: printUrl ?? null,
            background_image_type: 'full',
          });
          adapterProps.onOpenChange(false);
        }}
      />
    );
    return Adapter;
  }, [updateSettings]);


  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  const orientation: 'portrait' | 'landscape' = settings?.orientation || 'portrait';


  // Editor preview: derive a LIGHTWEIGHT display URL from the master.
  // Print export still uses the untouched master for full 300 DPI quality.
  // Target ~1400px JPEG q=70 — visually crisp inside the A4 preview frame
  // but small enough to decode/paint instantly with zero scroll lag.
  const editorMasterUrl = settings?.background_image_print_url || settings?.background_image_url || null;
  const { url: lightweightBgUrl } = useOptimizedPreview(
    editorMasterUrl,
    (settings as any)?.background_image_preview_url ?? null,
  );

  useEffect(() => {
    if (!lightweightBgUrl) return;
    fetch(lightweightBgUrl, { method: 'HEAD' })
      .then((res) => {
        const size = res.headers.get('content-length');
        console.log(`Editor preview image size: ${size} bytes`);
      })
      .catch(() => {});
  }, [lightweightBgUrl]);

  // Editor-facing settings: identical to asInvitationSettings but with the
  // background image swapped for the lightweight version.
  const editorSettings = useMemo(() => {
    if (!asInvitationSettings) return null;
    return { ...asInvitationSettings, background_image_url: lightweightBgUrl };
  }, [asInvitationSettings, lightweightBgUrl]);

  const eventData = useMemo(() => {
    if (!selectedEvent) return {} as Record<string, string>;
    const p1 = selectedEvent.partner1_name || '';
    const p2 = selectedEvent.partner2_name || '';
    const coupleNames = p1 && p2 ? `${p1} & ${p2}` : p1 || p2 || selectedEvent.name;
    return {
      couple_names: coupleNames,
      event_name: selectedEvent.name || '',
      date: selectedEvent.date
        ? (() => {
            const [y, m, d] = selectedEvent.date.split('-').map(Number);
            const dt = new Date(y, (m || 1) - 1, d || 1);
            return isNaN(dt.getTime())
              ? formatDisplayDate(selectedEvent.date)
              : dt.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          })()
        : '',
      date_raw: selectedEvent.date || '',
      venue: selectedEvent.venue || '',
      time: selectedEvent.start_time ? formatDisplayTime(selectedEvent.start_time) : '',
      welcome_message: 'Please scan the QR code to find your table.',
      qr_instructions: 'Scan to find your seat',
    };
  }, [selectedEvent]);

  // Generate QR when QR config event_id changes
  useEffect(() => {
    const qrConfig = settings?.qr_config;
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
    generateInvitationQR(qrEvent.slug, qrEvent.id)
      .then(url => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(null); });
    return () => { cancelled = true; };
  }, [settings?.qr_config?.enabled, settings?.qr_config?.event_id, events]);

  const handleEventChange = (eventId: string) => {
    if (eventId === 'no-event') return;
    onEventSelect(eventId);
  };

  const handleOrientationChange = (next: 'portrait' | 'landscape') => {
    if (!settings) return;
    // Preserve text zones; reset QR placement to a sensible default for the new orientation
    // unless the user has already moved/sized it themselves.
    const wasDefault =
      settings.qr_config &&
      Math.abs(settings.qr_config.x_percent - (orientation === 'portrait' ? DEFAULT_PORTRAIT_QR.x_percent : DEFAULT_LANDSCAPE_QR.x_percent)) < 1 &&
      Math.abs(settings.qr_config.y_percent - (orientation === 'portrait' ? DEFAULT_PORTRAIT_QR.y_percent : DEFAULT_LANDSCAPE_QR.y_percent)) < 1;

    const nextDefault = next === 'portrait' ? DEFAULT_PORTRAIT_QR : DEFAULT_LANDSCAPE_QR;
    const updates: any = { orientation: next };
    if (wasDefault) {
      updates.qr_config = {
        ...settings.qr_config,
        x_percent: nextDefault.x_percent,
        y_percent: nextDefault.y_percent,
        size_percent: nextDefault.size_percent,
      };
    }
    updateSettings(updates);
  };

  // QR safety clamp: minimum scannable size, on both manual resize and orientation default.
  const handleQrConfigUpdate = useCallback((updates: Partial<QrConfig>) => {
    if (!settings) return;
    const minSize = orientation === 'portrait' ? MIN_QR_SIZE_PERCENT_PORTRAIT : MIN_QR_SIZE_PERCENT_LANDSCAPE;
    const next: QrConfig = { ...settings.qr_config, ...updates };
    if (typeof next.size_percent === 'number' && next.size_percent < minSize) {
      next.size_percent = minSize;
    }
    updateSettings({ qr_config: next });
  }, [settings, orientation, updateSettings]);

  const handleZoneUpdate = useCallback((zoneId: string, updates: Partial<TextZone>) => {
    const newZones = (settings?.text_zones || []).map(z =>
      z.id === zoneId ? { ...z, ...updates } : z
    );
    updateSettings({ text_zones: newZones });
  }, [settings, updateSettings]);

  const handleZoneDelete = useCallback((zoneId: string) => {
    const newZones = (settings?.text_zones || []).filter(z => z.id !== zoneId);
    updateSettings({ text_zones: newZones });
    setSelectedZoneId(null);
  }, [settings, updateSettings]);

  const handleZoneReset = useCallback((zoneId: string) => {
    const zones = settings?.text_zones || [];
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    const preset = SIGNAGE_PRESET_ZONES.find(p => p.field === zone.preset_field);
    const style = zone.preset_field ? SIGNAGE_PRESET_STYLES[zone.preset_field] : undefined;
    const defaultY = zone.preset_field ? SIGNAGE_PRESET_Y_POSITIONS[zone.preset_field] : 50;
    const defaultText = preset?.getText ? preset.getText(eventData) : (zone.preset_field ? eventData[zone.preset_field] || preset?.defaultText || '' : '');
    const newZones = zones.map(z =>
      z.id === zoneId ? {
        ...z,
        text: defaultText,
        font_family: style?.font_family || 'ET Emilia Grace Demo',
        font_size: style?.font_size || 22,
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
  }, [settings, updateSettings, eventData]);

  const handleZoneDuplicate = useCallback((zoneId: string) => {
    const zones = settings?.text_zones || [];
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    const newZone: TextZone = { ...zone, id: crypto.randomUUID(), x_percent: Math.min(100, zone.x_percent + 3), y_percent: Math.min(100, zone.y_percent + 3) };
    updateSettings({ text_zones: [...zones, newZone] });
    setSelectedZoneId(newZone.id);
  }, [settings, updateSettings]);

  const handleSettingsChange = useCallback(async (changes: any) => {
    // Map shared invitation-shape changes back to signage_settings columns
    const mapped: any = {};
    const allowed = [
      'background_color',
      'background_image_url',
      'background_image_type',
      'background_image_x_position',
      'background_image_y_position',
      'background_image_opacity',
      'text_zones',
      'qr_config',
      'orientation',
    ];
    for (const k of allowed) {
      if (k in changes) mapped[k] = (changes as any)[k];
    }
    // If background_image_url is being set from a non-gallery source
    // (Choose File / Remove), drop any stale print master URL so PDF
    // export uses the new image directly.
    if ('background_image_url' in mapped) {
      const incoming = mapped.background_image_url;
      if (!incoming) {
        mapped.background_image_print_url = null;
        lastGalleryPreviewRef.current = null;
      } else if (incoming !== lastGalleryPreviewRef.current) {
        mapped.background_image_print_url = null;
      }
    }
    if (Object.keys(mapped).length === 0) return true;
    return updateSettings(mapped);
  }, [updateSettings]);

  const handleDownloadPDF = useCallback(async () => {
    if (!settings || !selectedEvent || !printSize) return;
    const dims = PRINT_DIMENSIONS[printSize];
    if (!dims) return;

    // Auto-upscale check: warn if the master image is too small for the selected print size.
    const fit = checkPrintFit(
      (settings as any).background_image_width_px ?? null,
      (settings as any).background_image_height_px ?? null,
      { ...dims, label: PRINT_SIZES.find(p => p.id === printSize)?.label },
    );
    if (!fit.ok && fit.message) {
      const proceed = typeof window !== 'undefined'
        ? window.confirm(`${fit.message}\n\nProceed with export?`)
        : true;
      if (!proceed) return;
    }

    setExporting('pdf');
    try {
      const { widthMm, heightMm } = dims;

      const exportBgUrl = settings.background_image_print_url || settings.background_image_url || '';
      if (!exportBgUrl && !settings.background_color) {
        throw new Error('Add a background image or color before exporting.');
      }

      const customText: Record<string, string> = {};
      const customStyles: Record<string, any> = {};
      (settings.text_zones || []).forEach((z: any) => {
        if (z.id) {
          if (z.text) customText[z.id] = z.text;
          else if (z.preset_field && (eventData as any)[z.preset_field]) customText[z.id] = (eventData as any)[z.preset_field];
          customStyles[z.id] = {};
        }
      });

      const sizeLabel = PRINT_SIZES.find(p => p.id === printSize)?.label || 'Print';
      const fileName = `WW-Sign-${selectedEvent.name}-${sizeLabel}-Portrait.pdf`;
      await exportSignagePDF({
        backgroundUrl: exportBgUrl,
        backgroundColor: settings.background_color,
        widthMm,
        heightMm,
        textZones: settings.text_zones as any,
        customText,
        customStyles,
        eventData: eventData as Record<string, string>,
        qrConfig: settings.qr_config,
        qrDataUrl: qrDataUrl || undefined,
      }, fileName);
      toast({ title: 'PDF downloaded', description: `Your ${sizeLabel} print-ready PDF has been saved.` });
    } catch (err: any) {
      console.error('Signage PDF export error', err);
      toast({
        title: 'Export failed',
        description: err?.message || String(err) || 'Could not generate the PDF.',
        variant: 'destructive',
      });
    } finally {
      setExporting(null);
    }
  }, [settings, selectedEvent, printSize, eventData, qrDataUrl]);

  const handleDownloadPNG = useCallback(async () => {
    if (!settings || !selectedEvent) return;
    setExporting('png');
    try {
      const isLandscape = orientation === 'landscape';
      const widthMm = isLandscape ? 297 : 210;
      const heightMm = isLandscape ? 210 : 297;

      const customText: Record<string, string> = {};
      const customStyles: Record<string, any> = {};
      (settings.text_zones || []).forEach((z: any) => {
        if (z.id) {
          if (z.text) customText[z.id] = z.text;
          else if (z.preset_field && (eventData as any)[z.preset_field]) customText[z.id] = (eventData as any)[z.preset_field];
          customStyles[z.id] = {};
        }
      });

      // exportInvitationPNG names file generically; rename via blob download
      const opts = {
        backgroundUrl: settings.background_image_print_url || settings.background_image_url || '',
        orientation,
        widthMm,
        heightMm,
        textZones: settings.text_zones as any,
        customText,
        customStyles,
        eventData: eventData as Record<string, string>,
        qrConfig: settings.qr_config,
        qrDataUrl: qrDataUrl || undefined,
      };
      // Use the shared helpers via dynamic import to avoid a separate copy
      const { buildInvitationElement, captureElement } = await import('@/lib/invitationExporter');
      const el = buildInvitationElement(opts as any);
      const canvas = await captureElement(el);
      const link = document.createElement('a');
      link.download = `WW-Sign-${selectedEvent.name}-${orientation === 'portrait' ? 'Portrait' : 'Landscape'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: 'PNG downloaded', description: 'Your QR seating sign image has been saved.' });
    } catch (err) {
      console.error('Signage PNG export error', err);
      toast({ title: 'Export failed', description: 'Could not generate the PNG.', variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  }, [settings, selectedEvent, orientation, eventData, qrDataUrl]);

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
            <Printer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Events Found</h3>
            <p className="text-sm text-muted-foreground">Create an event first to design your QR seating sign.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Combined Header Box — mirrors Invitations exactly */}
      <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
        <CardContent className="space-y-4 pt-6">
          <div className="text-left">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><LayoutTemplate className="h-6 w-6 text-primary shrink-0" strokeWidth={1.8} aria-hidden="true" />Wedding Waitress Signs Studio</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create luxury wedding signage, QR seating charts, upload stations, guestbook cards, and print-ready event signage.
            </p>
          </div>

          <div className="border-b border-border" />

          {!selectedEvent && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-1">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Choose Event:
              </label>
              <Select value={selectedEventId || 'no-event'} onValueChange={handleEventChange}>
                <SelectTrigger className="w-full sm:w-[300px] border-primary focus:ring-primary font-bold text-primary">
                  <div className="flex items-center gap-[7px] min-w-0">
                    <CalendarDays className="w-[17px] h-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                    <SelectValue placeholder="Choose Event" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      <div className="flex items-center space-x-2">
                        <CalendarDays className="w-[17px] h-[17px]" strokeWidth={1.8} />
                        <span>{event.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedEvent && (
            <div className="border border-primary/60 rounded-2xl p-5 lg:p-6 flex flex-col gap-6 w-full shadow-soft bg-gradient-to-br from-background to-[hsl(var(--primary)/0.04)]">
              <div className="flex flex-col gap-1">
                <h3 className="flex items-center gap-2 text-lg lg:text-xl font-semibold text-primary leading-tight">
                  <Printer className="h-[22px] w-[22px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  Print &amp; Export Studio
                </h3>
                <p className="text-[11px] lg:text-xs uppercase tracking-[0.14em] text-muted-foreground/80">
                  ​
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Download your sign as a print-ready PDF.
                  <span className="ml-2">All exports are generated as high-resolution print-ready PDFs for professional printing.</span>
                </p>
              </div>

              <div className="w-full border border-primary/70 rounded-xl p-5 text-sm bg-gradient-to-br from-[hsl(var(--primary)/0.06)] to-[hsl(var(--primary)/0.02)] shadow-soft">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)] gap-6">
                  <div>
                    <p className="flex items-center gap-2 font-semibold text-primary text-base">
                      <BadgeCheck className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                      Professional Wedding Print Guidelines
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      ​
                    </p>
                    <ul className="text-muted-foreground space-y-2 mt-3 leading-relaxed">
                      <li>• All exports are generated at professional 300 DPI quality</li>
                      <li>• PDFs match the live preview exactly</li>
                      <li>• QR codes remain venue-scannable at all print sizes</li>
                      <li>• Australian standard print sizes supported</li>
                      <li>• Best results recommended via professional print shops</li>
                      <li>• Portrait layouts optimised for modern wedding signage</li>
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 content-start">
                    {PRINT_SIZES.map((size) => {
                      const active = printSize === size.id;
                      const Icon = size.icon;
                      return (
                        <button
                          key={size.id}
                          type="button"
                          onClick={() => setPrintSize(size.id)}
                          className={`lv-premium-shade text-left rounded-xl border p-3 min-h-[88px] flex flex-col gap-1 transition-all duration-200 ease-out hover:-translate-y-[1px] ${
                            active
                              ? 'border-green-500 bg-green-50 ring-2 ring-green-200 shadow-md'
                              : 'border-primary/20 bg-[hsl(var(--primary)/0.035)] shadow-sm hover:border-primary/60 hover:bg-[hsl(var(--primary)/0.06)] hover:shadow-md'
                          }`}
                          aria-pressed={active}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Icon strokeWidth={1.8} className={`h-[17px] w-[17px] transition-all duration-200 ease-out ${active ? 'text-green-600' : 'text-primary/70'}`} />
                              <span className={`text-sm font-semibold transition-all duration-200 ease-out ${active ? 'text-green-700' : 'text-foreground'}`}>
                                {size.label}
                              </span>
                            </div>
                            {size.recommended && (
                              <span className={`mt-0.5 rounded-full uppercase text-[10px] font-semibold tracking-wider px-2 py-0.5 border whitespace-nowrap transition-all duration-200 ease-out ${
                                active
                                  ? 'bg-green-100 border-green-300 text-green-700'
                                  : 'bg-[hsl(var(--primary)/0.14)] text-primary border-primary/25'
                              } inline-flex items-center gap-1`}>
                                <Star className="h-[14px] w-[14px]" strokeWidth={1.8} aria-hidden="true" />
                                Most Popular
                              </span>
                            )}
                          </div>
                          <span className={`text-[11px] transition-all duration-200 ease-out ${active ? 'text-green-600/80' : 'text-muted-foreground/80'}`}>{size.dims}</span>
                          <span className={`text-[11px] leading-snug transition-all duration-200 ease-out ${active ? 'text-green-700/80' : 'text-foreground/70'}`}>{size.best}</span>
                          {active && (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-green-700 mt-2">
                              <CircleCheck className="h-[15px] w-[15px]" strokeWidth={1.8} aria-hidden="true" />
                              Selected for export
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-8 lg:flex-nowrap">
                <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 w-full lg:w-auto">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">
                    Choose Event:
                  </label>
                  <Select value={selectedEventId || 'no-event'} onValueChange={handleEventChange}>
                    <SelectTrigger className="w-full lg:w-[300px] border-primary focus:ring-primary font-bold text-primary">
                      <div className="flex items-center gap-[7px] min-w-0">
                        <CalendarDays className="w-[17px] h-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                        <SelectValue placeholder="Choose Event" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {events.map(event => (
                        <SelectItem key={event.id} value={event.id}>
                          <div className="flex items-center space-x-2">
                            <CalendarDays className="w-[17px] h-[17px]" strokeWidth={1.8} />
                            <span>{event.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(() => {
                  const hasBackground = !!(settings?.background_image_print_url || settings?.background_image_url || settings?.background_color);
                  const missing: string[] = [];
                  if (!settings) missing.push('Sign settings are still loading');
                  if (!printSize) missing.push('Select a print size below');
                  if (settings && !hasBackground) missing.push('Choose a background image or color');
                  const disabled = exporting !== null || missing.length > 0;
                  return (
                    <div className="border border-primary rounded-xl p-3 flex flex-col gap-2 w-full lg:w-auto lg:whitespace-nowrap">
                      <div className="text-sm">
                        <span className="inline-flex items-center gap-1.5 font-medium"><Printer className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />Export Controls</span>
                        <span className="text-muted-foreground ml-2">Download your sign as a print-ready PDF.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={disabled}
                          onClick={handleDownloadPDF}
                          className="lv-premium-shade inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
                        >
                          {exporting === 'pdf' ? <LoaderCircle className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" /> : <Download className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />}
                          {exporting === 'pdf' ? 'Exporting…' : 'Download Print-Ready PDF'}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          )}
        </CardContent>
      </Card>



      {!selectedEventId && (
        <Card className="ww-box p-12 text-center">
          <Printer className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="text-xl mb-2 text-muted-foreground">Select an Event</CardTitle>
          <CardDescription className="text-base">
            Choose an event above to start designing your QR seating sign
          </CardDescription>
        </Card>
      )}

      {/* Premium info bar — replaces the legacy Portrait/Landscape selector */}
      {selectedEventId && settings && !settingsLoading && (
        <div className="rounded-xl border border-[hsl(var(--primary)/0.18)] bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-[hsl(var(--primary)/0.02)] shadow-soft px-5 py-4 flex items-center justify-center">
          <p className="text-sm text-foreground/85 font-medium text-center">
            Portrait print layouts optimised for professional wedding signage. <span className="mx-1">•</span> 300 DPI • Australian standard print sizes • Print-shop ready PDFs
          </p>
        </div>
      )}

      {/* Editor + Preview — sibling clone of InvitationsPage */}
      {selectedEventId && settings && !settingsLoading && editorSettings && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-2">
            <InvitationCardCustomizer
              settings={editorSettings}
              onSettingsChange={handleSettingsChange}
              eventData={eventData}
              events={events}
              qrDataUrl={qrDataUrl}
              headerTitle="QR Code Seating Chart & Wedding Sign Designer"
              presetZones={SIGNAGE_PRESET_ZONES}
              presetYPositions={SIGNAGE_PRESET_Y_POSITIONS}
              presetStyles={SIGNAGE_PRESET_STYLES}
              textZonesIntro="Add text zones to your sign. Preset zones auto-fill from event data and can be edited."
              bgSectionTitle="QR Code Sign Customisation"
              qrTabTitle="Add QR Code to Sign"
              notesPlaceholder="Add any notes or captions for this QR code seating chart sign design…"
              notesHelper="This is for your reference only and won't appear on the sign."
              imageUploadFolder="signage"
              storageBucket="invitations"
              GalleryModalComponent={SignageGalleryAdapter}
            />
          </div>
          {/* Preview area: extra padding for landscape breathing room */}
          <div className={`lg:col-span-3 lg:mt-12 w-full max-w-full mx-auto pb-6 max-sm:pb-2 max-sm:px-0 max-sm:overflow-x-auto max-sm:overflow-y-hidden md:max-lg:overflow-hidden md:max-lg:flex md:max-lg:justify-center ${
            orientation === 'landscape' ? 'px-4 lg:px-8' : ''
          }`}>
            <div className="max-sm:w-max md:max-lg:w-[210mm]">
              <div className="max-sm:origin-top-left md:max-lg:origin-top max-sm:w-[210mm] md:max-lg:scale-[0.75] md:max-lg:w-[210mm] md:max-lg:-mb-[30%] mx-auto">
                <PinchZoomContainer naturalWidth={orientation === 'portrait' ? 794 : 1123}>
                {(() => { console.log('Editor URL:', lightweightBgUrl); console.log('Master URL:', editorMasterUrl); return null; })()}
                <InvitationCardPreview
                  settings={editorSettings}
                  eventData={eventData}
                  selectedZoneId={selectedZoneId}
                  onSelectZone={setSelectedZoneId}
                  onZoneUpdate={handleZoneUpdate}
                  onZoneDelete={handleZoneDelete}
                  onZoneReset={handleZoneReset}
                  onZoneDuplicate={handleZoneDuplicate}
                  qrDataUrl={qrDataUrl}
                  onQrConfigUpdate={handleQrConfigUpdate}
                  qrWhitePlate
                />
                </PinchZoomContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
