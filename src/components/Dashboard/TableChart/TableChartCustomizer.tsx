import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ChartSettings } from './TableSeatingChartPage';
import { TableWithGuestCount } from '@/hooks/useTables';
import { Guest } from '@/hooks/useGuests';
import { 
  Layout, 
  Palette, 
  Type, 
  FileText,
  Settings
} from 'lucide-react';

interface TableChartCustomizerProps {
  settings: ChartSettings;
  onSettingsChange: (settings: Partial<ChartSettings>) => void;
  tables: TableWithGuestCount[];
  guests: Guest[];
}

export const TableChartCustomizer: React.FC<TableChartCustomizerProps> = ({
  settings,
  onSettingsChange,
  tables,
  guests
}) => {
  return (
    <Card className="ww-box h-fit sticky top-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Chart Settings</CardTitle>
        </div>
        <CardDescription>
          Customize your seating chart layout and appearance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Layout Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layout className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Layout</Label>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="table-shape" className="text-xs text-muted-foreground">
                Table Shape
              </Label>
              <Select
                value={settings.tableShape}
                onValueChange={(value: 'round' | 'square') => 
                  onSettingsChange({ tableShape: value })
                }
              >
                <SelectTrigger id="table-shape">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round">Round Tables</SelectItem>
                  <SelectItem value="square">Square Tables</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Color Coding */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Color Coding</Label>
          </div>
          
          <Select
            value={settings.colorCoding}
            onValueChange={(value: 'rsvp' | 'dietary' | 'capacity' | 'none') => 
              onSettingsChange({ colorCoding: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rsvp">RSVP Status</SelectItem>
              <SelectItem value="dietary">Dietary Requirements</SelectItem>
              <SelectItem value="capacity">Table Capacity</SelectItem>
              <SelectItem value="none">No Color Coding</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Display Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Display Options</Label>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="include-names" className="text-xs text-muted-foreground">
                Include Guest Names
              </Label>
              <Switch
                id="include-names"
                checked={settings.includeNames}
                onCheckedChange={(checked) => onSettingsChange({ includeNames: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="include-dietary" className="text-xs text-muted-foreground">
                Include Dietary Info
              </Label>
              <Switch
                id="include-dietary"
                checked={settings.includeDietary}
                onCheckedChange={(checked) => onSettingsChange({ includeDietary: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="include-rsvp" className="text-xs text-muted-foreground">
                Include RSVP Status
              </Label>
              <Switch
                id="include-rsvp"
                checked={settings.includeRsvp}
                onCheckedChange={(checked) => onSettingsChange({ includeRsvp: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-table-numbers" className="text-xs text-muted-foreground">
                Show Table Numbers
              </Label>
              <Switch
                id="show-table-numbers"
                checked={settings.showTableNumbers}
                onCheckedChange={(checked) => onSettingsChange({ showTableNumbers: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-capacity" className="text-xs text-muted-foreground">
                Show Capacity
              </Label>
              <Switch
                id="show-capacity"
                checked={settings.showCapacity}
                onCheckedChange={(checked) => onSettingsChange({ showCapacity: checked })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Typography */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Typography</Label>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="font-size" className="text-xs text-muted-foreground">
                Font Size
              </Label>
              <Select
                value={settings.fontSize}
                onValueChange={(value: 'small' | 'medium' | 'large') => 
                  onSettingsChange({ fontSize: value })
                }
              >
                <SelectTrigger id="font-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="chart-subtitle" className="text-xs text-muted-foreground">
                Subtitle
              </Label>
              <Input
                id="chart-subtitle"
                value={settings.subtitle}
                onChange={(e) => onSettingsChange({ subtitle: e.target.value })}
                placeholder="Event details"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Export Settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Export Settings</Label>
          
          <div>
            <Label htmlFor="paper-size" className="text-xs text-muted-foreground">
              Paper Size
            </Label>
            <Select
              value={settings.paperSize}
              onValueChange={(value: 'A4' | 'A3' | 'A2' | 'A1') => 
                onSettingsChange({ paperSize: value })
              }
            >
              <SelectTrigger id="paper-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4 (210×297mm)</SelectItem>
                <SelectItem value="A3">A3 (297×420mm)</SelectItem>
                <SelectItem value="A2">A2 (420×594mm)</SelectItem>
                <SelectItem value="A1">A1 (594×841mm)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};