import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ColorPickerPopover } from '@/components/ui/color-picker-popover';

interface RunningSheetSettingsSidebarProps {
  settings: {
    all_font: string;
    all_text_size: 'small' | 'medium' | 'large';
    all_bold: boolean;
    all_italic: boolean;
    all_text_color: string;
    header_font: string;
    header_size: 'small' | 'medium' | 'large';
    header_bold: boolean;
    header_italic: boolean;
    header_color: string;
  };
  onUpdate: (settings: Partial<RunningSheetSettingsSidebarProps['settings']>) => void;
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter (Default)' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Raleway', label: 'Raleway' },
];

export const RunningSheetSettingsSidebar: React.FC<RunningSheetSettingsSidebarProps> = ({
  settings,
  onUpdate,
}) => {
  return (
    <div className="bg-[#F4F4F5] rounded-xl p-4 space-y-6 sticky top-6" style={{ width: '280px', minWidth: '280px' }}>
      {/* Title */}
      <h3 className="text-lg font-semibold" style={{ color: '#6D28D9' }}>
        Running Sheet Settings
      </h3>

      {/* Section 1: All Text Settings */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">All Text</h4>
        
        {/* Font Dropdown */}
        <div className="space-y-1.5">
          <Label className="text-xs">Font</Label>
          <Select value={settings.all_font} onValueChange={(val) => onUpdate({ all_font: val })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Text Size Radio Buttons */}
        <div className="space-y-1.5">
          <Label className="text-xs">Size</Label>
          <RadioGroup value={settings.all_text_size} onValueChange={(val: any) => onUpdate({ all_text_size: val })}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="small" id="text-small" />
              <Label htmlFor="text-small" className="text-xs font-normal cursor-pointer">Small</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="medium" id="text-medium" />
              <Label htmlFor="text-medium" className="text-xs font-normal cursor-pointer">Medium</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="large" id="text-large" />
              <Label htmlFor="text-large" className="text-xs font-normal cursor-pointer">Large</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Bold & Italic Toggles */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              checked={settings.all_bold} 
              onCheckedChange={(val) => onUpdate({ all_bold: val })} 
              id="text-bold"
            />
            <Label htmlFor="text-bold" className="text-xs font-normal cursor-pointer">Bold</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              checked={settings.all_italic} 
              onCheckedChange={(val) => onUpdate({ all_italic: val })} 
              id="text-italic"
            />
            <Label htmlFor="text-italic" className="text-xs font-normal cursor-pointer">Italic</Label>
          </div>
        </div>

        {/* Color Picker */}
        <div className="space-y-1.5">
          <Label className="text-xs">Text Color</Label>
          <ColorPickerPopover
            value={settings.all_text_color}
            onChange={(color) => onUpdate({ all_text_color: color })}
          />
        </div>
      </div>

      <Separator />

      {/* Section 2: Header Settings */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Headers</h4>
        
        {/* Header Font Dropdown */}
        <div className="space-y-1.5">
          <Label className="text-xs">Font</Label>
          <Select value={settings.header_font} onValueChange={(val) => onUpdate({ header_font: val })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Header Size Radio Buttons */}
        <div className="space-y-1.5">
          <Label className="text-xs">Size</Label>
          <RadioGroup value={settings.header_size} onValueChange={(val: any) => onUpdate({ header_size: val })}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="small" id="header-small" />
              <Label htmlFor="header-small" className="text-xs font-normal cursor-pointer">Small</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="medium" id="header-medium" />
              <Label htmlFor="header-medium" className="text-xs font-normal cursor-pointer">Medium</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="large" id="header-large" />
              <Label htmlFor="header-large" className="text-xs font-normal cursor-pointer">Large</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Header Bold & Italic Toggles */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              checked={settings.header_bold} 
              onCheckedChange={(val) => onUpdate({ header_bold: val })} 
              id="header-bold"
            />
            <Label htmlFor="header-bold" className="text-xs font-normal cursor-pointer">Bold</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              checked={settings.header_italic} 
              onCheckedChange={(val) => onUpdate({ header_italic: val })} 
              id="header-italic"
            />
            <Label htmlFor="header-italic" className="text-xs font-normal cursor-pointer">Italic</Label>
          </div>
        </div>

        {/* Header Color Picker */}
        <div className="space-y-1.5">
          <Label className="text-xs">Header Color</Label>
          <ColorPickerPopover
            value={settings.header_color}
            onChange={(color) => onUpdate({ header_color: color })}
          />
        </div>
      </div>
    </div>
  );
};
