import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ArrowLeft, Plus, Trash2, Move, ChevronUp, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';
import type { InvitationTemplate, TextZone } from '@/hooks/useInvitationTemplates';

interface Props {
  template: InvitationTemplate;
  onSave: (zones: TextZone[]) => void;
  onCancel: () => void;
}

const FONT_OPTIONS = [
  'Playfair Display', 'Great Vibes', 'Cormorant Garamond', 'Lora', 'Libre Baskerville',
  'Dancing Script', 'Montserrat', 'Raleway', 'Inter', 'Georgia', 'Times New Roman',
  'Alex Brush', 'Cinzel', 'Italiana', 'Josefin Sans',
];

const AUTO_FIELDS = [
  { value: 'couple_names', label: 'Couple Names' },
  { value: 'date', label: 'Event Date' },
  { value: 'venue', label: 'Venue' },
  { value: 'time', label: 'Event Time' },
  { value: 'ceremony_date', label: 'Ceremony Date' },
  { value: 'ceremony_time', label: 'Ceremony Time' },
  { value: 'ceremony_venue', label: 'Ceremony Venue' },
  { value: 'reception_date', label: 'Reception Date' },
  { value: 'reception_time', label: 'Reception Time' },
  { value: 'reception_venue', label: 'Reception Venue' },
  { value: 'rsvp_deadline', label: 'RSVP Deadline' },
];

const createDefaultZone = (index: number): TextZone => ({
  id: `zone_${Date.now()}_${index}`,
  label: `Text Field ${index + 1}`,
  type: 'custom',
  auto_field: null,
  x_percent: 50,
  y_percent: 20 + (index * 15),
  width_percent: 80,
  max_lines: 2,
  default_text: 'Sample Text',
  font_family: 'Playfair Display',
  font_size: 20,
  font_weight: 'normal',
  font_color: '#333333',
  text_align: 'center',
  letter_spacing: 0,
  text_case: 'default',
});

export const TemplateTextZoneEditor: React.FC<Props> = ({ template, onSave, onCancel }) => {
  const [zones, setZones] = useState<TextZone[]>(template.text_zones || []);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(zones[0]?.id || null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(50);

  const selectedZone = zones.find(z => z.id === selectedZoneId) || null;

  const addZone = () => {
    const newZone = createDefaultZone(zones.length);
    setZones([...zones, newZone]);
    setSelectedZoneId(newZone.id);
  };

  const removeZone = (id: string) => {
    setZones(zones.filter(z => z.id !== id));
    if (selectedZoneId === id) setSelectedZoneId(zones[0]?.id || null);
  };

  const updateZone = (id: string, updates: Partial<TextZone>) => {
    setZones(zones.map(z => z.id === id ? { ...z, ...updates } : z));
  };

  const moveZoneUp = (id: string) => {
    setZones(prev => {
      const idx = prev.findIndex(z => z.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveZoneDown = (id: string) => {
    setZones(prev => {
      const idx = prev.findIndex(z => z.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  // Calculate aspect ratio for preview
  const isPortrait = template.orientation === 'portrait';
  const aspectRatio = isPortrait ? 148 / 210 : 210 / 148;

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedZoneId || isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    updateZone(selectedZoneId, { x_percent: Math.round(x), y_percent: Math.round(y) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onCancel}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h2 className="text-lg font-bold">Text Zones — {template.name}</h2>
            <p className="text-sm text-muted-foreground">Click on the preview to position text, edit properties on the right</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(zones)}>Save Zones</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Preview Panel */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* Zoom controls */}
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Slider
                value={[zoom]}
                min={0}
                max={100}
                step={5}
                onValueChange={([v]) => setZoom(v)}
                className="flex-1"
              />
              <ZoomIn className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground w-10 text-right">{zoom}%</span>
              {zoom !== 50 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setZoom(50)}>
                  Reset
                </Button>
              )}
            </div>

            <div className="overflow-auto" style={{ maxHeight: '85vh' }}>
              <div
                className="relative mx-auto border rounded-lg overflow-hidden cursor-crosshair bg-muted"
                style={{
                  aspectRatio: `${isPortrait ? 148 : 210} / ${isPortrait ? 210 : 148}`,
                  transform: `scale(${0.3 + (zoom / 100) * 0.7})`,
                  transformOrigin: 'top center',
                }}
                onClick={handlePreviewClick}
              >
                <img
                  src={template.background_url}
                  alt={template.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {zones.map(zone => {
                  const isSelected = zone.id === selectedZoneId;
                  return (
                    <div
                      key={zone.id}
                      className={`absolute cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-1' : 'hover:ring-1 hover:ring-primary/50'}`}
                      style={{
                        left: `${zone.x_percent - zone.width_percent / 2}%`,
                        top: `${zone.y_percent - 3}%`,
                        width: `${zone.width_percent}%`,
                        textAlign: zone.text_align as any,
                        fontFamily: zone.font_family,
                        fontSize: `${zone.font_size * 0.5}px`,
                        fontWeight: zone.font_weight,
                        color: zone.font_color,
                        letterSpacing: `${zone.letter_spacing}px`,
                        padding: '2px 4px',
                        backgroundColor: isSelected ? 'rgba(114, 72, 230, 0.1)' : 'transparent',
                      }}
                      onClick={(e) => { e.stopPropagation(); setSelectedZoneId(zone.id); }}
                    >
                      <span className="text-xs bg-primary text-primary-foreground px-1 rounded absolute -top-4 left-0 whitespace-nowrap">
                        {zone.label}
                      </span>
                      {zone.default_text}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Properties Panel */}
        <div className="space-y-4">
          {/* Zone List */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Text Zones ({zones.length})</CardTitle>
                <Button size="sm" variant="outline" onClick={addZone} className="gap-1 h-7 text-xs">
                  <Plus className="w-3 h-3" /> Add Zone
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {zones.map((zone, idx) => (
                  <div
                    key={zone.id}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer text-sm ${zone.id === selectedZoneId ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
                    onClick={() => setSelectedZoneId(zone.id)}
                  >
                    <Move className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{zone.label}</span>
                    <span className="text-xs text-muted-foreground">{zone.type}</span>
                    <Button variant="ghost" size="sm" className={`h-5 w-5 p-0 ${idx === 0 ? 'invisible' : ''}`} onClick={(e) => { e.stopPropagation(); moveZoneUp(zone.id); }}>
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className={`h-5 w-5 p-0 ${idx === zones.length - 1 ? 'invisible' : ''}`} onClick={(e) => { e.stopPropagation(); moveZoneDown(zone.id); }}>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); removeZone(zone.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {zones.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No zones. Click "Add Zone" to start.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Selected Zone Properties */}
          {selectedZone && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Zone Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input value={selectedZone.label} onChange={e => updateZone(selectedZone.id, { label: e.target.value })} className="h-8 text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={selectedZone.type} onValueChange={v => updateZone(selectedZone.id, { type: v as any, auto_field: v === 'auto' ? 'couple_names' : null })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-fill</SelectItem>
                        <SelectItem value="custom">Custom Text</SelectItem>
                        <SelectItem value="guest_name">Guest Name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedZone.type === 'auto' && (
                    <div>
                      <Label className="text-xs">Auto Field</Label>
                      <Select value={selectedZone.auto_field || 'couple_names'} onValueChange={v => updateZone(selectedZone.id, { auto_field: v as any })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {AUTO_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs">Default Text</Label>
                  <Input value={selectedZone.default_text} onChange={e => updateZone(selectedZone.id, { default_text: e.target.value })} className="h-8 text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">X Position ({selectedZone.x_percent}%)</Label>
                    <Slider value={[selectedZone.x_percent]} min={0} max={100} step={1} onValueChange={([v]) => updateZone(selectedZone.id, { x_percent: v })} />
                  </div>
                  <div>
                    <Label className="text-xs">Y Position ({selectedZone.y_percent}%)</Label>
                    <Slider value={[selectedZone.y_percent]} min={0} max={100} step={1} onValueChange={([v]) => updateZone(selectedZone.id, { y_percent: v })} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Width ({selectedZone.width_percent}%)</Label>
                  <Slider value={[selectedZone.width_percent]} min={10} max={100} step={1} onValueChange={([v]) => updateZone(selectedZone.id, { width_percent: v })} />
                </div>

                <div>
                  <Label className="text-xs">Font Family</Label>
                  <Select value={selectedZone.font_family} onValueChange={v => updateZone(selectedZone.id, { font_family: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Size ({selectedZone.font_size}px)</Label>
                    <Slider value={[selectedZone.font_size]} min={8} max={150} step={1} onValueChange={([v]) => updateZone(selectedZone.id, { font_size: v })} />
                  </div>
                  <div>
                    <Label className="text-xs">Weight</Label>
                    <Select value={selectedZone.font_weight} onValueChange={v => updateZone(selectedZone.id, { font_weight: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                        <SelectItem value="300">Light</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Align</Label>
                    <Select value={selectedZone.text_align} onValueChange={v => updateZone(selectedZone.id, { text_align: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Font Color</Label>
                    <div className="flex gap-1">
                      <input
                        type="color"
                        value={selectedZone.font_color}
                        onChange={e => updateZone(selectedZone.id, { font_color: e.target.value })}
                        className="w-8 h-8 rounded border cursor-pointer"
                      />
                      <Input
                        value={selectedZone.font_color}
                        onChange={e => updateZone(selectedZone.id, { font_color: e.target.value })}
                        className="h-8 text-xs flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Letter Spacing ({selectedZone.letter_spacing}px)</Label>
                    <Slider value={[selectedZone.letter_spacing]} min={-2} max={10} step={0.5} onValueChange={([v]) => updateZone(selectedZone.id, { letter_spacing: v })} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Text Case</Label>
                  <ToggleGroup
                    type="single"
                    value={selectedZone.text_case || 'default'}
                    onValueChange={(v) => { if (v) updateZone(selectedZone.id, { text_case: v as any }); }}
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
        </div>
      </div>
    </div>
  );
};
