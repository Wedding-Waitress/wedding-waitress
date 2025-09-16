import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Palette, Shapes, Settings, Image as ImageIcon } from 'lucide-react';
import { QRCodeSettings, useQRCodeSettings } from '@/hooks/useQRCodeSettings';
import { QR_SHAPES, QR_PATTERNS, COLOR_PALETTES, CORNER_STYLES, BORDER_STYLES, OUTPUT_FORMATS, OUTPUT_SIZES } from '@/lib/qrShapes';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdvancedQRCustomizerProps {
  eventId: string;
  settings: QRCodeSettings;
  onSettingsChange: (settings: Partial<QRCodeSettings>) => void;
  onSave: () => void;
}

export const AdvancedQRCustomizer: React.FC<AdvancedQRCustomizerProps> = ({
  eventId,
  settings,
  onSettingsChange,
  onSave
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file: File, type: 'center' | 'background') => {
    try {
      setUploading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('qr-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('qr-assets')
        .getPublicUrl(fileName);

      const key = type === 'center' ? 'center_image_url' : 'background_image_url';
      onSettingsChange({ [key]: publicUrl });

      toast({
        title: 'Success',
        description: `${type === 'center' ? 'Logo' : 'Background'} image uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleColorPaletteChange = (palette: string) => {
    const paletteData = COLOR_PALETTES.find(p => p.value === palette);
    if (paletteData) {
      onSettingsChange({
        color_palette: palette,
        foreground_color: paletteData.colors.foreground,
        background_color: paletteData.colors.background,
      });
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Advanced QR Customization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="shapes" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="shapes" className="text-xs">Shapes</TabsTrigger>
            <TabsTrigger value="colors" className="text-xs">Colors</TabsTrigger>
            <TabsTrigger value="effects" className="text-xs">Effects</TabsTrigger>
            <TabsTrigger value="images" className="text-xs">Images</TabsTrigger>
            <TabsTrigger value="export" className="text-xs">Export</TabsTrigger>
          </TabsList>

          {/* Shapes & Patterns Tab */}
          <TabsContent value="shapes" className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">QR Code Shape</Label>
              <div className="grid grid-cols-2 gap-2">
                {QR_SHAPES.slice(0, 8).map((shape) => (
                  <Button
                    key={shape.value}
                    variant={settings.shape === shape.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSettingsChange({ shape: shape.value })}
                    className="text-xs"
                  >
                    {shape.label}
                  </Button>
                ))}
              </div>
              
              <details className="space-y-2">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  More Artistic Shapes ({QR_SHAPES.length - 8})
                </summary>
                <div className="grid grid-cols-2 gap-2">
                  {QR_SHAPES.slice(8).map((shape) => (
                    <Button
                      key={shape.value}
                      variant={settings.shape === shape.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => onSettingsChange({ shape: shape.value })}
                      className="text-xs"
                    >
                      {shape.label}
                    </Button>
                  ))}
                </div>
              </details>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Pattern Style</Label>
              <Select value={settings.pattern} onValueChange={(value) => onSettingsChange({ pattern: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QR_PATTERNS.map((pattern) => (
                    <SelectItem key={pattern.value} value={pattern.value}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{pattern.category}</Badge>
                        {pattern.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Corner Style</Label>
              <div className="grid grid-cols-3 gap-2">
                {CORNER_STYLES.map((style) => (
                  <Button
                    key={style.value}
                    variant={settings.corner_style === style.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSettingsChange({ corner_style: style.value })}
                    className="text-xs"
                  >
                    {style.label}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Color Palette</Label>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_PALETTES.map((palette) => (
                  <Button
                    key={palette.value}
                    variant={settings.color_palette === palette.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleColorPaletteChange(palette.value)}
                    className="text-xs justify-start"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        <div 
                          className="w-3 h-3 rounded-l border" 
                          style={{ backgroundColor: palette.colors.foreground }}
                        />
                        <div 
                          className="w-3 h-3 rounded-r border" 
                          style={{ backgroundColor: palette.colors.background }}
                        />
                      </div>
                      {palette.label}
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Foreground Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.foreground_color}
                    onChange={(e) => onSettingsChange({ foreground_color: e.target.value })}
                    className="w-12 h-9 p-0 border-0"
                  />
                  <Input
                    value={settings.foreground_color}
                    onChange={(e) => onSettingsChange({ foreground_color: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.background_color}
                    onChange={(e) => onSettingsChange({ background_color: e.target.value })}
                    className="w-12 h-9 p-0 border-0"
                  />
                  <Input
                    value={settings.background_color}
                    onChange={(e) => onSettingsChange({ background_color: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Gradient Effects</Label>
              <Select 
                value={settings.gradient_type} 
                onValueChange={(value) => onSettingsChange({ gradient_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gradient type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="linear">Linear Gradient</SelectItem>
                  <SelectItem value="radial">Radial Gradient</SelectItem>
                  <SelectItem value="conic">Conic Gradient</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Effects Tab */}
          <TabsContent value="effects" className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Border Effects</Label>
              <Select 
                value={settings.border_style} 
                onValueChange={(value) => onSettingsChange({ border_style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BORDER_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {settings.border_style !== 'none' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Border Width: {settings.border_width}px</Label>
                  <Slider
                    value={[settings.border_width]}
                    onValueChange={([value]) => onSettingsChange({ border_width: value })}
                    max={20}
                    min={1}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Border Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.border_color}
                      onChange={(e) => onSettingsChange({ border_color: e.target.value })}
                      className="w-12 h-9 p-0 border-0"
                    />
                    <Input
                      value={settings.border_color}
                      onChange={(e) => onSettingsChange({ border_color: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Shadow Effects</Label>
                <Switch
                  checked={settings.shadow_enabled}
                  onCheckedChange={(checked) => onSettingsChange({ shadow_enabled: checked })}
                />
              </div>
              
              {settings.shadow_enabled && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Shadow Blur: {settings.shadow_blur}px</Label>
                    <Slider
                      value={[settings.shadow_blur]}
                      onValueChange={([value]) => onSettingsChange({ shadow_blur: value })}
                      max={50}
                      min={0}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Shadow Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={settings.shadow_color.slice(0, 7)}
                        onChange={(e) => onSettingsChange({ shadow_color: e.target.value + '33' })}
                        className="w-12 h-9 p-0 border-0"
                      />
                      <Input
                        value={settings.shadow_color}
                        onChange={(e) => onSettingsChange({ shadow_color: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Background Opacity: {(settings.background_opacity * 100).toFixed(0)}%</Label>
              <Slider
                value={[settings.background_opacity]}
                onValueChange={([value]) => onSettingsChange({ background_opacity: value })}
                max={1}
                min={0}
                step={0.1}
              />
            </div>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Center Logo/Image</Label>
              <div className="space-y-3">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'center');
                    }}
                    className="mb-2"
                    disabled={uploading}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Upload a logo or image for the center of your QR code
                  </p>
                  {settings.center_image_url && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-green-600">✓ Image uploaded</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSettingsChange({ center_image_url: '' })}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                {settings.center_image_url && (
                  <div className="space-y-2">
                    <Label className="text-sm">Logo Size: {settings.center_image_size}%</Label>
                    <Slider
                      value={[settings.center_image_size]}
                      onValueChange={([value]) => onSettingsChange({ center_image_size: value })}
                      max={150}
                      min={10}
                      step={5}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Background Image/Pattern</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'background');
                  }}
                  className="mb-2"
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Upload a background pattern or texture
                </p>
                {settings.background_image_url && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-green-600">✓ Background uploaded</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSettingsChange({ background_image_url: '' })}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Scan Text</Label>
                <Switch
                  checked={settings.has_scan_text}
                  onCheckedChange={(checked) => onSettingsChange({ has_scan_text: checked })}
                />
              </div>
              
              {settings.has_scan_text && (
                <Input
                  value={settings.scan_text}
                  onChange={(e) => onSettingsChange({ scan_text: e.target.value })}
                  placeholder="Enter scan text..."
                />
              )}
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Output Size</Label>
              <Select 
                value={settings.output_size.toString()} 
                onValueChange={(value) => onSettingsChange({ output_size: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_SIZES.map((size) => (
                    <SelectItem key={size.value} value={size.value.toString()}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Output Format</Label>
              <div className="grid grid-cols-2 gap-2">
                {OUTPUT_FORMATS.map((format) => (
                  <Button
                    key={format.value}
                    variant={settings.output_format === format.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSettingsChange({ output_format: format.value })}
                    className="text-xs"
                  >
                    {format.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button onClick={onSave} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Save Settings & Generate QR Code
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};