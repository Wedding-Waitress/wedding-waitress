import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { FullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { FULL_SEATING_CHART_COLORS, FullSeatingChartColor } from '@/lib/fullSeatingChartDisplaySettings';
import { 
  ArrowUpDown,
  Type,
  Settings2,
  Eye,
  ListFilter,
  CaseSensitive,
  UtensilsCrossed,
  HeartHandshake,
  Bold,
  Italic,
  Underline,
  ChevronDown,
  Check,
  UserRound,
  Armchair,
  ListOrdered,
} from 'lucide-react';

const COLOR_LABELS: Record<FullSeatingChartColor, string> = {
  '#000000': 'black',
  '#C62828': 'red',
  '#1565C0': 'blue',
  '#2E7D32': 'green',
  '#967A59': 'Wedding Waitress brown',
  '#7E57C2': 'purple',
  '#E67E22': 'orange',
};

const ColorSwatches = ({ name, selected, onChange }: {
  name: string;
  selected: FullSeatingChartColor;
  onChange: (color: FullSeatingChartColor) => void;
}) => (
  <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label={`${name} colour`}>
    {FULL_SEATING_CHART_COLORS.map(value => {
      const isSelected = selected === value;
      const label = COLOR_LABELS[value];
      return (
        <button
          key={value}
          type="button"
          aria-label={`Use ${label} for ${name}`}
          title={`Use ${label} for ${name}`}
          aria-pressed={isSelected}
          onClick={() => onChange(value)}
          className={`h-4 w-4 rounded-full border border-black/30 transition-shadow ${isSelected ? 'ring-2 ring-offset-1 ring-foreground' : 'hover:ring-1 hover:ring-foreground/60'}`}
          style={{ backgroundColor: value }}
        />
      );
    })}
  </div>
);

interface FullSeatingChartCustomizerProps {
  settings: FullSeatingChartSettings;
  onSettingsChange: (settings: Partial<FullSeatingChartSettings>) => void;
}

export const FullSeatingChartCustomizer: React.FC<FullSeatingChartCustomizerProps> = ({
  settings,
  onSettingsChange,
}) => {
  // Build label showing active styles
  const getTextStyleLabel = () => {
    const active: string[] = [];
    if (settings.isBold) active.push('Bold');
    if (settings.isItalic) active.push('Italic');
    if (settings.isUnderline) active.push('Underline');
    return active.length > 0 ? active.join(', ') : 'None';
  };

  return (
    <Card className="border border-[#472c1d] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] h-fit sticky top-0 mt-12 bg-white">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="w-[22px] h-[22px] text-[#472c1d] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <CardTitle className="font-bold text-[#472c1d]" style={{ fontSize: 20 }}>Chart Settings</CardTitle>
        </div>
        <div className="mt-2">
          <h3 className="text-xl font-bold text-[#472c1d]">
            Full Seating Chart Customization
          </h3>
          <CardDescription className="mt-1">
            Customize your full seating chart layout and appearance
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Sort Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-[18px] h-[18px] text-[#472c1d] shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[#472c1d] border border-[#472c1d] rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Sort Order</span>
          </div>
          
          <div>
            <Label htmlFor="sort-by" className="text-xs text-[#472c1d] inline-flex items-center gap-[7px]">
              <ListFilter className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Sort Guests By
            </Label>
            <Select
              value={settings.sortBy}
              onValueChange={(value: 'firstName' | 'lastName' | 'tableNo') => 
                onSettingsChange({ sortBy: value })
              }
            >
              <SelectTrigger id="sort-by" className="w-full border-[#472c1d] focus:ring-[#472c1d]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="firstName">First Name</SelectItem>
                <SelectItem value="lastName">Last Name</SelectItem>
                <SelectItem value="tableNo">Table Number - Names</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Display Options */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="w-[18px] h-[18px] text-[#472c1d] shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[#472c1d] border border-[#472c1d] rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Display Options</span>
          </div>

          <div className="flex items-center gap-1">
            <Label htmlFor="show-guest-names" className="flex flex-1 items-center gap-[7px]">
              <UserRound className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Show Guest Names
            </Label>
            <ColorSwatches name="guest names" selected={settings.guestNameColor} onChange={guestNameColor => onSettingsChange({ guestNameColor })} />
            <Switch id="show-guest-names" checked={settings.showGuestNames} onCheckedChange={showGuestNames => onSettingsChange({ showGuestNames })} />
          </div>

          <div className="flex items-center gap-1">
            <Label htmlFor="show-seat-numbers" className="flex flex-1 items-center gap-[7px]">
              <Armchair className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Show Seat Numbers
            </Label>
            <ColorSwatches name="seat numbers" selected={settings.seatNumberColor} onChange={seatNumberColor => onSettingsChange({ seatNumberColor })} />
            <Switch id="show-seat-numbers" checked={settings.showSeatNumbers} onCheckedChange={showSeatNumbers => onSettingsChange({ showSeatNumbers })} />
          </div>

          <div className="flex items-center gap-1">
            <Label htmlFor="show-guest-list" className="flex flex-1 items-center gap-[7px]">
              <ListOrdered className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Show Guest List
            </Label>
            <ColorSwatches name="guest list" selected={settings.guestListColor} onChange={guestListColor => onSettingsChange({ guestListColor })} />
            <Switch id="show-guest-list" checked={settings.showGuestList} onCheckedChange={showGuestList => onSettingsChange({ showGuestList })} />
          </div>

          <div className="flex items-center gap-1">
            <Label htmlFor="show-dietary" className="flex flex-1 items-center gap-[7px]">
              <UtensilsCrossed className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Show Dietary Requirements
            </Label>
            <ColorSwatches name="dietary requirements" selected={settings.dietaryColor} onChange={dietaryColor => onSettingsChange({ dietaryColor })} />
            <Switch id="show-dietary" checked={settings.showDietary} onCheckedChange={showDietary => onSettingsChange({ showDietary })} />
          </div>

          <div className="flex items-center gap-1">
            <Label htmlFor="show-relation" className="flex flex-1 items-center gap-[7px]">
              <HeartHandshake className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Show Relationship
            </Label>
            <ColorSwatches name="relationships" selected={settings.relationshipColor} onChange={relationshipColor => onSettingsChange({ relationshipColor })} />
            <Switch id="show-relation" checked={settings.showRelation} onCheckedChange={showRelation => onSettingsChange({ showRelation })} />
          </div>
        </div>

        <Separator />

        {/* Typography */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Type className="w-[18px] h-[18px] text-[#472c1d] shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[#472c1d] border border-[#472c1d] rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Typography</span>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-[7px]">
              <CaseSensitive className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Guest Text Size
            </Label>
            <Select
              value={settings.fontSize}
              onValueChange={(fontSize: FullSeatingChartSettings['fontSize']) => onSettingsChange({ fontSize })}
            >
              <SelectTrigger className="w-full border-[#472c1d] focus:ring-[#472c1d]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small — 8 pt</SelectItem>
                <SelectItem value="standard">Standard — 10 pt</SelectItem>
                <SelectItem value="large">Large — 12 pt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-[#472c1d] inline-flex items-center gap-[7px]">
              <CaseSensitive className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Text Style
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between border-[#472c1d] focus:ring-[#472c1d] mt-1"
                >
                  <span className="text-sm">{getTextStyleLabel()}</span>
                  <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] bg-popover border-border z-50">
                <DropdownMenuItem 
                  className="flex items-center justify-between cursor-pointer hover:bg-primary/10 hover:text-[#472c1d] text-foreground"
                  onClick={() => onSettingsChange({ isBold: !settings.isBold })}
                >
                  <div className="flex items-center gap-2">
                    <Bold className="w-4 h-4" />
                    <span>Bold</span>
                  </div>
                  {settings.isBold && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="flex items-center justify-between cursor-pointer hover:bg-primary/10 hover:text-[#472c1d] text-foreground"
                  onClick={() => onSettingsChange({ isItalic: !settings.isItalic })}
                >
                  <div className="flex items-center gap-2">
                    <Italic className="w-4 h-4" />
                    <span>Italic</span>
                  </div>
                  {settings.isItalic && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="flex items-center justify-between cursor-pointer hover:bg-primary/10 hover:text-[#472c1d] text-foreground"
                  onClick={() => onSettingsChange({ isUnderline: !settings.isUnderline })}
                >
                  <div className="flex items-center gap-2">
                    <Underline className="w-4 h-4" />
                    <span>Underline</span>
                  </div>
                  {settings.isUnderline && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
