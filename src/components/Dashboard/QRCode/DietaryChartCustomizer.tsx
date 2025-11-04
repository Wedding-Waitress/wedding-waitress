import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, ArrowUpDown, FileText, Type } from 'lucide-react';
import { DietaryChartSettings } from '@/hooks/useDietaryChartSettings';
interface DietaryChartCustomizerProps {
  settings: DietaryChartSettings;
  onSettingsChange: (settings: Partial<DietaryChartSettings>) => void;
}
export const DietaryChartCustomizer: React.FC<DietaryChartCustomizerProps> = ({
  settings,
  onSettingsChange
}) => {
  return <Card className="mt-12 sticky top-30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle className="text-2xl font-medium text-[#7248e6]">Chart Settings</CardTitle>
        </div>
        <CardDescription>Customise how your dietary requirements chart is displayed and exported</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sort Order */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            <Label className="font-semibold">Sort Order</Label>
          </div>
          <Select value={settings.sortBy} onValueChange={value => onSettingsChange({
          sortBy: value as DietaryChartSettings['sortBy']
        })}>
            <SelectTrigger className="border-primary focus:ring-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <SelectItem value="firstName">First Name</SelectItem>
              <SelectItem value="lastName">Last Name</SelectItem>
              <SelectItem value="tableNo">Table Number</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Display Options */}
        <div className="space-y-3">
          <Label className="font-semibold">Display Options</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-mobile" className="text-sm">Show Mobile</Label>
              <Switch id="show-mobile" checked={settings.showMobile} onCheckedChange={checked => onSettingsChange({
              showMobile: checked
            })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-relation" className="text-sm">Show Relationship</Label>
              <Switch id="show-relation" checked={settings.showRelation} onCheckedChange={checked => onSettingsChange({
              showRelation: checked
            })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-seat-no" className="text-sm">Show Seat Number</Label>
              <Switch id="show-seat-no" checked={settings.showSeatNo} onCheckedChange={checked => onSettingsChange({
              showSeatNo: checked
            })} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Typography */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            <Label className="font-semibold">Typography</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="font-size" className="text-sm">Font Size</Label>
            <Select value={settings.fontSize} onValueChange={value => onSettingsChange({
            fontSize: value as DietaryChartSettings['fontSize']
          })}>
              <SelectTrigger id="font-size" className="border-primary focus:ring-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="small">Small (14px)</SelectItem>
                <SelectItem value="medium">Medium (16px)</SelectItem>
                <SelectItem value="large">Large (18px)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

      </CardContent>
    </Card>;
};