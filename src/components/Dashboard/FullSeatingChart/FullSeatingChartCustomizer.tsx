import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { FullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpDown,
  Type,
  FileText,
  Settings,
  Bold,
  Italic,
  Underline,
  ChevronDown,
  Check,
} from 'lucide-react';

interface FullSeatingChartCustomizerProps {
  settings: FullSeatingChartSettings;
  onSettingsChange: (settings: Partial<FullSeatingChartSettings>) => void;
}

export const FullSeatingChartCustomizer: React.FC<FullSeatingChartCustomizerProps> = ({
  settings,
  onSettingsChange,
}) => {
  // Build label showing active styles
  const getTextStyleLabel = () => {
    const active: string[] = [];
    if (settings.isBold) active.push('Bold');
    if (settings.isItalic) active.push('Italic');
    if (settings.isUnderline) active.push('Underline');
    return active.length > 0 ? active.join(', ') : 'None';
  };

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
                className={!settings.showDietary ? 'data-[state=unchecked]:bg-destructive' : ''}
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
            <Label className="text-xs text-muted-foreground">
              Text Style
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between border-primary focus:ring-primary mt-1"
                >
                  <span className="text-sm">{getTextStyleLabel()}</span>
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
      </CardContent>
    </Card>
  );
};
