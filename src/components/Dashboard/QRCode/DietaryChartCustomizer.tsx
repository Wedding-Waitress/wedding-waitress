/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * The QR Code Seating Chart feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break QR code generation and customisation
 * - Changes could break the guest lookup link system
 * - Changes could break real-time event syncing
 *
 * Last locked: 2026-02-19
 */
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings2, UtensilsCrossed, ArrowUpDown, Eye, Type, Bold, Italic, Underline, ChevronDown, Check, ListFilter, HeartHandshake, Armchair, CaseSensitive, UserRound, ListOrdered } from 'lucide-react';
import { DietaryChartSettings } from '@/hooks/useDietaryChartSettings';
import { DIETARY_ACCENT_COLORS, DietaryAccentColor } from '@/lib/dietaryChartSettings';
import styles from './KitchenDietaryChartPage.module.css';

interface DietaryChartCustomizerProps {
  settings: DietaryChartSettings;
  onSettingsChange: (settings: Partial<DietaryChartSettings>) => void;
}

const COLOR_LABELS: Record<DietaryAccentColor, string> = {
  '#000000': 'black',
  '#C62828': 'red',
  '#1565C0': 'blue',
  '#2E7D32': 'green',
  '#967A59': 'Wedding Waitress gold',
  '#7E57C2': 'purple',
  '#E67E22': 'orange',
};

const ColorSwatches = ({ name, selected, onChange }: {
  name: string;
  selected: DietaryAccentColor;
  onChange: (color: DietaryAccentColor) => void;
}) => (
  <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label={`${name} colour`}>
    {DIETARY_ACCENT_COLORS.map(color => {
      const isSelected = selected === color;
      const label = COLOR_LABELS[color];
      return (
        <button
          key={color}
          type="button"
          aria-label={`Use ${label} for ${name}`}
          title={`Use ${label} for ${name}`}
          aria-pressed={isSelected}
          onClick={() => onChange(color)}
          className={`${styles.colorSwatch} h-4 w-4 rounded-full border border-black/30 transition-shadow ${isSelected ? 'ring-2 ring-offset-1 ring-foreground' : 'hover:ring-1 hover:ring-foreground/60'}`}
          style={{ backgroundColor: color }}
        />
      );
    })}
  </div>
);

export const DietaryChartCustomizer: React.FC<DietaryChartCustomizerProps> = ({
  settings,
  onSettingsChange
}) => {
  const getTextStyleLabel = () => {
    const active: string[] = [];
    if (settings.isBold) active.push('Bold');
    if (settings.isItalic) active.push('Italic');
    if (settings.isUnderline) active.push('Underline');
    return active.length > 0 ? active.join(', ') : 'None';
  };

  return (
    <Card className={`${styles.settingsPanel} h-fit sticky top-0`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="w-[22px] h-[22px] text-[#472c1d]" strokeWidth={1.8} aria-hidden="true" />
          <CardTitle className={`${styles.majorHeading} text-xl font-bold text-[#472c1d]`}>Chart Settings</CardTitle>
        </div>
        <div className="mt-2">
          <h3 className={`${styles.sectionHeading} text-xl font-bold text-[#472c1d] flex items-center gap-2`}>
            <UtensilsCrossed className="w-[22px] h-[22px] text-[#472c1d] shrink-0" strokeWidth={1.8} aria-hidden="true" />
            Custom Dietary Requirements
          </h3>
          <CardDescription className={`${styles.interfaceDescription} mt-1`}>Customise how your dietary requirements chart is displayed and exported</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        {/* Sort Order */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-[18px] h-[18px] text-[#472c1d]" strokeWidth={1.8} aria-hidden="true" />
            <span className={`${styles.sectionLabel} ${styles.interfaceLabel} rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold`}>Sort Order</span>
          </div>
          <div>
            <Label htmlFor="sort-by" className="text-xs text-[#472c1d] inline-flex items-center gap-1.5">
              <ListFilter className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Sort Guests By
            </Label>
            <Select value={settings.sortBy} onValueChange={value => onSettingsChange({
              sortBy: value as DietaryChartSettings['sortBy']
            })}>
              <SelectTrigger id="sort-by" className={styles.selectTrigger}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={styles.portalSurface}>
                <SelectItem className={styles.portalItem} value="firstName">First Name</SelectItem>
                <SelectItem className={styles.portalItem} value="lastName">Last Name</SelectItem>
                <SelectItem className={styles.portalItem} value="tableNo">Table Number - Name</SelectItem>
                <SelectItem className={styles.portalItem} value="dietary">Dietary Requirements</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className={styles.divider} />

        {/* Display Options */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="w-[18px] h-[18px] text-[#472c1d]" strokeWidth={1.8} aria-hidden="true" />
            <span className={`${styles.sectionLabel} ${styles.sectionHeading} rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold`}>Display Options</span>
          </div>
          <div className={`${styles.displayRow} flex items-center gap-1`}>
            <Label htmlFor="show-guest-names" className="flex flex-1 items-center gap-[7px]"><UserRound className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Show Guest Names</Label>
            <ColorSwatches name="guest names" selected={settings.guestNameColor} onChange={guestNameColor => onSettingsChange({ guestNameColor })} />
            <Switch id="show-guest-names" checked={settings.showGuestNames} onCheckedChange={showGuestNames => onSettingsChange({ showGuestNames })} />
          </div>
          <div className={`${styles.displayRow} flex items-center gap-1`}>
            <Label htmlFor="show-seat-numbers" className="flex flex-1 items-center gap-[7px]"><Armchair className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Show Seat Numbers</Label>
            <ColorSwatches name="seat numbers" selected={settings.seatNumberColor} onChange={seatNumberColor => onSettingsChange({ seatNumberColor })} />
            <Switch id="show-seat-numbers" checked={settings.showSeatNumbers} onCheckedChange={showSeatNumbers => onSettingsChange({ showSeatNumbers })} />
          </div>
          <div className={`${styles.displayRow} flex items-center gap-1`}>
            <Label htmlFor="show-guest-list" className="flex flex-1 items-center gap-[7px]"><ListOrdered className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Show Guest List</Label>
            <ColorSwatches name="guest list" selected={settings.guestListColor} onChange={guestListColor => onSettingsChange({ guestListColor })} />
            <Switch id="show-guest-list" checked={settings.showGuestList} onCheckedChange={showGuestList => onSettingsChange({ showGuestList })} />
          </div>
          <div className={`${styles.displayRow} flex items-center gap-1`}>
            <Label htmlFor="show-dietary" className="flex flex-1 items-center gap-[7px]"><UtensilsCrossed className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Show Dietary Requirements</Label>
            <ColorSwatches name="dietary requirements" selected={settings.dietaryColor} onChange={dietaryColor => onSettingsChange({ dietaryColor })} />
            <Switch id="show-dietary" checked={settings.showDietary} onCheckedChange={showDietary => onSettingsChange({ showDietary })} />
          </div>
          <div className={`${styles.displayRow} flex items-center gap-1`}>
            <Label htmlFor="show-relation" className="flex flex-1 items-center gap-[7px]"><HeartHandshake className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Show Relationship</Label>
            <ColorSwatches name="relationships" selected={settings.relationshipColor} onChange={relationshipColor => onSettingsChange({ relationshipColor })} />
            <Switch id="show-relation" checked={settings.showRelation} onCheckedChange={showRelation => onSettingsChange({ showRelation })} />
          </div>
        </div>

        <Separator className={styles.divider} />

        {/* Typography */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Type className="w-[18px] h-[18px] text-[#472c1d]" strokeWidth={1.8} aria-hidden="true" />
            <span className={`${styles.sectionLabel} ${styles.sectionHeading} rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold`}>Typography</span>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-[7px]">
              <CaseSensitive className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Guest Text Size
            </Label>
            <Select
              value={settings.fontSize}
              onValueChange={(value: DietaryChartSettings['fontSize']) => onSettingsChange({ fontSize: value })}
            >
              <SelectTrigger className={`${styles.selectTrigger} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={styles.portalSurface}>
                <SelectItem value="small">Small — 8 pt</SelectItem>
                <SelectItem value="standard">Standard — 10 pt</SelectItem>
                <SelectItem value="large">Large — 12 pt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-[#472c1d] inline-flex items-center gap-1.5">
              <CaseSensitive className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Text Style
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={`${styles.control} w-full justify-between mt-1`}
                >
                  <span className="text-sm">{getTextStyleLabel()}</span>
                  <ChevronDown className="w-4 h-4 ml-2 opacity-50" strokeWidth={1.8} aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className={`${styles.portalSurface} w-[var(--radix-dropdown-menu-trigger-width)]`}>
                <DropdownMenuItem
                  className={`${styles.portalItem} flex items-center justify-between cursor-pointer`}
                  onClick={() => onSettingsChange({ isBold: !settings.isBold })}
                >
                  <div className="flex items-center gap-2">
                    <Bold className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                    <span>Bold</span>
                  </div>
                  {settings.isBold && <Check className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`${styles.portalItem} flex items-center justify-between cursor-pointer`}
                  onClick={() => onSettingsChange({ isItalic: !settings.isItalic })}
                >
                  <div className="flex items-center gap-2">
                    <Italic className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                    <span>Italic</span>
                  </div>
                  {settings.isItalic && <Check className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`${styles.portalItem} flex items-center justify-between cursor-pointer`}
                  onClick={() => onSettingsChange({ isUnderline: !settings.isUnderline })}
                >
                  <div className="flex items-center gap-2">
                    <Underline className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                    <span>Underline</span>
                  </div>
                  {settings.isUnderline && <Check className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};
