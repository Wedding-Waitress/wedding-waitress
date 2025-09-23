import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { QrCode as QrCodeIcon, Copy, Download, RotateCcw, Save, Printer, FileImage, Upload, RotateCw } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { buildGuestLookupUrl } from '@/lib/urlUtils';
import QRCode from 'qrcode';

interface QRCodeMainCardProps {
  eventId: string;
}

interface QRColorsSettings {
  background: string;
  transparentBg: boolean;
  bgImage: File | null;
  bgImageFit: 'cover' | 'contain';
  bgOpacity: number;
  foreground: string;
  useGradient: boolean;
  gradientType: 'linear' | 'radial';
  gradientColor2: string;
  gradientAngle: number;
}

const defaultColors: QRColorsSettings = {
  background: "#ffffff",
  transparentBg: false,
  bgImage: null,
  bgImageFit: "cover",
  bgOpacity: 1,
  foreground: "#060606",
  useGradient: false,
  gradientType: "linear",
  gradientColor2: "#8900d5",
  gradientAngle: 0
};

export const QRCodeMainCard: React.FC<QRCodeMainCardProps> = ({ eventId }) => {
  const { events } = useEvents();
  const { toast } = useToast();
  
  const selectedEvent = events.find(event => event.id === eventId);
  const eventUrl = selectedEvent?.slug ? buildGuestLookupUrl(selectedEvent.slug) : `https://…/live-view/${eventId}`;

  // QR Settings State
  const [qrSettings, setQrSettings] = useState<{ colors: QRColorsSettings }>({
    colors: { ...defaultColors }
  });

  // Preview state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [contrastWarning, setContrastWarning] = useState<boolean>(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      toast({
        title: "URL copied!",
        description: "The event URL has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy URL. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate contrast ratio (simplified WCAG)
  const calculateContrast = useCallback((bg: string, fg: string) => {
    // Simplified contrast calculation
    const bgLum = parseInt(bg.replace('#', ''), 16);
    const fgLum = parseInt(fg.replace('#', ''), 16);
    const ratio = (Math.max(bgLum, fgLum) + 0.05) / (Math.min(bgLum, fgLum) + 0.05);
    return ratio;
  }, []);

  // Debounced QR render function
  const renderQR = useCallback(async () => {
    if (!eventUrl) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Generate QR code
      const qrDataURL = await QRCode.toDataURL(eventUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: qrSettings.colors.useGradient ? qrSettings.colors.foreground : qrSettings.colors.foreground,
          light: qrSettings.colors.transparentBg ? '#00000000' : qrSettings.colors.background
        }
      });

      setQrDataUrl(qrDataURL);

      // Check contrast
      const effectiveBg = qrSettings.colors.transparentBg ? '#ffffff' : qrSettings.colors.background;
      const effectiveFg = qrSettings.colors.useGradient ? qrSettings.colors.foreground : qrSettings.colors.foreground;
      const contrast = calculateContrast(effectiveBg, effectiveFg);
      setContrastWarning(contrast < 4.5);

    } catch (error) {
      console.error('Error rendering QR code:', error);
    }
  }, [eventUrl, qrSettings.colors, calculateContrast]);

  // Debounced render effect
  useEffect(() => {
    const timer = setTimeout(renderQR, 150);
    return () => clearTimeout(timer);
  }, [renderQR]);

  // Reset colors
  const handleResetColors = () => {
    setQrSettings(prev => ({
      ...prev,
      colors: { ...defaultColors }
    }));
  };

  // Preset handlers
  const applyPreset = (preset: 'bw' | 'ww' | 'gold') => {
    const presets = {
      bw: {
        ...defaultColors,
        background: '#ffffff',
        foreground: '#000000',
        useGradient: false
      },
      ww: {
        ...defaultColors,
        background: '#ffffff',
        foreground: '#060606',
        useGradient: true,
        gradientColor2: '#8900d5',
        gradientAngle: 45
      },
      gold: {
        ...defaultColors,
        background: '#ffffff',
        foreground: '#b8860b',
        useGradient: false
      }
    };

    setQrSettings(prev => ({
      ...prev,
      colors: presets[preset]
    }));
  };

  // Color change handlers
  const updateColors = (updates: Partial<QRColorsSettings>) => {
    setQrSettings(prev => ({
      ...prev,
      colors: { ...prev.colors, ...updates }
    }));
  };

  return (
    <Card className="ww-box h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCodeIcon className="h-5 w-5" />
          QR Code Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* URL Header Row */}
        <div className="space-y-2">
          <Label htmlFor="qr-event-url" className="text-sm font-medium">URL</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="qr-event-url"
              value={eventUrl}
              readOnly
              className="flex-1"
              placeholder="https://…/live-view/{eventId}"
            />
            <Button
              id="btn-copy-url"
              variant="outline"
              size="sm"
              onClick={handleCopyUrl}
              className="shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Preview (Larger) */}
          <div id="qr-left" className="lg:col-span-2">
            <Card className="bg-white border-2 border-primary/20 rounded-lg">
              <CardContent className="p-6">
                {/* QR Preview */}
                <div className="flex justify-center mb-6">
                  <div 
                    id="qr-preview"
                    className="w-full max-w-[460px] aspect-square min-h-[360px] bg-muted/20 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center"
                  >
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR Code Preview" className="max-w-full max-h-full" />
                    ) : (
                      <QrCodeIcon className="h-24 w-24 text-muted-foreground/50" />
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-2">
                  <Button id="btn-save-qr" variant="default" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button id="btn-reset-qr" variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button id="btn-dl-png" variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    PNG
                  </Button>
                  <Button id="btn-dl-jpg" variant="outline" size="sm">
                    <FileImage className="h-4 w-4 mr-2" />
                    JPG
                  </Button>
                  <Button id="btn-dl-svg" variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    SVG
                  </Button>
                  <Button id="btn-print-qr" variant="outline" size="sm">
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Controls (Narrower) */}
          <div id="qr-right">
            <Card className="bg-white border-2 border-primary/20 rounded-lg">
              <CardContent className="p-4">
                <Accordion 
                  id="qr-controls" 
                  type="single" 
                  collapsible
                  className="w-full"
                >
                  <AccordionItem value="colors">
                    <AccordionTrigger className="text-sm font-medium hover:text-primary">
                      Colors
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 space-y-6">
                      {/* Background Section */}
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Background</Label>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <input
                              id="color-bg"
                              type="color"
                              value={qrSettings.colors.background}
                              onChange={(e) => updateColors({ background: e.target.value })}
                              disabled={qrSettings.colors.transparentBg}
                              className="w-8 h-8 rounded border border-input disabled:opacity-50"
                            />
                            <Input
                              value={qrSettings.colors.background}
                              onChange={(e) => updateColors({ background: e.target.value })}
                              disabled={qrSettings.colors.transparentBg}
                              className="text-xs font-mono"
                              placeholder="#ffffff"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="toggle-bg-transparent"
                              checked={qrSettings.colors.transparentBg}
                              onCheckedChange={(checked) => updateColors({ transparentBg: checked })}
                            />
                            <Label htmlFor="toggle-bg-transparent" className="text-sm">Transparent background</Label>
                          </div>

                          {!qrSettings.colors.transparentBg && (
                            <>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="toggle-bg-image"
                                  checked={!!qrSettings.colors.bgImage}
                                  onCheckedChange={(checked) => {
                                    if (!checked) updateColors({ bgImage: null });
                                  }}
                                />
                                <Label htmlFor="toggle-bg-image" className="text-sm">Background image</Label>
                              </div>

                              {qrSettings.colors.bgImage && (
                                <div className="space-y-2 pl-6">
                                  <Input
                                    id="bg-image-file"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      updateColors({ bgImage: file });
                                    }}
                                    className="text-xs"
                                  />
                                  
                                  <div className="flex items-center space-x-2">
                                    <Label className="text-xs">Fit:</Label>
                                    <RadioGroup
                                      value={qrSettings.colors.bgImageFit}
                                      onValueChange={(value: 'cover' | 'contain') => updateColors({ bgImageFit: value })}
                                      className="flex space-x-4"
                                    >
                                      <div className="flex items-center space-x-1">
                                        <RadioGroupItem value="cover" id="bg-image-fit" />
                                        <Label htmlFor="cover" className="text-xs">Cover</Label>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <RadioGroupItem value="contain" />
                                        <Label htmlFor="contain" className="text-xs">Contain</Label>
                                      </div>
                                    </RadioGroup>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2">
                                <Label className="text-xs">Opacity: {Math.round(qrSettings.colors.bgOpacity * 100)}%</Label>
                                <Slider
                                  id="bg-opacity"
                                  value={[qrSettings.colors.bgOpacity * 100]}
                                  onValueChange={([value]) => updateColors({ bgOpacity: value / 100 })}
                                  max={100}
                                  step={1}
                                  className="w-full"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Foreground Section */}
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Foreground</Label>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <input
                              id="color-fg"
                              type="color"
                              value={qrSettings.colors.foreground}
                              onChange={(e) => updateColors({ foreground: e.target.value })}
                              className="w-8 h-8 rounded border border-input"
                            />
                            <Input
                              value={qrSettings.colors.foreground}
                              onChange={(e) => updateColors({ foreground: e.target.value })}
                              className="text-xs font-mono"
                              placeholder="#060606"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="toggle-fg-gradient"
                              checked={qrSettings.colors.useGradient}
                              onCheckedChange={(checked) => updateColors({ useGradient: checked })}
                            />
                            <Label htmlFor="toggle-fg-gradient" className="text-sm">Gradient</Label>
                          </div>

                          {qrSettings.colors.useGradient && (
                            <div className="space-y-3 pl-6">
                              <div className="flex items-center space-x-2">
                                <input
                                  id="color-fg-2"
                                  type="color"
                                  value={qrSettings.colors.gradientColor2}
                                  onChange={(e) => updateColors({ gradientColor2: e.target.value })}
                                  className="w-8 h-8 rounded border border-input"
                                />
                                <Input
                                  value={qrSettings.colors.gradientColor2}
                                  onChange={(e) => updateColors({ gradientColor2: e.target.value })}
                                  className="text-xs font-mono"
                                  placeholder="#8900d5"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs">Type:</Label>
                                <RadioGroup
                                  id="fg-gradient-type"
                                  value={qrSettings.colors.gradientType}
                                  onValueChange={(value: 'linear' | 'radial') => updateColors({ gradientType: value })}
                                  className="flex space-x-4"
                                >
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="linear" />
                                    <Label className="text-xs">Linear</Label>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="radial" />
                                    <Label className="text-xs">Radial</Label>
                                  </div>
                                </RadioGroup>
                              </div>

                              {qrSettings.colors.gradientType === 'linear' && (
                                <div className="space-y-2">
                                  <Label className="text-xs">Angle: {qrSettings.colors.gradientAngle}°</Label>
                                  <Slider
                                    id="fg-gradient-angle"
                                    value={[qrSettings.colors.gradientAngle]}
                                    onValueChange={([value]) => updateColors({ gradientAngle: value })}
                                    max={360}
                                    step={1}
                                    className="w-full"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Presets Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Presets</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            id="preset-bw"
                            variant="outline"
                            size="sm"
                            onClick={() => applyPreset('bw')}
                            className="text-xs"
                          >
                            Classic B/W
                          </Button>
                          <Button
                            id="preset-ww"
                            variant="outline"
                            size="sm"
                            onClick={() => applyPreset('ww')}
                            className="text-xs"
                          >
                            WW Purple
                          </Button>
                          <Button
                            id="preset-gold"
                            variant="outline"
                            size="sm"
                            onClick={() => applyPreset('gold')}
                            className="text-xs"
                          >
                            Gold on White
                          </Button>
                        </div>
                      </div>

                      {/* Scannability Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Scannability</Label>
                        <div
                          id="color-contrast-helper"
                          className={`p-3 rounded-md text-xs ${
                            contrastWarning 
                              ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                              : 'bg-green-50 text-green-800 border border-green-200'
                          }`}
                        >
                          {contrastWarning 
                            ? '⚠️ Low contrast may reduce scan reliability.' 
                            : '✅ Good contrast for reliable scanning.'
                          }
                        </div>
                      </div>

                      {/* Reset Button */}
                      <div className="pt-2">
                        <Button
                          id="btn-reset-colors"
                          variant="ghost"
                          size="sm"
                          onClick={handleResetColors}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Reset Colors
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="design">
                    <AccordionTrigger className="text-sm font-medium hover:text-primary">
                      Design
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      {/* Design controls will go here */}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="logo">
                    <AccordionTrigger className="text-sm font-medium hover:text-primary">
                      Logo
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      {/* Logo controls will go here */}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="frame">
                    <AccordionTrigger className="text-sm font-medium hover:text-primary">
                      Frame
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      {/* Frame controls will go here */}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};