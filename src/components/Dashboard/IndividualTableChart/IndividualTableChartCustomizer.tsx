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
import { Settings, Type, Bold, Italic, Underline, ChevronDown, Check } from 'lucide-react';
import { IndividualChartSettings } from './IndividualTableSeatingChartPage';

interface IndividualTableChartCustomizerProps {
  settings: IndividualChartSettings;
  onSettingsChange: (settings: Partial<IndividualChartSettings>) => void;
}

export const IndividualTableChartCustomizer: React.FC<IndividualTableChartCustomizerProps> = ({
  settings,
  onSettingsChange,
}) => {
  return (
    <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] bg-white mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-medium text-foreground">
          <Settings className="w-5 h-5 text-foreground" />
          Chart Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Table Settings */}
        <div className="space-y-4">
          <div className="mt-2">
            <h3 className="font-semibold text-sm">Table Settings</h3>
            <p className="text-xs text-muted-foreground mt-1">Customise how each table with who is on each table and other info.</p>
          </div>
          
          <div className="space-y-2">
            <span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Table Shape</span>
            <Select
              value={settings.tableShape}
              onValueChange={(value: 'round' | 'square' | 'long') => 
                onSettingsChange({ tableShape: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round">Round</SelectItem>
                <SelectItem value="square">Square</SelectItem>
                <SelectItem value="long">Long Table</SelectItem>
              </SelectContent>
            </Select>
            {settings.tableShape === 'round' && (
              <p className="text-xs text-red-600 font-medium mt-2">
                ⚠️ Maximum: 20 guests per ROUND TABLE
              </p>
            )}
            {settings.tableShape === 'square' && (
              <p className="text-xs text-red-600 font-medium mt-2">
                ⚠️ Maximum: 20 guests per SQUARE TABLE
              </p>
            )}
            {settings.tableShape === 'long' && (
              <>
                <p className="text-xs text-red-600 font-medium mt-2">
                  ⚠️ Maximum: 42 guests per LONG TABLE
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Long tables use auto-scaling fonts. (20 per side + 1 at each end)
                </p>
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* Display Options */}
        <div className="space-y-4">
          <span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Display Options</span>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="show-names">Show Guest Names</Label>
            <Switch
              id="show-names"
              checked={settings.includeNames}
              onCheckedChange={(checked) => 
                onSettingsChange({ includeNames: checked })
              }
              className="data-[state=unchecked]:bg-destructive"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-seat-numbers">Show Seat Numbers</Label>
            <Switch
              id="show-seat-numbers"
              checked={settings.showSeatNumbers}
              onCheckedChange={(checked) => 
                onSettingsChange({ showSeatNumbers: checked })
              }
              className="data-[state=unchecked]:bg-destructive"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-guest-list">Show Guest List</Label>
            <Switch
              id="show-guest-list"
              checked={settings.includeGuestList}
              onCheckedChange={(checked) => 
                onSettingsChange({ includeGuestList: checked })
              }
              className="data-[state=unchecked]:bg-destructive"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-dietary">Show Dietary Info</Label>
            <Switch
              id="show-dietary"
              checked={settings.includeDietary}
              onCheckedChange={(checked) => 
                onSettingsChange({ includeDietary: checked })
              }
              className="data-[state=unchecked]:bg-destructive"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-relation">Show Relationship</Label>
            <Switch
              id="show-relation"
              checked={settings.includeRelation}
              onCheckedChange={(checked) => 
                onSettingsChange({ includeRelation: checked })
              }
              className="data-[state=unchecked]:bg-destructive"
            />
          </div>

        </div>

        <Separator />

        {/* Typography - Hidden for Long Table (auto-scaling) */}
        {settings.tableShape !== 'long' && (
          <div className="space-y-4">
           <span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center gap-2 text-sm font-semibold">
              <Type className="w-4 h-4" />
              Typography
            </span>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Text Style</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between border-primary focus:ring-primary mt-1"
                  >
                    <span className="text-sm">{(() => {
                      const active: string[] = [];
                      if (settings.isBold) active.push('Bold');
                      if (settings.isItalic) active.push('Italic');
                      if (settings.isUnderline) active.push('Underline');
                      return active.length > 0 ? active.join(', ') : 'None';
                    })()}</span>
                    <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] bg-popover border-border z-50">
                  <DropdownMenuItem 
                    className="flex items-center justify-between cursor-pointer hover:bg-primary/10 hover:text-primary text-foreground"
                    onClick={() => onSettingsChange({ isBold: !settings.isBold })}
                  >
                    <div className="flex items-center gap-2">
                      <Bold className="w-4 h-4" />
                      <span>Bold</span>
                    </div>
                    {settings.isBold && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center justify-between cursor-pointer hover:bg-primary/10 hover:text-primary text-foreground"
                    onClick={() => onSettingsChange({ isItalic: !settings.isItalic })}
                  >
                    <div className="flex items-center gap-2">
                      <Italic className="w-4 h-4" />
                      <span>Italic</span>
                    </div>
                    {settings.isItalic && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center justify-between cursor-pointer hover:bg-primary/10 hover:text-primary text-foreground"
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
        )}
        
        {settings.tableShape === 'long' && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">End Seats</h3>
              
              {/* Master Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-end-seats">Add Top/Bottom Seats</Label>
                <Switch
                  id="enable-end-seats"
                  checked={settings.enableEndSeats}
                  onCheckedChange={(checked) => 
                    onSettingsChange({ enableEndSeats: checked })
                  }
                  className="data-[state=unchecked]:bg-destructive"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Add seats at the top and bottom ends of the long table for special guests.
              </p>
            </div>

            <Separator />
            
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Long Table Info</h3>
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
      </CardContent>
    </Card>
  );
};
