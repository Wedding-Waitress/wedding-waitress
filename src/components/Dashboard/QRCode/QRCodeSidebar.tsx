import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Palette, Grid3X3, Image, Frame, Upload, X } from 'lucide-react';
import { QRCodeSettings } from '@/hooks/useQRCodeSettings';

interface QRCodeSidebarProps {
  settings: QRCodeSettings;
  onSettingsChange: (settings: Partial<QRCodeSettings>) => void;
}

const patternOptions = [
  'basic', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded',
  'square', 'edge-cut', 'edge-cut-smooth', 'japnese', 'mosaic', 'circular'
];

const markerBorderStyles = [
  'square', 'circle', 'rounded', 'extra-rounded', 'classy', 'classy-rounded',
  'square-extra-rounded', 'edge-cut', 'edge-cut-smooth', 'circular'
];

const markerCenterStyles = [
  'square', 'circle', 'rounded', 'extra-rounded', 'classy', 'classy-rounded',
  'square-extra-rounded', 'edge-cut', 'edge-cut-smooth', 'circular', 'star', 'diamond', 'dot', 'heart'
];

const frameStyles = [
  'none', 'square', 'rounded', 'extra-rounded', 'circular', 'banner', 'bubble', 'ticket', 'coupon'
];

export const QRCodeSidebar: React.FC<QRCodeSidebarProps> = ({
  settings,
  onSettingsChange,
}) => {
  const [openSections, setOpenSections] = useState({
    colors: true,
    design: false,
    logo: false,
    frame: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="w-80 bg-background border-r p-4 space-y-4 overflow-y-auto">
      {/* Colors Section */}
      <Collapsible open={openSections.colors} onOpenChange={() => toggleSection('colors')}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between bg-primary/10 hover:bg-primary/20">
            <span className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Colors
            </span>
            {openSections.colors ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Background</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={settings.background_color}
                  onChange={(e) => onSettingsChange({ background_color: e.target.value })}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  type="text"
                  value={settings.background_color}
                  onChange={(e) => onSettingsChange({ background_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label>Foreground</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={settings.foreground_color}
                  onChange={(e) => onSettingsChange({ foreground_color: e.target.value })}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  type="text"
                  value={settings.foreground_color}
                  onChange={(e) => onSettingsChange({ foreground_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Design Section */}
      <Collapsible open={openSections.design} onOpenChange={() => toggleSection('design')}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between hover:bg-accent">
            <span className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Design
            </span>
            {openSections.design ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          <div className="grid grid-cols-6 gap-2">
            {patternOptions.map((pattern) => (
              <Button
                key={pattern}
                variant={settings.pattern === pattern ? "default" : "outline"}
                size="sm"
                className="aspect-square p-1"
                onClick={() => onSettingsChange({ pattern })}
              >
                <div className="w-4 h-4 bg-current rounded-sm opacity-80" />
              </Button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Logo Section */}
      <Collapsible open={openSections.logo} onOpenChange={() => toggleSection('logo')}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between hover:bg-accent">
            <span className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Logo
            </span>
            {openSections.logo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          <div>
            <Label>Logo size: {settings.center_image_size || 100}%</Label>
            <Slider
              value={[settings.center_image_size || 100]}
              onValueChange={([value]) => onSettingsChange({ center_image_size: value })}
              max={200}
              min={10}
              step={5}
              className="mt-2"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Frame Section */}
      <Collapsible open={openSections.frame} onOpenChange={() => toggleSection('frame')}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between hover:bg-accent">
            <span className="flex items-center gap-2">
              <Frame className="h-4 w-4" />
              Frame
            </span>
            {openSections.frame ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          <div className="grid grid-cols-5 gap-2">
            {frameStyles.map((style) => (
              <Button
                key={style}
                variant={settings.frame_style === style ? "default" : "outline"}
                size="sm"
                className="aspect-square p-1"
                onClick={() => onSettingsChange({ frame_style: style })}
              >
                {style === 'none' ? <X className="h-4 w-4" /> : <div className="w-4 h-4 border-2 border-current" />}
              </Button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};