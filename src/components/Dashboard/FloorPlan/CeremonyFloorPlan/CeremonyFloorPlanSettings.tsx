/**
 * ⚠️ WARNING: PRODUCTION LOCKED - DO NOT MODIFY ⚠️
 * 
 * This file is part of the Ceremony Floor Plan feature which has been
 * finalized and locked for production use as of 2025-12-21.
 * 
 * ANY MODIFICATIONS require explicit written approval from the project owner.
 * 
 * See CEREMONY_FLOOR_PLAN_SPECS.md for complete technical specifications.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlidersHorizontal, HeartHandshake, ArrowLeftRight, Heart, UserRound, UsersRound, Tags, AlignLeft, AlignRight, Eye, Rows3, Armchair, Columns3 } from 'lucide-react';
import { CeremonyFloorPlan } from '@/hooks/useCeremonyFloorPlan';

interface CeremonyFloorPlanSettingsProps {
  floorPlan: CeremonyFloorPlan;
  onUpdate: (updates: Partial<CeremonyFloorPlan>) => Promise<boolean>;
}

export const CeremonyFloorPlanSettings = ({
  floorPlan,
  onUpdate,
}: CeremonyFloorPlanSettingsProps) => {
  const handleChange = (key: keyof CeremonyFloorPlan, value: number | string | boolean) => {
    // When couple arrangement changes, swap the person names
    if (key === 'couple_side_arrangement' && value !== floorPlan.couple_side_arrangement) {
      onUpdate({ 
        couple_side_arrangement: value as 'groom_left' | 'bride_left',
        person_left_name: floorPlan.person_right_name,
        person_right_name: floorPlan.person_left_name,
      });
      return;
    }
    onUpdate({ [key]: value });
  };

  return (
    <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
          <SlidersHorizontal className="w-[22px] h-[22px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          Layout Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Couple Side Arrangement */}
        <div className="space-y-4">
          <span className="text-sm font-medium px-3 py-1 rounded-full border border-primary text-primary inline-flex items-center gap-2"><HeartHandshake className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />Couple Arrangement</span>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><ArrowLeftRight className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Which side is the Groom on?</Label>
            <Select
              value={floorPlan.couple_side_arrangement}
              onValueChange={(value) => handleChange('couple_side_arrangement', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="groom_left">Groom on Left, Bride on Right</SelectItem>
                <SelectItem value="bride_left">Bride on Left, Groom on Right</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">This affects where groomsmen/bridesmaids stand</p>
          </div>
        </div>

        {/* Couple Names Section */}
        <div className="space-y-4 pt-2 border-t border-border">
          <span className="text-sm font-medium px-3 py-1 rounded-full border border-primary text-primary inline-flex items-center gap-2"><Heart className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />Couple Names</span>
          <p className="text-xs text-muted-foreground">These names appear beside the celebrant at the altar</p>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <UserRound className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              {floorPlan.couple_side_arrangement === 'groom_left' ? 'Left (Groom)' : 'Left (Bride)'}
            </Label>
            <Input
              value={floorPlan.person_left_name}
              onChange={(e) => handleChange('person_left_name', e.target.value)}
              placeholder={floorPlan.couple_side_arrangement === 'groom_left' ? 'e.g., John or Groom' : 'e.g., Jane or Bride'}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <UserRound className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              {floorPlan.couple_side_arrangement === 'groom_left' ? 'Right (Bride)' : 'Right (Groom)'}
            </Label>
            <Input
              value={floorPlan.person_right_name}
              onChange={(e) => handleChange('person_right_name', e.target.value)}
              placeholder={floorPlan.couple_side_arrangement === 'groom_left' ? 'e.g., Jane or Bride' : 'e.g., John or Groom'}
              className="text-sm"
            />
          </div>
        </div>

        {/* Bridal Party Section */}
        <div className="space-y-4 pt-2 border-t border-border">
          <span className="text-sm font-medium px-3 py-1 rounded-full border border-primary text-primary inline-flex items-center gap-2"><UsersRound className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />Bridal Party (Altar Area)</span>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm inline-flex items-center gap-1.5">
                <UserRound className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                {floorPlan.couple_side_arrangement === 'groom_left' ? 'Groomsmen' : 'Bridesmaids'} Count (Left)
              </Label>
              <span className="text-sm font-medium text-primary">{Math.min(10, floorPlan.bridal_party_count_left)}</span>
            </div>
            <Slider
              value={[Math.min(10, floorPlan.bridal_party_count_left)]}
              onValueChange={([value]) => handleChange('bridal_party_count_left', Math.min(10, value))}
              min={0}
              max={10}
              step={1}
              className="w-full floor-plan-smooth-slider"
            />
            <p className="text-xs text-muted-foreground">Left side of altar (0-10)</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm inline-flex items-center gap-1.5">
                <UserRound className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                {floorPlan.couple_side_arrangement === 'groom_left' ? 'Bridesmaids' : 'Groomsmen'} Count (Right)
              </Label>
              <span className="text-sm font-medium text-primary">{Math.min(10, floorPlan.bridal_party_count_right)}</span>
            </div>
            <Slider
              value={[Math.min(10, floorPlan.bridal_party_count_right)]}
              onValueChange={([value]) => handleChange('bridal_party_count_right', Math.min(10, value))}
              min={0}
              max={10}
              step={1}
              className="w-full floor-plan-smooth-slider"
            />
            <p className="text-xs text-muted-foreground">Right side of altar (0-10)</p>
          </div>
        </div>

        {/* Side Labels */}
        <div className="space-y-4 pt-2 border-t border-border">
          <span className="text-sm font-medium px-3 py-1 rounded-full border border-primary text-primary inline-flex items-center gap-2"><Tags className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />Labels</span>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><AlignLeft className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Left Side</Label>
            <Input
              value={floorPlan.left_side_label}
              onChange={(e) => handleChange('left_side_label', e.target.value)}
              placeholder="e.g., Groom's Family"
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><AlignRight className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Right Side</Label>
            <Input
              value={floorPlan.right_side_label}
              onChange={(e) => handleChange('right_side_label', e.target.value)}
              placeholder="e.g., Bride's Family"
              className="text-sm"
            />
          </div>

        </div>

        {/* Display Options */}
        <div className="space-y-4 pt-2 border-t border-border">
          <span className="text-sm font-medium px-3 py-1 rounded-full border border-primary text-primary inline-flex items-center gap-2"><Eye className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />Display Options</span>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm inline-flex items-center gap-1.5"><Rows3 className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Show Row Numbers</Label>
            <Switch
              className="data-[state=unchecked]:border data-[state=unchecked]:border-[#7C5C3E]"
              checked={floorPlan.show_row_numbers}
              onCheckedChange={(checked) => handleChange('show_row_numbers', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm inline-flex items-center gap-1.5"><Armchair className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Show Seat Numbers</Label>
            <Switch
              className="data-[state=unchecked]:border data-[state=unchecked]:border-[#7C5C3E]"
              checked={floorPlan.show_seat_numbers}
              onCheckedChange={(checked) => handleChange('show_seat_numbers', checked)}
            />
          </div>
        </div>

        {/* Chairs Per Row */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium px-3 py-1 rounded-full border border-primary text-primary inline-flex items-center gap-2"><Columns3 className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Chairs Per Row</span>
            <span className="text-sm font-medium text-primary">{floorPlan.chairs_per_row}</span>
          </div>
          <Slider
            value={[floorPlan.chairs_per_row]}
            onValueChange={([value]) => handleChange('chairs_per_row', value)}
            min={1}
            max={6}
            step={1}
            className="w-full floor-plan-smooth-slider"
          />
          <p className="text-xs text-muted-foreground">1-6 chairs on each side</p>
        </div>

        {/* Total Rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium px-3 py-1 rounded-full border border-primary text-primary inline-flex items-center gap-2"><Rows3 className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Total Rows</span>
            <span className="text-sm font-medium text-primary">{floorPlan.total_rows}</span>
          </div>
          <Slider
            value={[Math.min(12, floorPlan.total_rows)]}
            onValueChange={([value]) => handleChange('total_rows', Math.min(12, value))}
            min={1}
            max={12}
            step={1}
            className="w-full floor-plan-smooth-slider"
          />
          <p className="text-xs text-muted-foreground">1-12 rows total</p>
        </div>

        {/* Assigned Rows (for family) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium px-3 py-1 rounded-full border border-primary text-primary inline-flex items-center gap-2"><UsersRound className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Family Rows (Assigned)</span>
            <span className="text-sm font-medium text-primary">{floorPlan.assigned_rows}</span>
          </div>
          <Slider
            value={[floorPlan.assigned_rows]}
            onValueChange={([value]) => handleChange('assigned_rows', Math.min(value, Math.min(12, floorPlan.total_rows)))}
            min={1}
            max={Math.min(floorPlan.total_rows, 12)}
            step={1}
            className="w-full floor-plan-smooth-slider"
          />
          <p className="text-xs text-muted-foreground">First rows for family assignment</p>
        </div>
      </CardContent>
    </Card>
  );
};
