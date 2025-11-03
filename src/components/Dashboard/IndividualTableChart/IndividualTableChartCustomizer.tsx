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
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Settings } from 'lucide-react';
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
    <Card className="ww-box bg-white mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-normal bg-gradient-to-r from-[#7C3AED] to-[#9333EA] bg-clip-text text-transparent">
          <Settings className="w-5 h-5 text-purple-600" />
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
            <Label htmlFor="table-shape">Table Shape</Label>
            <Select
              value={settings.tableShape}
              onValueChange={(value: 'round' | 'square') => 
                onSettingsChange({ tableShape: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round">Round</SelectItem>
                <SelectItem value="square">Square</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Display Options */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Display Options</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="show-names">Show Guest Names</Label>
            <Switch
              id="show-names"
              checked={settings.includeNames}
              onCheckedChange={(checked) => 
                onSettingsChange({ includeNames: checked })
              }
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
            />
          </div>

        </div>

        <Separator />

        {/* Text Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Text Settings</h3>
          
          <div className="space-y-2">
            <Label htmlFor="font-size">Font Size</Label>
            <Select
              value={settings.fontSize}
              onValueChange={(value: 'small' | 'medium' | 'large') => 
                onSettingsChange({ fontSize: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};