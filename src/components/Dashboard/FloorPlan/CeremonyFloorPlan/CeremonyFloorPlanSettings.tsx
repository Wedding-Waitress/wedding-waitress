import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { CeremonyFloorPlan } from '@/hooks/useCeremonyFloorPlan';

interface CeremonyFloorPlanSettingsProps {
  floorPlan: CeremonyFloorPlan;
  onUpdate: (updates: Partial<CeremonyFloorPlan>) => Promise<boolean>;
}

export const CeremonyFloorPlanSettings: React.FC<CeremonyFloorPlanSettingsProps> = ({
  floorPlan,
  onUpdate,
}) => {
  const handleChange = (key: keyof CeremonyFloorPlan, value: number | string | boolean) => {
    onUpdate({ [key]: value });
  };

  return (
    <Card className="ww-box">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium text-[#7248e6]">
          Layout Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chairs Per Row */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Chairs Per Row</Label>
            <span className="text-sm font-medium text-primary">{floorPlan.chairs_per_row}</span>
          </div>
          <Slider
            value={[floorPlan.chairs_per_row]}
            onValueChange={([value]) => handleChange('chairs_per_row', value)}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">1-10 chairs on each side</p>
        </div>

        {/* Total Rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Total Rows</Label>
            <span className="text-sm font-medium text-primary">{floorPlan.total_rows}</span>
          </div>
          <Slider
            value={[floorPlan.total_rows]}
            onValueChange={([value]) => handleChange('total_rows', value)}
            min={1}
            max={20}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">1-20 rows total</p>
        </div>

        {/* Assigned Rows (for family) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Family Rows (Assigned)</Label>
            <span className="text-sm font-medium text-primary">{floorPlan.assigned_rows}</span>
          </div>
          <Slider
            value={[floorPlan.assigned_rows]}
            onValueChange={([value]) => handleChange('assigned_rows', Math.min(value, floorPlan.total_rows))}
            min={1}
            max={Math.min(floorPlan.total_rows, 10)}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">First rows for family assignment</p>
        </div>

        {/* Side Labels */}
        <div className="space-y-4 pt-2 border-t border-border">
          <h4 className="text-sm font-medium">Labels</h4>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Left Side</Label>
            <Input
              value={floorPlan.left_side_label}
              onChange={(e) => handleChange('left_side_label', e.target.value)}
              placeholder="e.g., Groom's Family"
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Right Side</Label>
            <Input
              value={floorPlan.right_side_label}
              onChange={(e) => handleChange('right_side_label', e.target.value)}
              placeholder="e.g., Bride's Family"
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Altar</Label>
            <Input
              value={floorPlan.altar_label}
              onChange={(e) => handleChange('altar_label', e.target.value)}
              placeholder="e.g., Altar"
              className="text-sm"
            />
          </div>
        </div>

        {/* Display Options */}
        <div className="space-y-4 pt-2 border-t border-border">
          <h4 className="text-sm font-medium">Display Options</h4>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm">Show Row Numbers</Label>
            <Switch
              checked={floorPlan.show_row_numbers}
              onCheckedChange={(checked) => handleChange('show_row_numbers', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Show Seat Numbers</Label>
            <Switch
              checked={floorPlan.show_seat_numbers}
              onCheckedChange={(checked) => handleChange('show_seat_numbers', checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
