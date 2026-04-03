/**
 * ============================================================================
 * 🔒 PRODUCTION LOCKED - DO NOT MODIFY 🔒
 * ============================================================================
 * 
 * ⚠️ THIS COMPONENT IS LOCKED FOR PRODUCTION USE ⚠️
 * 
 * ANY MODIFICATIONS TO THIS FILE REQUIRE EXPLICIT WRITTEN APPROVAL FROM OWNER
 * Settings structure is tied to database schema and export logic.
 * 
 * Settings panel for Full Seating Chart customization. Provides controls for
 * sorting, display options, typography, and export settings.
 * 
 * AVAILABLE SETTINGS:
 * 
 * Sort Order:
 * - firstName: First name, then last name
 * - lastName: Last name, then first name
 * - tableNo: Table number, then first name
 * 
 * Display Options:
 * - showDietary: Display dietary requirements
 * - showRelation: Display guest relationships
 * 
 * Typography:
 * - small: 14px (10.5pt PDF)
 * - medium: 16px (12pt PDF)
 * - large: 18px (13.5pt PDF)
 * 
 * Export Settings:
 * - paperSize: A4, A3, A2, A1
 * 
 * Last locked: 2025-10-19
 * Status: PRODUCTION READY - NO CHANGES ALLOWED
 * ============================================================================
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { FullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { 
  ArrowUpDown,
  Type,
  FileText,
  Settings
} from 'lucide-react';

interface FullSeatingChartCustomizerProps {
  settings: FullSeatingChartSettings;
  onSettingsChange: (settings: Partial<FullSeatingChartSettings>) => void;
}

export const FullSeatingChartCustomizer: React.FC<FullSeatingChartCustomizerProps> = ({
  settings,
  onSettingsChange,
}) => {
  return (
    <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] h-fit sticky top-0 mt-12 bg-white">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <CardTitle className="text-2xl font-medium text-foreground">Chart Settings</CardTitle>
        </div>
        <CardDescription>
          Customize your full seating chart layout and appearance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Sort Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-primary" />
            <span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Sort Order</span>
          </div>
          
          <div>
            <Label htmlFor="sort-by" className="text-xs text-muted-foreground">
              Sort Guests By
            </Label>
            <Select
              value={settings.sortBy}
              onValueChange={(value: 'firstName' | 'lastName' | 'tableNo') => 
                onSettingsChange({ sortBy: value })
              }
            >
              <SelectTrigger id="sort-by" className="border-primary focus:ring-primary">
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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Display Options</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-dietary" className="text-xs text-muted-foreground">
                Show Dietary Requirements
              </Label>
              <Switch
                id="show-dietary"
                checked={settings.showDietary}
                onCheckedChange={(checked) => onSettingsChange({ showDietary: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-relation" className="text-xs text-muted-foreground">
                Show Relationship
              </Label>
              <Switch
                id="show-relation"
                checked={settings.showRelation}
                onCheckedChange={(checked) => onSettingsChange({ showRelation: checked })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Typography */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            <span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Typography</span>
          </div>
          
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
              <SelectTrigger id="font-size" className="border-primary focus:ring-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="small">Small (13px)</SelectItem>
                <SelectItem value="medium">Medium (16px)</SelectItem>
                <SelectItem value="large">Large (18px)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
