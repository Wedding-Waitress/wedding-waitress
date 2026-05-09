import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEvents } from '@/hooks/useEvents';
import { useSignageSettings, DEFAULT_PORTRAIT_QR, DEFAULT_LANDSCAPE_QR } from '@/hooks/useSignageSettings';
import {
  InvitationCardCustomizer,
  PresetZoneDef,
} from '../Invitations/InvitationCardCustomizer';
import { InvitationCardPreview } from '../Invitations/InvitationCardPreview';
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils';
import { Loader2, FileText, Calendar, Printer } from 'lucide-react';
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
  { field: 'qr_instructions', label: 'QR Instructions', defaultText: 'Scan to find your seat', getText: () => 'Scan to find your seat' },
];

const SIGNAGE_PRESET_Y_POSITIONS: Record<string, number> = {
  couple_names: 14,
  event_name: 24,
  date: 34,
  venue: 42,
  welcome_message: 54,
  qr_instructions: 66,
};

const SIGNAGE_PRESET_STYLES: Record<string, { font_family: string; font_size: number }> = {
  couple_names: { font_family: 'Great Vibes', font_size: 56 },
  event_name: { font_family: 'ET Emilia Grace Demo', font_size: 28 },
  welcome_message: { font_family: 'ET Emilia Grace Demo', font_size: 22 },
  qr_instructions: { font_family: 'ET Emilia Grace Demo', font_size: 18 },
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

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  const orientation: 'portrait' | 'landscape' = settings?.orientation || 'portrait';

  const eventData = useMemo(() => {
    if (!selectedEvent) return {} as Record<string, string>;
    const p1 = selectedEvent.partner1_name || '';
    const p2 = selectedEvent.partner2_name || '';
    const coupleNames = p1 && p2 ? `${p1} & ${p2}` : p1 || p2 || selectedEvent.name;
    return {
      couple_names: coupleNames,
      event_name: selectedEvent.name || '',
      date: selectedEvent.date ? formatDisplayDate(selectedEvent.date) : '',
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

  const handleDownloadPDF = useCallback(async () => {
    if (!settings || !selectedEvent) return;
    setExporting('pdf');
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

      const fileName = `WW-Sign-${selectedEvent.name}-${orientation === 'portrait' ? 'Portrait' : 'Landscape'}.pdf`;
      await exportInvitationPDF({
        backgroundUrl: settings.background_image_url || '',
        orientation,
        widthMm,
        heightMm,
        textZones: settings.text_zones as any,
        customText,
        customStyles,
        eventData: eventData as Record<string, string>,
        qrConfig: settings.qr_config,
        qrDataUrl: qrDataUrl || undefined,
      }, undefined, fileName);
      toast({ title: 'PDF downloaded', description: 'Your QR seating sign PDF has been saved.' });
    } catch (err) {
      console.error('Signage PDF export error', err);
      toast({ title: 'Export failed', description: 'Could not generate the PDF.', variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  }, [settings, selectedEvent, orientation, eventData, qrDataUrl]);

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
        backgroundUrl: settings.background_image_url || '',
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
            <h1 className="text-2xl font-bold text-foreground">QR Code Seating Chart Sign</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Design a printable A4 sign with a QR code so guests can scan to find their seat — portrait or landscape.
            </p>
          </div>

          {selectedEvent && (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 border border-primary rounded-xl p-4 text-sm space-y-2">
                <p className="font-medium text-green-600">
                  Manage your A4 QR seating signs
                </p>
                <div className="text-muted-foreground space-y-1 mt-3">
                  <p>• All exports are 300 DPI for professional quality</p>
                  <p>• PDF/PNG match the live preview exactly</p>
                  <p>• QR code is sized for real-venue scannability (≥ 35mm)</p>
                  <p>• Portrait or Landscape A4 — display at the entrance or on a table easel</p>
                  <p>• Background images must be smaller than 5MB</p>
                </div>
              </div>
            </div>
          )}

          <div className="border-b border-border" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-8 lg:flex-nowrap pt-2">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 w-full lg:w-auto">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Choose Event:
              </label>
              <Select value={selectedEventId || 'no-event'} onValueChange={handleEventChange}>
                <SelectTrigger className="w-full lg:w-[300px] border-primary focus:ring-primary font-bold text-primary">
                  <SelectValue placeholder="Choose Event" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{event.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEvent && (
              <div className="border border-primary rounded-xl p-3 flex flex-col gap-2 w-full lg:w-auto lg:whitespace-nowrap">
                <div className="text-sm">
                  <span className="font-medium">Export Controls</span>
                  <span className="text-muted-foreground ml-2">Download your sign as PDF or PNG ready for printing.</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    disabled={!settings || exporting !== null}
                    onClick={handleDownloadPDF}
                    className="lv-premium-shade inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
                  >
                    {exporting === 'pdf' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                    {exporting === 'pdf' ? 'Exporting…' : 'Download PDF'}
                  </button>
                  <button
                    disabled={!settings || exporting !== null}
                    onClick={handleDownloadPNG}
                    className="lv-premium-shade inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-primary rounded-full text-primary bg-background hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
                  >
                    {exporting === 'png' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                    {exporting === 'png' ? 'Exporting…' : 'Download PNG'}
                  </button>
                </div>
              </div>
            )}
          </div>
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

      {/* Orientation strip — mirrors Invitations card-type tabs visually */}
      {selectedEventId && settings && !settingsLoading && (
        <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
          <CardContent className="pt-6 space-y-4">
            <div className="grid w-full grid-cols-2 max-sm:h-auto max-sm:gap-1 max-sm:p-1 rounded-md bg-muted text-muted-foreground p-1 h-10 items-center">
              <button
                type="button"
                onClick={() => handleOrientationChange('portrait')}
                className={`lv-premium-shade inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all max-sm:text-[13px] max-sm:px-1 max-sm:py-1.5 ${
                  orientation === 'portrait' ? 'bg-background text-foreground shadow' : ''
                }`}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => handleOrientationChange('landscape')}
                className={`lv-premium-shade inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all max-sm:text-[13px] max-sm:px-1 max-sm:py-1.5 ${
                  orientation === 'landscape' ? 'bg-background text-foreground shadow' : ''
                }`}
              >
                Landscape
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              A4 {orientation === 'portrait' ? '210 × 297mm' : '297 × 210mm'} — designed at print resolution
            </p>
          </CardContent>
        </Card>
      )}

      {/* Editor + Preview — sibling clone of InvitationsPage */}
      {selectedEventId && settings && !settingsLoading && asInvitationSettings && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-2">
            <InvitationCardCustomizer
              settings={asInvitationSettings}
              onSettingsChange={async (changes) => {
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
                if (Object.keys(mapped).length === 0) return true;
                return updateSettings(mapped);
              }}
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
            />
          </div>
          {/* Preview area: extra padding for landscape breathing room */}
          <div className={`lg:col-span-3 lg:mt-12 w-full max-w-full mx-auto pb-6 max-sm:pb-2 max-sm:px-0 max-sm:overflow-x-auto max-sm:overflow-y-hidden md:max-lg:overflow-hidden md:max-lg:flex md:max-lg:justify-center ${
            orientation === 'landscape' ? 'px-4 lg:px-8' : ''
          }`}>
            <div className="max-sm:w-max md:max-lg:w-[210mm]">
              <div className="max-sm:origin-top-left md:max-lg:origin-top max-sm:w-[210mm] md:max-lg:scale-[0.75] md:max-lg:w-[210mm] md:max-lg:-mb-[30%] mx-auto">
                <InvitationCardPreview
                  settings={asInvitationSettings}
                  eventData={eventData}
                  selectedZoneId={selectedZoneId}
                  onSelectZone={setSelectedZoneId}
                  onZoneUpdate={(zoneId, updates) => {
                    const newZones = (settings.text_zones || []).map(z =>
                      z.id === zoneId ? { ...z, ...updates } : z
                    );
                    updateSettings({ text_zones: newZones });
                  }}
                  onZoneDelete={(zoneId) => {
                    const newZones = (settings.text_zones || []).filter(z => z.id !== zoneId);
                    updateSettings({ text_zones: newZones });
                    setSelectedZoneId(null);
                  }}
                  onZoneReset={(zoneId) => {
                    const zones = settings.text_zones || [];
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
                  }}
                  onZoneDuplicate={(zoneId) => {
                    const zones = settings.text_zones || [];
                    const zone = zones.find(z => z.id === zoneId);
                    if (!zone) return;
                    const newZone: TextZone = { ...zone, id: crypto.randomUUID(), x_percent: Math.min(100, zone.x_percent + 3), y_percent: Math.min(100, zone.y_percent + 3) };
                    updateSettings({ text_zones: [...zones, newZone] });
                    setSelectedZoneId(newZone.id);
                  }}
                  qrDataUrl={qrDataUrl}
                  onQrConfigUpdate={handleQrConfigUpdate}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
