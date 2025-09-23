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
    <Card className="ww-box">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Customize Chart
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Table Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Table Settings</h3>
          
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

          <div className="space-y-2">
            <Label htmlFor="paper-size">Paper Size</Label>
            <Select
              value={settings.paperSize}
              onValueChange={(value: 'A4' | 'A3') => 
                onSettingsChange({ paperSize: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4</SelectItem>
                <SelectItem value="A3">A3</SelectItem>
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

          <div className="flex items-center justify-between">
            <Label htmlFor="show-logo">Show Logo</Label>
            <Switch
              id="show-logo"
              checked={settings.showLogo}
              onCheckedChange={(checked) => 
                onSettingsChange({ showLogo: checked })
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

          <div className="space-y-2">
            <Label htmlFor="custom-title">Custom Title</Label>
            <Input
              id="custom-title"
              value={settings.title}
              onChange={(e) => onSettingsChange({ title: e.target.value })}
              placeholder="TABLE 1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};