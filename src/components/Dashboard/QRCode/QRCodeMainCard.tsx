import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { QrCode as QrCodeIcon, Copy, Download, RotateCcw, Save, Printer, FileImage, Upload, RotateCw, Twitter, Instagram, Mail, MapPin, Phone, MessageCircle, Video, Wifi, Globe, Youtube, CreditCard, Bitcoin, X } from 'lucide-react';
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

interface QRDesignSettings {
  patternId: string;
  markerBorderId: string;
  markerCenterId: string;
  useCustomMarkerColors: boolean;
  useDifferentMarkerColors: boolean;
  markerBorderColor: string;
  markerCenterColor: string;
  markers: {
    TL: { border: string; center: string };
    TR: { border: string; center: string };
    BL: { border: string; center: string };
  };
}

interface QRLogoSettings {
  enabled: boolean;
  source: 'upload' | 'preset' | null;
  file: File | string | null;
  presetId: string | null;
  sizePct: number;
  clearBehind: boolean;
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

const defaultDesign: QRDesignSettings = {
  patternId: "pattern-01",
  markerBorderId: "finder-border-01",
  markerCenterId: "finder-center-01",
  useCustomMarkerColors: false,
  useDifferentMarkerColors: false,
  markerBorderColor: "#000000",
  markerCenterColor: "#000000",
  markers: {
    TL: { border: "#000000", center: "#000000" },
    TR: { border: "#000000", center: "#000000" },
    BL: { border: "#000000", center: "#000000" }
  }
};

const defaultLogo: QRLogoSettings = {
  enabled: false,
  source: null,
  file: null,
  presetId: null,
  sizePct: 100,
  clearBehind: false
};

const logoPresets = [
  { id: 'logo-twitter', label: 'Twitter/X', icon: Twitter, color: '#000000' },
  { id: 'logo-instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'logo-email', label: 'Email', icon: Mail, color: '#4285F4' },
  { id: 'logo-location', label: 'Location', icon: MapPin, color: '#EA4335' },
  { id: 'logo-phone', label: 'Phone', icon: Phone, color: '#34A853' },
  { id: 'logo-whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
  { id: 'logo-skype', label: 'Skype', icon: Video, color: '#00AFF0' },
  { id: 'logo-zoom', label: 'Zoom', icon: Video, color: '#2D8CFF' },
  { id: 'logo-wifi', label: 'Wi-Fi', icon: Wifi, color: '#000000' },
  { id: 'logo-globe', label: 'Web/Globe', icon: Globe, color: '#4285F4' },
  { id: 'logo-youtube', label: 'YouTube', icon: Youtube, color: '#FF0000' },
  { id: 'logo-paypal', label: 'PayPal', icon: CreditCard, color: '#003087' },
  { id: 'logo-bitcoin', label: 'Bitcoin', icon: Bitcoin, color: '#F7931A' },
  { id: 'logo-clear', label: 'Clear', icon: X, color: '#DC2626' }
];

export const QRCodeMainCard: React.FC<QRCodeMainCardProps> = ({ eventId }) => {
  const { events } = useEvents();
  const { toast } = useToast();
  
  const selectedEvent = events.find(event => event.id === eventId);
  const eventUrl = selectedEvent?.slug ? buildGuestLookupUrl(selectedEvent.slug) : `https://…/live-view/${eventId}`;

  // QR Settings State
  const [qrSettings, setQrSettings] = useState<{ colors: QRColorsSettings; design: QRDesignSettings; logo: QRLogoSettings }>({
    colors: { ...defaultColors },
    design: { ...defaultDesign },
    logo: { ...defaultLogo }
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
  }, [eventUrl, qrSettings.colors, qrSettings.design, qrSettings.logo, calculateContrast]);

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

  // Reset design
  const handleResetDesign = () => {
    setQrSettings(prev => ({
      ...prev,
      design: { ...defaultDesign }
    }));
  };

  // Reset logo
  const handleResetLogo = () => {
    setQrSettings(prev => ({
      ...prev,
      logo: { ...defaultLogo }
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

  // Design change handlers
  const updateDesign = (updates: Partial<QRDesignSettings>) => {
    setQrSettings(prev => ({
      ...prev,
      design: { ...prev.design, ...updates }
    }));
  };

  // Logo change handlers
  const updateLogo = (updates: Partial<QRLogoSettings>) => {
    setQrSettings(prev => ({
      ...prev,
      logo: { ...prev.logo, ...updates }
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
                    <AccordionContent className="pt-2 space-y-6">
                      {/* Pattern Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Pattern</Label>
                        <div className="grid grid-cols-5 gap-2">
                          {Array.from({ length: 20 }, (_, i) => {
                            const patternId = `pattern-${String(i + 1).padStart(2, '0')}`;
                            const isSelected = qrSettings.design.patternId === patternId;
                            return (
                              <button
                                key={patternId}
                                id={patternId}
                                onClick={() => updateDesign({ patternId })}
                                className={`aspect-square w-full border-2 rounded-md hover:border-primary/50 transition-colors ${
                                  isSelected ? 'border-primary bg-primary/10' : 'border-muted'
                                }`}
                                title={`Pattern ${i + 1}`}
                              >
                                <div className="w-full h-full bg-muted/30 rounded-sm flex items-center justify-center text-xs">
                                  {i + 1}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Marker Border Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Marker border (finder outer shape)</Label>
                        <div className="grid grid-cols-5 gap-2">
                          {Array.from({ length: 20 }, (_, i) => {
                            const borderId = `finder-border-${String(i + 1).padStart(2, '0')}`;
                            const isSelected = qrSettings.design.markerBorderId === borderId;
                            return (
                              <button
                                key={borderId}
                                id={borderId}
                                onClick={() => updateDesign({ markerBorderId: borderId })}
                                className={`aspect-square w-full border-2 rounded-md hover:border-primary/50 transition-colors ${
                                  isSelected ? 'border-primary bg-primary/10' : 'border-muted'
                                }`}
                                title={`Finder Border ${i + 1}`}
                              >
                                <div className="w-full h-full bg-muted/30 rounded-sm flex items-center justify-center text-xs">
                                  B{i + 1}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Marker Center Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Marker center (finder inner shape)</Label>
                        <div className="grid grid-cols-5 gap-2">
                          {Array.from({ length: 26 }, (_, i) => {
                            const centerId = `finder-center-${String(i + 1).padStart(2, '0')}`;
                            const isSelected = qrSettings.design.markerCenterId === centerId;
                            return (
                              <button
                                key={centerId}
                                id={centerId}
                                onClick={() => updateDesign({ markerCenterId: centerId })}
                                className={`aspect-square w-full border-2 rounded-md hover:border-primary/50 transition-colors ${
                                  isSelected ? 'border-primary bg-primary/10' : 'border-muted'
                                }`}
                                title={`Finder Center ${i + 1}`}
                              >
                                <div className="w-full h-full bg-muted/30 rounded-sm flex items-center justify-center text-xs">
                                  C{i + 1}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Marker Colors Section */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="toggle-custom-marker-color"
                            checked={qrSettings.design.useCustomMarkerColors}
                            onCheckedChange={(checked) => updateDesign({ useCustomMarkerColors: checked })}
                          />
                          <Label htmlFor="toggle-custom-marker-color" className="text-sm">Custom marker color</Label>
                        </div>

                        {qrSettings.design.useCustomMarkerColors && (
                          <div className="space-y-4 pl-6">
                            {/* Global Marker Colors */}
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  id="color-marker-border"
                                  type="color"
                                  value={qrSettings.design.markerBorderColor}
                                  onChange={(e) => updateDesign({ markerBorderColor: e.target.value })}
                                  className="w-6 h-6 rounded border border-input"
                                />
                                <Label className="text-xs">Marker border</Label>
                                <Input
                                  value={qrSettings.design.markerBorderColor}
                                  onChange={(e) => updateDesign({ markerBorderColor: e.target.value })}
                                  className="text-xs font-mono w-20"
                                  placeholder="#000000"
                                />
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <input
                                  id="color-marker-center"
                                  type="color"
                                  value={qrSettings.design.markerCenterColor}
                                  onChange={(e) => updateDesign({ markerCenterColor: e.target.value })}
                                  className="w-6 h-6 rounded border border-input"
                                />
                                <Label className="text-xs">Marker center</Label>
                                <Input
                                  value={qrSettings.design.markerCenterColor}
                                  onChange={(e) => updateDesign({ markerCenterColor: e.target.value })}
                                  className="text-xs font-mono w-20"
                                  placeholder="#000000"
                                />
                              </div>
                            </div>

                            {/* Different Marker Colors Toggle */}
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="toggle-different-marker-colors"
                                checked={qrSettings.design.useDifferentMarkerColors}
                                onCheckedChange={(checked) => updateDesign({ useDifferentMarkerColors: checked })}
                              />
                              <Label htmlFor="toggle-different-marker-colors" className="text-sm">Different markers colors</Label>
                            </div>

                            {/* Per-Marker Colors */}
                            {qrSettings.design.useDifferentMarkerColors && (
                              <div className="space-y-4">
                                {/* Top Left */}
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium">Top Left</Label>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      id="color-tl-border"
                                      type="color"
                                      value={qrSettings.design.markers.TL.border}
                                      onChange={(e) => updateDesign({ 
                                        markers: { 
                                          ...qrSettings.design.markers, 
                                          TL: { ...qrSettings.design.markers.TL, border: e.target.value }
                                        }
                                      })}
                                      className="w-5 h-5 rounded border border-input"
                                    />
                                    <Input
                                      id="color-tl-center"
                                      type="color"
                                      value={qrSettings.design.markers.TL.center}
                                      onChange={(e) => updateDesign({ 
                                        markers: { 
                                          ...qrSettings.design.markers, 
                                          TL: { ...qrSettings.design.markers.TL, center: e.target.value }
                                        }
                                      })}
                                      className="w-5 h-5 rounded border border-input"
                                    />
                                  </div>
                                </div>

                                {/* Top Right */}
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium">Top Right</Label>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      id="color-tr-border"
                                      type="color"
                                      value={qrSettings.design.markers.TR.border}
                                      onChange={(e) => updateDesign({ 
                                        markers: { 
                                          ...qrSettings.design.markers, 
                                          TR: { ...qrSettings.design.markers.TR, border: e.target.value }
                                        }
                                      })}
                                      className="w-5 h-5 rounded border border-input"
                                    />
                                    <input
                                      id="color-tr-center"
                                      type="color"
                                      value={qrSettings.design.markers.TR.center}
                                      onChange={(e) => updateDesign({ 
                                        markers: { 
                                          ...qrSettings.design.markers, 
                                          TR: { ...qrSettings.design.markers.TR, center: e.target.value }
                                        }
                                      })}
                                      className="w-5 h-5 rounded border border-input"
                                    />
                                  </div>
                                </div>

                                {/* Bottom Left */}
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium">Bottom Left</Label>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      id="color-bl-border"
                                      type="color"
                                      value={qrSettings.design.markers.BL.border}
                                      onChange={(e) => updateDesign({ 
                                        markers: { 
                                          ...qrSettings.design.markers, 
                                          BL: { ...qrSettings.design.markers.BL, border: e.target.value }
                                        }
                                      })}
                                      className="w-5 h-5 rounded border border-input"
                                    />
                                    <input
                                      id="color-bl-center"
                                      type="color"
                                      value={qrSettings.design.markers.BL.center}
                                      onChange={(e) => updateDesign({ 
                                        markers: { 
                                          ...qrSettings.design.markers, 
                                          BL: { ...qrSettings.design.markers.BL, center: e.target.value }
                                        }
                                      })}
                                      className="w-5 h-5 rounded border border-input"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Reset Button */}
                      <div className="pt-2">
                        <Button
                          id="btn-reset-design"
                          variant="ghost"
                          size="sm"
                          onClick={handleResetDesign}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Reset Design
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="logo">
                    <AccordionTrigger className="text-sm font-medium hover:text-primary">
                      Logo
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 space-y-6">
                      {/* Upload Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Upload your logo or select a watermark</Label>
                        
                        <div className="space-y-2">
                          <Input
                            id="logo-upload"
                            type="file"
                            accept="image/svg+xml,image/png,image/jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  const result = e.target?.result as string;
                                  updateLogo({
                                    enabled: true,
                                    source: 'upload',
                                    file: result,
                                    presetId: null
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="text-xs"
                          />
                          
                          {qrSettings.logo.source === 'upload' && qrSettings.logo.file && (
                            <div className="flex items-center space-x-2 p-2 bg-muted/20 rounded border">
                              <div className="w-8 h-8 bg-white border rounded overflow-hidden">
                                <img 
                                  src={qrSettings.logo.file as string} 
                                  alt="Logo preview" 
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">Custom logo uploaded</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Preset Watermarks */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Preset Watermarks</Label>
                        <div className="grid grid-cols-7 gap-2">
                          {logoPresets.map((preset) => {
                            const Icon = preset.icon;
                            const isSelected = qrSettings.logo.presetId === preset.id;
                            return (
                              <button
                                key={preset.id}
                                id={preset.id}
                                onClick={() => {
                                  if (preset.id === 'logo-clear') {
                                    updateLogo({
                                      enabled: false,
                                      source: null,
                                      presetId: null,
                                      file: null
                                    });
                                  } else {
                                    updateLogo({
                                      enabled: true,
                                      source: 'preset',
                                      presetId: preset.id,
                                      file: null
                                    });
                                  }
                                }}
                                className={`aspect-square w-full border-2 rounded-md p-2 hover:border-primary/50 transition-colors ${
                                  isSelected ? 'border-primary bg-primary/10' : 'border-muted'
                                } ${preset.id === 'logo-clear' ? 'bg-red-50' : 'bg-white'}`}
                                title={preset.label}
                                style={{ backgroundColor: preset.id === 'logo-clear' ? '#FEF2F2' : preset.color + '20' }}
                              >
                                <Icon 
                                  className="w-full h-full" 
                                  style={{ color: preset.color }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Remove Background Toggle */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="toggle-logo-clear-behind"
                            checked={qrSettings.logo.clearBehind}
                            onCheckedChange={(checked) => updateLogo({ clearBehind: checked })}
                          />
                          <Label htmlFor="toggle-logo-clear-behind" className="text-sm">Remove background behind Logo</Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          Creates a safe area under the logo for best scanning.
                        </p>
                      </div>

                      {/* Logo Size Slider */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Logo size: {qrSettings.logo.sizePct}%</Label>
                        <Slider
                          id="slider-logo-size"
                          value={[qrSettings.logo.sizePct]}
                          onValueChange={([value]) => updateLogo({ sizePct: value })}
                          min={0}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      {/* Reset Button */}
                      <div className="pt-2">
                        <Button
                          id="btn-reset-logo"
                          variant="ghost"
                          size="sm"
                          onClick={handleResetLogo}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Reset Logo
                        </Button>
                      </div>
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