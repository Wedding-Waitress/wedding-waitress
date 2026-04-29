import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { InvitationCardSettings, TextZone, DEFAULT_QR_CONFIG } from '@/hooks/useInvitationCardSettings';
import { Palette, Type, Image, MessageSquare, Layers, Upload, Images, Trash2, Plus, GripVertical, QrCode } from 'lucide-react';
import canvaEditBanner from '@/assets/canva-edit-banner.png';
import { InvitationGalleryModal } from './InvitationGalleryModal';
import { PlaceCardFontPicker } from '../PlaceCards/PlaceCardFontPicker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ColorPickerPopover } from '@/components/ui/color-picker-popover';




interface InvitationCardCustomizerProps {
  settings: InvitationCardSettings | null;
  onSettingsChange: (settings: Partial<InvitationCardSettings>) => Promise<boolean>;
  eventData: Record<string, string>;
  events?: { id: string; name: string; slug?: string | null }[];
  qrDataUrl?: string | null;
  onQrEventChange?: (eventId: string | null) => void;
}

const formatOrdinalDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // Try ISO format first (e.g., "2026-12-20")
  let date = new Date(dateStr + 'T00:00:00');
  
  // If invalid, try stripping ordinal suffixes (e.g., "5th, November 2026" → "5, November 2026")
  if (isNaN(date.getTime())) {
    const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
    date = new Date(cleaned);
  }
  
  if (isNaN(date.getTime())) return '';
  
  const day = date.getDate();
  const suffix = (day > 3 && day < 21) ? 'th' : (['th', 'st', 'nd', 'rd'][day % 10] || 'th');
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${weekday}, the ${day}${suffix} of ${month} ${year}`;
};

export const PRESET_ZONES: { field: string; label: string; defaultText: string; getDisabled?: (eventData: Record<string, string>) => boolean; getText?: (eventData: Record<string, string>) => string }[] = [
  {
    field: 'you_are_invited',
    label: 'You Are Invited',
    defaultText: 'You Are Invited',
    getText: () => 'You Are Invited',
  },
  { field: 'event_name', label: 'Event Name', defaultText: '' },
  {
    field: 'date',
    label: 'Event Date',
    defaultText: '',
    getText: (ed) => {
      const formatted = formatOrdinalDate(ed.date_raw);
      return formatted ? `Event Date - ${formatted}` : '';
    },
  },
  {
    field: 'ceremony_info',
    label: 'Ceremony Info',
    defaultText: '',
    getDisabled: (ed) => ed.ceremony_enabled !== 'true',
    getText: (ed) => {
      const venue = ed.ceremony_venue || '';
      const address = ed.ceremony_venue_address || '';
      const location = [venue, address].filter(Boolean).join(', ');
      const timeRange = ed.ceremony_time && ed.ceremony_finish_time
        ? `${ed.ceremony_time} — ${ed.ceremony_finish_time}`
        : ed.ceremony_time || '';
      const details = [location, timeRange].filter(Boolean).join(', ');
      return `Ceremony - ${details}`;
    },
  },
  {
    field: 'reception_info',
    label: 'Reception Info',
    defaultText: '',
    getDisabled: (ed) => ed.reception_enabled !== 'true',
    getText: (ed) => {
      const venue = ed.venue || '';
      const address = ed.venue_address || '';
      const location = [venue, address].filter(Boolean).join(', ');
      const timeRange = ed.time && ed.finish_time
        ? `${ed.time} — ${ed.finish_time}`
        : ed.time || '';
      const details = [location, timeRange].filter(Boolean).join(', ');
      return `Reception - ${details}`;
    },
  },
  {
    field: 'dress_code',
    label: 'Dress Code',
    defaultText: 'Dress Code - Formal / Dress to Impress',
    getText: () => 'Dress Code - Formal / Dress to Impress',
  },
  {
    field: 'rsvp_deadline',
    label: 'RSVP Deadline',
    defaultText: '',
    getText: (ed) => {
      const formatted = formatOrdinalDate(ed.rsvp_deadline_raw);
      return formatted ? `RSVP Deadline - ${formatted}` : '';
    },
  },
];

const createDefaultZone = (type: 'preset' | 'custom', label: string, presetField?: string, yPercent: number = 50): TextZone => ({
  id: `zone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label,
  type,
  preset_field: presetField,
  text: '',
  font_family: 'ET Emilia Grace Demo',
  font_size: 20,
  font_color: '#000000',
  font_weight: 'normal',
  font_style: 'normal',
  text_align: 'center',
  text_case: 'default',
  x_percent: 50,
  y_percent: yPercent,
  width_percent: 80,
  rotation: 0,
});

export const PRESET_Y_POSITIONS: Record<string, number> = {
  you_are_invited: 14,
  event_name: 26,
  date: 42,
  ceremony_info: 52,
  reception_info: 62,
  dress_code: 72,
  rsvp_deadline: 82,
};

export const PRESET_STYLES: Record<string, { font_family: string; font_size: number }> = {
  you_are_invited: { font_family: 'ET Emilia Grace Demo', font_size: 24 },
  event_name: { font_family: 'Great Vibes', font_size: 56 },
};

export const InvitationCardCustomizer: React.FC<InvitationCardCustomizerProps> = ({
  settings,
  onSettingsChange,
  eventData,
  events = [],
  qrDataUrl,
  onQrEventChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState('');
  const { toast } = useToast();

  const currentSettings: InvitationCardSettings = settings || {
    event_id: '',
    user_id: '',
    background_color: '#ffffff',
    background_image_url: null,
    background_image_type: 'none',
    background_image_x_position: 50,
    background_image_y_position: 50,
    background_image_opacity: 100,
    text_zones: [],
    font_color: '#000000',
    card_size: 'A4',
    orientation: 'portrait',
    card_type: 'invitation',
    name: 'Untitled',
    qr_config: { ...DEFAULT_QR_CONFIG },
  };

  const textZones = currentSettings.text_zones || [];

  const handleSettingChange = async (key: keyof InvitationCardSettings, value: any) => {
    await onSettingsChange({ [key]: value });
  };

  const updateZones = async (newZones: TextZone[]) => {
    await onSettingsChange({ text_zones: newZones });
  };

  const addPresetZone = async (preset: typeof PRESET_ZONES[number]) => {
    const exists = textZones.some(z => z.type === 'preset' && z.preset_field === preset.field);
    if (exists) {
      toast({ title: "Already Added", description: `${preset.label} zone already exists` });
      return;
    }
    const yOffset = PRESET_Y_POSITIONS[preset.field] ?? (8 + textZones.length * 12);
    const zone = createDefaultZone('preset', preset.label, preset.field, Math.min(yOffset, 85));
    zone.text = preset.getText ? preset.getText(eventData) : (eventData[preset.field] || preset.defaultText || '');
    
    // Apply per-preset font/size overrides
    const style = PRESET_STYLES[preset.field];
    if (style) {
      zone.font_family = style.font_family;
      zone.font_size = style.font_size;
    }
    
    await updateZones([...textZones, zone]);
  };

  const addCustomZone = async () => {
    const yOffset = 8 + textZones.length * 12;
    const zone = createDefaultZone('custom', `Custom Text ${textZones.filter(z => z.type === 'custom').length + 1}`, undefined, Math.min(yOffset, 85));
    await updateZones([...textZones, zone]);
  };

  const removeZone = async (zoneId: string) => {
    await updateZones(textZones.filter(z => z.id !== zoneId));
  };

  const updateZone = async (zoneId: string, updates: Partial<TextZone>) => {
    const newZones = textZones.map(z => z.id === zoneId ? { ...z, ...updates } : z);
    await updateZones(newZones);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be smaller than 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('User not authenticated');
      const fileExt = file.name.split('.').pop();
      const fileName = `invitation-bg-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/invitations/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('invitations').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('invitations').getPublicUrl(filePath);
      await handleSettingChange('background_image_url', publicUrl);
      toast({ title: "Success", description: "Image uploaded successfully" });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] h-fit sticky top-0 mt-12 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 py-[10px] text-2xl font-bold text-foreground">
            <Palette className="h-5 w-5 text-foreground" />
            Invitations, Save the Date & Thank You Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="text-zones" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="text-zones">Text Zones</TabsTrigger>
              <TabsTrigger value="background">Background</TabsTrigger>
              <TabsTrigger value="qr-code">Add QR Code</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
            </TabsList>

            {/* TEXT ZONES TAB */}
            <TabsContent value="text-zones" className="space-y-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add text zones to your invitation. Preset zones auto-fill from event data but can be overridden.
                </p>

                {/* Add Preset Zone buttons */}
                <div className="space-y-2">
                  <span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Add Preset Zone</span>
                  <div className="flex flex-wrap gap-2 max-w-fit">
                    {PRESET_ZONES.map(pz => {
                      const isDisabled = textZones.some(z => z.preset_field === pz.field) || (pz.getDisabled ? pz.getDisabled(eventData) : false);
                      return (
                        <Button
                          key={pz.field}
                          size="sm"
                          variant="outline"
                          onClick={() => addPresetZone(pz)}
                          className="text-xs text-foreground"
                          disabled={isDisabled}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {pz.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  onClick={addCustomZone}
                  className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Text Zone
                </Button>

                {/* Zone list */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {textZones.map((zone) => (
                    <div key={zone.id} className="p-3 border rounded-lg bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-[#967A59] border border-[#967A59] rounded-full px-3 py-1">{zone.label}</span>
                          {zone.type === 'preset' && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Preset</span>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeZone(zone.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>

                      <div>
                        <Label className="text-xs">Text Content</Label>
                        <Input
                          value={zone.text || (zone.type === 'preset' && zone.preset_field ? eventData[zone.preset_field] || '' : '')}
                          onChange={(e) => updateZone(zone.id, { text: e.target.value })}
                          placeholder={zone.type === 'preset' && zone.preset_field ? eventData[zone.preset_field] || `Enter ${zone.label}...` : 'Enter text...'}
                          className="mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Font</Label>
                          <PlaceCardFontPicker
                            value={zone.font_family}
                            onValueChange={(v) => updateZone(zone.id, { font_family: v })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Size (px)</Label>
                          <Select value={zone.font_size.toString()} onValueChange={(v) => updateZone(zone.id, { font_size: parseInt(v) })}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 120, 150].map(s => (
                                <SelectItem key={s} value={s.toString()}>{s}px</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Font Color</Label>
                          <ColorPickerPopover
                            value={zone.font_color}
                            onChange={(color) => updateZone(zone.id, { font_color: color })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Text Style</Label>
                          <Select value={zone.font_style || 'default'} onValueChange={(v) => updateZone(zone.id, { font_style: v })}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Default</SelectItem>
                              <SelectItem value="bold">Bold</SelectItem>
                              <SelectItem value="italic">Italic</SelectItem>
                              <SelectItem value="underline">Underline</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Align</Label>
                          <Select value={zone.text_align} onValueChange={(v) => updateZone(zone.id, { text_align: v })}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Text Case</Label>
                          <Select value={zone.text_case} onValueChange={(v) => updateZone(zone.id, { text_case: v })}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Default</SelectItem>
                              <SelectItem value="uppercase">UPPERCASE</SelectItem>
                              <SelectItem value="lowercase">lowercase</SelectItem>
                              <SelectItem value="capitalize">Title Case</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Read-only position indicators */}
                      <div className="space-y-2 bg-muted/50 p-2 rounded-md">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Position & Size (drag on preview to adjust)</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>X: {Math.round(zone.x_percent)}%</span>
                          <span>Y: {Math.round(zone.y_percent)}%</span>
                          <span>W: {Math.round(zone.width_percent)}%</span>
                          <span>↻ {Math.round(zone.rotation || 0)}°</span>
                          {(zone.rotation || 0) !== 0 && (
                            <button
                              onClick={() => updateZone(zone.id, { rotation: 0 })}
                              className="text-primary hover:underline text-[10px]"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {textZones.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground/80 border-2 border-dashed rounded-lg px-4">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">No text zones added yet</p>
                    <p className="text-xs mt-1">Start by adding a preset or custom text zone to build your invitation.</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button
                    onClick={async () => {
                      await onSettingsChange({ text_zones: [] });
                      toast({ title: "Text Zones Reset", description: "All text zones have been removed" });
                    }}
                    variant="outline"
                    className="w-full rounded-full border-primary text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    Reset to Default
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* BACKGROUND TAB */}
            <TabsContent value="background" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <Image className="h-4 w-4" />
                    Background Image
                  </Label>
                  <RadioGroup
                    value={currentSettings.background_image_type}
                    onValueChange={(value: 'none' | 'full') => handleSettingChange('background_image_type', value)}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="inv-none" />
                      <Label htmlFor="inv-none">No background image</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="full" id="inv-full" />
                      <Label htmlFor="inv-full">Full background image</Label>
                    </div>
                  </RadioGroup>
                </div>

                {currentSettings.background_image_type === 'full' && (
                  <div>
                    <Label className="mb-2 block">Upload Background Image</Label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="hidden"
                        id="inv-background-image-upload"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => document.getElementById('inv-background-image-upload')?.click()}
                          disabled={uploading}
                          className="flex-1 rounded-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Upload className="h-4 w-4" />
                          {uploading ? 'Uploading...' : 'Choose File'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setGalleryModalOpen(true)}
                          className="flex-1 rounded-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Images className="h-4 w-4" />
                          Image Gallery
                        </Button>
                        <img
                          src={canvaEditBanner}
                          alt="Edit with Canva"
                          className="h-12 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open('https://www.canva.com', '_blank')}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Want more design freedom? Click 'Edit with Canva' to customise your invitation using Canva. After downloading your design as PNG or PDF, return here and upload it to Wedding Waitress.
                      </p>

                      {currentSettings.background_image_url && (
                        <div className="mt-2 space-y-2">
                          <img src={currentSettings.background_image_url} alt="Background preview" className="w-full h-auto object-contain rounded border max-h-32" />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              await handleSettingChange('background_image_url', null);
                              toast({ title: "Image Removed", description: "Background image has been removed" });
                            }}
                            className="w-full rounded-full flex items-center justify-center gap-2 bg-destructive/85 hover:bg-destructive/95"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove Image
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-medium">Invitation Customisation</h4>
                  {currentSettings.background_image_type === 'full' && currentSettings.background_image_url && (
                    <div className="space-y-2">
                      <Label>Image Opacity</Label>
                      <Select
                        value={String(currentSettings.background_image_opacity || 100)}
                        onValueChange={(value) => handleSettingChange('background_image_opacity', Number(value))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(val => (
                            <SelectItem key={val} value={String(val)}>{val}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Card Background Color</Label>
                    <ColorPickerPopover
                      value={currentSettings.background_color}
                      onChange={(color) => handleSettingChange('background_color', color)}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={async () => {
                      await onSettingsChange({
                        background_color: '#ffffff',
                        background_image_url: null,
                        background_image_type: 'none',
                        background_image_x_position: 50,
                        background_image_y_position: 50,
                        background_image_opacity: 100,
                      });
                      toast({ title: "Background Reset", description: "Background settings reset to defaults" });
                    }}
                    variant="outline"
                    className="w-full rounded-full border-primary text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    Reset to Default
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* QR CODE TAB */}
            <TabsContent value="qr-code" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">
                  <QrCode className="h-5 w-5 inline-block mr-2" />
                  Add QR Code to Invite
                </h3>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Choose Event</Label>
                  <Select
                    value={currentSettings.qr_config?.event_id || 'none'}
                    onValueChange={(val) => {
                      const eventId = val === 'none' ? null : val;
                      onQrEventChange?.(eventId);
                      handleSettingChange('qr_config', {
                        ...currentSettings.qr_config,
                        enabled: !!eventId,
                        event_id: eventId,
                      });
                    }}
                  >
                    <SelectTrigger className="w-full border-primary">
                      <SelectValue placeholder="Select an event..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      <SelectItem value="none">No QR Code</SelectItem>
                      {events.map(ev => (
                        <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {currentSettings.qr_config?.enabled && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Show QR on Canvas</Label>
                      <Switch
                        checked={currentSettings.qr_config.enabled}
                        onCheckedChange={(checked) => {
                          handleSettingChange('qr_config', {
                            ...currentSettings.qr_config,
                            enabled: checked,
                          });
                        }}
                      />
                    </div>

                    {qrDataUrl && (
                      <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
                        <img src={qrDataUrl} alt="QR Preview" className="w-32 h-32" />
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Drag the QR code on the canvas to reposition it. Use the corner handles to resize.
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button
                    onClick={() => {
                      handleSettingChange('qr_config', { ...DEFAULT_QR_CONFIG });
                      onQrEventChange?.(null);
                      toast({ title: "QR Code Reset", description: "QR code removed from invitation" });
                    }}
                    variant="outline"
                    className="w-full rounded-full border-primary text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    Reset to Default
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* MESSAGES TAB */}
            <TabsContent value="messages" className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border-2 border-accent-foreground rounded-xl space-y-3">
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notes / Caption
                  </Label>
                  <Textarea
                    placeholder="Add any notes or captions for this invitation design..."
                    value={localNotes}
                    onChange={e => setLocalNotes(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is for your reference only and won't appear on the invitation.
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={() => {
                      setLocalNotes('');
                      toast({ title: "Messages Reset", description: "Notes and captions have been cleared" });
                    }}
                    variant="outline"
                    className="w-full rounded-full border-primary text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    Reset to Default
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <InvitationGalleryModal
        open={galleryModalOpen}
        onOpenChange={setGalleryModalOpen}
        onSelectImage={async (imageUrl) => {
          await handleSettingChange('background_image_url', imageUrl);
          toast({ title: "Image Selected", description: "Gallery image has been applied" });
        }}
      />
    </>
  );
};
