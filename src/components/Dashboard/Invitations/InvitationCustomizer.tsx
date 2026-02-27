import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Type, QrCode, RotateCcw } from 'lucide-react';
import type { InvitationTemplate, TextZone } from '@/hooks/useInvitationTemplates';
import { InvitationPreview } from './InvitationPreview';
import { InvitationExporter } from './InvitationExporter';
import { GoogleFontPicker } from './GoogleFontPicker';
import { loadGoogleFont } from '@/lib/googleFonts';
import { generateInvitationQR, DEFAULT_QR_CONFIG, type QrConfig } from '@/lib/invitationQR';

interface Props {
  template: InvitationTemplate;
  eventData: {
    couple_names?: string;
    date?: string;
    venue?: string;
    time?: string;
  };
  eventId: string | null;
  eventSlug?: string;
  initialCustomText?: Record<string, string>;
  initialCustomStyles?: Record<string, any>;
  initialQrConfig?: QrConfig;
  onSave: (customText: Record<string, string>, customStyles: Record<string, any>, qrConfig?: QrConfig) => void;
  onBack: () => void;
}


export const InvitationCustomizer: React.FC<Props> = ({
  template,
  eventData,
  eventId,
  eventSlug,
  initialCustomText = {},
  initialCustomStyles = {},
  initialQrConfig,
  onSave,
  onBack,
}) => {
  const [customText, setCustomText] = useState<Record<string, string>>(initialCustomText);
  const [customStyles, setCustomStyles] = useState<Record<string, any>>(initialCustomStyles);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(template.text_zones[0]?.id || null);
  const [qrConfig, setQrConfig] = useState<QrConfig>(initialQrConfig || DEFAULT_QR_CONFIG);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Generate QR data URL when slug is available
  useEffect(() => {
    if (eventSlug) {
      generateInvitationQR(eventSlug).then(setQrDataUrl).catch(console.error);
    }
  }, [eventSlug]);

  const activeZone = template.text_zones.find(z => z.id === activeZoneId);

  const updateText = (zoneId: string, text: string) => {
    setCustomText(prev => ({ ...prev, [zoneId]: text }));
  };

  const updateStyle = (zoneId: string, key: string, value: any) => {
    setCustomStyles(prev => ({
      ...prev,
      [zoneId]: { ...(prev[zoneId] || {}), [key]: value },
    }));
  };

  const getDisplayText = (zone: TextZone): string => {
    if (customText[zone.id]) return customText[zone.id];
    if (zone.type === 'auto' && zone.auto_field && eventData[zone.auto_field]) {
      return eventData[zone.auto_field]!;
    }
    return zone.default_text;
  };

  const getStyleValue = (zoneId: string, key: string, fallback: any) => {
    return customStyles[zoneId]?.[key] ?? fallback;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold">Customise — {template.name}</h2>
            <p className="text-sm text-muted-foreground">Edit text and styling for your invitation</p>
          </div>
        </div>
        <Button onClick={() => onSave(customText, customStyles, qrConfig)} className="gap-2">
          <Save className="w-4 h-4" /> Save Design
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Live Preview */}
        <div className="flex items-start justify-center">
          <InvitationPreview
            backgroundUrl={template.background_url}
            orientation={template.orientation}
            textZones={template.text_zones}
            customText={customText}
            customStyles={customStyles}
            eventData={eventData}
            className="max-w-md w-full"
            qrConfig={qrConfig}
            qrDataUrl={qrDataUrl}
            onQrConfigChange={setQrConfig}
          />
        </div>

        {/* Editor Panel */}
        <div className="space-y-4">
          {/* Zone selector */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Type className="w-4 h-4" /> Text Fields
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-3">
              {template.text_zones.map(zone => (
                <div
                  key={zone.id}
                  className={`p-3 rounded-lg cursor-pointer border transition-all ${
                    zone.id === activeZoneId
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                  onClick={() => setActiveZoneId(zone.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{zone.label}</span>
                    <span className="text-xs text-muted-foreground capitalize">{zone.type}</span>
                  </div>
                  {zone.type === 'auto' ? (
                    <p className="text-xs text-muted-foreground">Auto-filled from event: {zone.auto_field}</p>
                  ) : (
                    <Input
                      value={getDisplayText(zone)}
                      onChange={e => updateText(zone.id, e.target.value)}
                      className="h-7 text-xs mt-1"
                      placeholder={zone.default_text}
                      onClick={e => e.stopPropagation()}
                    />
                  )}
                </div>
              ))}
              {template.text_zones.length === 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center space-y-2">
                  <p className="text-sm font-medium text-foreground">No text zones configured</p>
                  <p className="text-xs text-muted-foreground">
                    This template doesn't have any text fields yet. An admin needs to open the <strong>Text Zones</strong> editor for this template in the Admin panel to add editable areas like Couple Names, Date, Venue, etc.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active zone styling */}
          {activeZone && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Style — {activeZone.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <div>
                  <Label className="text-xs">Font Family</Label>
                  <GoogleFontPicker
                    value={getStyleValue(activeZone.id, 'font_family', activeZone.font_family)}
                    onValueChange={v => updateStyle(activeZone.id, 'font_family', v)}
                  />
                </div>

                <div>
                  <Label className="text-xs">Font Size ({getStyleValue(activeZone.id, 'font_size', activeZone.font_size)}px)</Label>
                  <Slider
                    value={[getStyleValue(activeZone.id, 'font_size', activeZone.font_size)]}
                    min={8} max={72} step={1}
                    onValueChange={([v]) => updateStyle(activeZone.id, 'font_size', v)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Weight</Label>
                    <Select
                      value={getStyleValue(activeZone.id, 'font_weight', activeZone.font_weight)}
                      onValueChange={v => updateStyle(activeZone.id, 'font_weight', v)}
                    >
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="300">Light</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Align</Label>
                    <Select
                      value={getStyleValue(activeZone.id, 'text_align', activeZone.text_align)}
                      onValueChange={v => updateStyle(activeZone.id, 'text_align', v)}
                    >
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Font Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={getStyleValue(activeZone.id, 'font_color', activeZone.font_color)}
                      onChange={e => updateStyle(activeZone.id, 'font_color', e.target.value)}
                      className="w-8 h-8 rounded border cursor-pointer"
                    />
                    <Input
                      value={getStyleValue(activeZone.id, 'font_color', activeZone.font_color)}
                      onChange={e => updateStyle(activeZone.id, 'font_color', e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Letter Spacing ({getStyleValue(activeZone.id, 'letter_spacing', activeZone.letter_spacing)}px)</Label>
                  <Slider
                    value={[getStyleValue(activeZone.id, 'letter_spacing', activeZone.letter_spacing)]}
                    min={-2} max={10} step={0.5}
                    onValueChange={([v]) => updateStyle(activeZone.id, 'letter_spacing', v)}
                  />
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Text Case</Label>
                  <ToggleGroup
                    type="single"
                    value={getStyleValue(activeZone.id, 'text_case', activeZone.text_case || 'default')}
                    onValueChange={(v) => { if (v) updateStyle(activeZone.id, 'text_case', v); }}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="default" className="h-7 px-2.5 text-xs">Default</ToggleGroupItem>
                    <ToggleGroupItem value="upper" className="h-7 px-2.5 text-xs uppercase">Upper</ToggleGroupItem>
                    <ToggleGroupItem value="lower" className="h-7 px-2.5 text-xs lowercase">lower</ToggleGroupItem>
                    <ToggleGroupItem value="title" className="h-7 px-2.5 text-xs capitalize">Title</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </CardContent>
            </Card>
          )}

          {/* QR Code Controls */}
          {eventSlug && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <QrCode className="w-4 h-4" /> QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Show QR on invitation</Label>
                  <Switch
                    checked={qrConfig.enabled}
                    onCheckedChange={enabled => setQrConfig(prev => ({ ...prev, enabled }))}
                  />
                </div>
                {qrConfig.enabled && (
                  <>
                    <div>
                      <Label className="text-xs">Size ({qrConfig.size_percent}%)</Label>
                      <Slider
                        value={[qrConfig.size_percent]}
                        min={8} max={35} step={1}
                        onValueChange={([v]) => setQrConfig(prev => ({ ...prev, size_percent: v }))}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Drag the QR code on the preview to reposition it.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => setQrConfig(prev => ({ ...prev, x_percent: 85, y_percent: 85 }))}
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Position
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Export Panel */}
          <InvitationExporter
            template={template}
            customText={customText}
            customStyles={customStyles}
            eventData={eventData as Record<string, string>}
            eventId={eventId}
            qrConfig={qrConfig}
            qrDataUrl={qrDataUrl}
          />
        </div>
      </div>
    </div>
  );
};
