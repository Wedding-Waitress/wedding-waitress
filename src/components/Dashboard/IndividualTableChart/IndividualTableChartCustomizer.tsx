/**
 * ⚠️ PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL ⚠️
 * 
 * This Individual Table Charts feature is COMPLETE and LOCKED.
 * All functionality has been thoroughly tested and approved.
 * 
 * DO NOT make changes unless explicitly requested by the project owner.
 * Any modifications could break the carefully calibrated A4 export system,
 * seat positioning algorithms, and multi-table PDF generation.
 * 
 * Last completed: 2025-10-04
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Settings2,
  Type,
  Bold,
  Italic,
  Underline,
  ChevronDown,
  Check,
  TableProperties,
  Shapes,
  TriangleAlert,
  Eye,
  UserRound,
  Armchair,
  ListOrdered,
  UtensilsCrossed,
  HeartHandshake,
  CaseSensitive,
} from 'lucide-react';
import { IndividualChartSettings } from './IndividualTableSeatingChartPage';
import { DIETARY_ACCENT_COLORS } from '@/lib/dietaryChartSettings';
import type { DietaryAccentColor } from '@/lib/dietaryChartSettings';
import styles from './IndividualTableChartPage.module.css';

interface IndividualTableChartCustomizerProps {
  settings: IndividualChartSettings;
  onSettingsChange: (settings: Partial<IndividualChartSettings>) => void;
}

export type AccentColor = DietaryAccentColor;
export const toggleAccentColor = (_selected: AccentColor | null | undefined, clicked: AccentColor) => clicked;
const COLOR_LABELS: Record<AccentColor, string> = {
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
  selected: AccentColor;
  onChange: (color: AccentColor) => void;
}) => (
  <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label={`${name} colour`}>
    {DIETARY_ACCENT_COLORS.map(value => {
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
          className={`${styles.colorSwatch} h-4 w-4 rounded-full border border-black/30 transition-shadow ${isSelected ? 'ring-2 ring-offset-1 ring-foreground' : 'hover:ring-1 hover:ring-foreground/60'}`}
          style={{ backgroundColor: value }}
        />
      );
    })}
  </div>
);

export const IndividualTableChartCustomizer: React.FC<IndividualTableChartCustomizerProps> = ({
  settings,
  onSettingsChange,
}) => {
  return (
    <Card className={styles.settingsPanel}>
      <CardHeader>
        <CardTitle className={`${styles.majorHeading} flex items-center gap-2 text-2xl font-bold text-foreground`}>
          <Settings2 className="w-[22px] h-[22px] text-foreground shrink-0" strokeWidth={1.8} aria-hidden="true" />
          Chart Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Table Settings */}
        <div className="space-y-4">
          <div className="mt-2">
            <h3 className={`${styles.sectionHeading} font-semibold text-sm flex items-center gap-2`}>
              <TableProperties className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Table Settings
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Customise how each table with who is on each table and other info.</p>
          </div>
          
          <div className="space-y-2">
            <span className={`${styles.sectionLabel} ${styles.sectionHeading} rounded-full px-3 py-0.5 inline-flex items-center gap-1.5 text-sm font-semibold`}>
              <Shapes className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Table Shape
            </span>
            <Select
              value={settings.tableShape}
              onValueChange={(value: 'round' | 'square' | 'long') => 
                onSettingsChange({ tableShape: value })
              }
            >
              <SelectTrigger className={styles.control}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={styles.portalSurface}>
                <SelectItem value="round">Round</SelectItem>
                <SelectItem value="square">Square</SelectItem>
                <SelectItem value="long">Long Table</SelectItem>
              </SelectContent>
            </Select>
            {settings.tableShape === 'round' && (
              <p className={`${styles.warningRow} text-xs text-red-600 font-medium mt-2 flex items-center gap-1.5`}>
                <TriangleAlert className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                Maximum: 20 guests per ROUND TABLE
              </p>
            )}
            {settings.tableShape === 'square' && (
              <p className={`${styles.warningRow} text-xs text-red-600 font-medium mt-2 flex items-center gap-1.5`}>
                <TriangleAlert className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                Maximum: 20 guests per SQUARE TABLE
              </p>
            )}
            {settings.tableShape === 'long' && (
              <>
                <p className={`${styles.warningRow} text-xs text-red-600 font-medium mt-2 flex items-center gap-1.5`}>
                  <TriangleAlert className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  Maximum: 42 guests per LONG TABLE
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Long tables use auto-scaling fonts. (20 per side + 1 at each end)
                </p>
              </>
            )}
          </div>

          {settings.tableShape === 'long' && (
            <>
              <div className="space-y-4">
                <h3 className={`${styles.sectionHeading} font-semibold text-sm`}>End Seats</h3>
                <div className="flex items-center justify-between">
                  <Label htmlFor="enable-end-seats">Add Top/Bottom Seats</Label>
                  <Switch
                    id="enable-end-seats"
                    checked={settings.enableEndSeats}
                    onCheckedChange={(checked) => onSettingsChange({ enableEndSeats: checked })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Add seats at the top and bottom ends of the long table for special guests.
                </p>
              </div>
              <Separator className={styles.divider} />
              <div className={`${styles.longInfoPanel} space-y-4`}>
                <h3 className={`${styles.sectionHeading} font-semibold text-sm`}>Long Table Info</h3>
                <p className="text-xs text-muted-foreground">
                  Font sizes automatically scale based on guest count to ensure all content fits on one A4 page.
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• 20-30 guests: Normal font</p>
                  <p>• 31-42 guests: Smaller font</p>
                </div>
              </div>
            </>
          )}
        </div>


        <Separator className={styles.divider} />

        {/* Display Options */}
        <div className="space-y-4">
          <span className={`${styles.sectionLabel} ${styles.sectionHeading} rounded-full px-3 py-0.5 inline-flex items-center gap-1.5 text-sm font-semibold`}>
            <Eye className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
            Display Options
          </span>
          
          <div className={`${styles.displayRow} flex items-center gap-1`}>
            <Label htmlFor="show-names" className="flex flex-1 items-center gap-[7px]">
              <UserRound className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Show Guest Names
            </Label>
            <ColorSwatches name="guest names" selected={settings.guestNameColor} onChange={(guestNameColor) => onSettingsChange({ guestNameColor })} />
            <Switch
              id="show-names"
              checked={settings.includeNames}
              onCheckedChange={(checked) => 
                onSettingsChange({ includeNames: checked })
              }
            />
          </div>

          <div className={`${styles.displayRow} flex items-center gap-1`}>
            <Label htmlFor="show-seat-numbers" className="flex flex-1 items-center gap-[7px]">
              <Armchair className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Show Seat Numbers
            </Label>
            <ColorSwatches name="seat numbers" selected={settings.seatNumberColor} onChange={(seatNumberColor) => onSettingsChange({ seatNumberColor })} />
            <Switch
              id="show-seat-numbers"
              checked={settings.showSeatNumbers}
              onCheckedChange={(checked) => 
                onSettingsChange({ showSeatNumbers: checked })
              }
            />
          </div>

          <div className={`${styles.displayRow} flex items-center gap-1`}>
            <Label htmlFor="show-guest-list" className="flex flex-1 items-center gap-[7px]">
              <ListOrdered className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Show Guest List
            </Label>
            <ColorSwatches name="guest list" selected={settings.guestListColor} onChange={(guestListColor) => onSettingsChange({ guestListColor })} />
            <Switch
              id="show-guest-list"
              checked={settings.includeGuestList}
              onCheckedChange={(checked) => 
                onSettingsChange({ includeGuestList: checked })
              }
            />
          </div>

          <div className={`${styles.displayRow} flex items-center gap-1`}>
            <Label htmlFor="show-dietary" className="flex flex-1 items-center gap-[7px]">
              <UtensilsCrossed className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Show Dietary Requirements
            </Label>
            <ColorSwatches
              name="dietary requirements"
              selected={settings.dietaryColor}
              onChange={(dietaryColor) => onSettingsChange({ dietaryColor })}
            />
            <Switch
              id="show-dietary"
              checked={settings.includeDietary}
              onCheckedChange={(checked) => 
                onSettingsChange({ includeDietary: checked })
              }
            />
          </div>

          <div className={`${styles.displayRow} flex items-center gap-1`}>
            <Label htmlFor="show-relation" className="flex flex-1 items-center gap-[7px]">
              <HeartHandshake className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Show Relationship
            </Label>
            <ColorSwatches
              name="relationships"
              selected={settings.relationshipColor}
              onChange={(relationshipColor) => onSettingsChange({ relationshipColor })}
            />
            <Switch
              id="show-relation"
              checked={settings.includeRelation}
              onCheckedChange={(checked) => 
                onSettingsChange({ includeRelation: checked })
              }
            />
          </div>


        </div>

        <Separator className={styles.divider} />

        {/* Typography */}
        {
          <div className="space-y-4">
           <span className={`${styles.sectionLabel} ${styles.sectionHeading} rounded-full px-3 py-0.5 inline-flex items-center gap-2 text-sm font-semibold`}>
              <Type className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Typography
            </span>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-[7px]">
                <CaseSensitive className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                Guest Text Size
              </Label>
              <Select
                value={settings.guestTextSize || 'standard'}
                onValueChange={(value: 'small' | 'standard' | 'large') => onSettingsChange({ guestTextSize: value })}
              >
                <SelectTrigger className={`${styles.control} w-full`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={styles.portalSurface}>
                  <SelectItem value="small">Small — 8 pt</SelectItem>
                  <SelectItem value="standard">Standard — 10 pt</SelectItem>
                  <SelectItem value="large">Large — 12 pt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-[7px]">
                <CaseSensitive className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                Text Style
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={`${styles.control} w-full justify-between mt-1`}
                  >
                    <span className="text-sm">{(() => {
                      const active: string[] = [];
                      if (settings.isBold) active.push('Bold');
                      if (settings.isItalic) active.push('Italic');
                      if (settings.isUnderline) active.push('Underline');
                      return active.length > 0 ? active.join(', ') : 'Select styles';
                    })()}</span>
                    <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className={`${styles.portalSurface} w-[var(--radix-dropdown-menu-trigger-width)]`}>
                  <DropdownMenuItem 
                    className={`${styles.portalItem} flex items-center justify-between cursor-pointer`}
                    onClick={() => onSettingsChange({ isBold: !settings.isBold })}
                  >
                    <div className="flex items-center gap-2">
                      <Bold className="w-4 h-4" />
                      <span>Bold</span>
                    </div>
                    {settings.isBold && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={`${styles.portalItem} flex items-center justify-between cursor-pointer`}
                    onClick={() => onSettingsChange({ isItalic: !settings.isItalic })}
                  >
                    <div className="flex items-center gap-2">
                      <Italic className="w-4 h-4" />
                      <span>Italic</span>
                    </div>
                    {settings.isItalic && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={`${styles.portalItem} flex items-center justify-between cursor-pointer`}
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
        }
        
      </CardContent>
    </Card>
  );
};
