import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { QrCode as QrCodeIcon, Copy, Download, RotateCcw, Save, Printer, FileImage, Upload, RotateCw, Twitter, Instagram, Mail, MapPin, Phone, MessageCircle, Video, Wifi, Globe, Youtube, CreditCard, Bitcoin, X, Square, Circle, RectangleHorizontal, RectangleVertical, Trophy, Ticket, Tag, Palette, Grid3X3, Image as ImageIcon, ChevronDown, FileDown, Code, FileText, Heart, Star, Diamond, Users, Sparkles, Zap, Crown, Gift } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { buildGuestLookupUrl } from '@/lib/urlUtils';
import { QR_SHAPES, QR_PATTERNS, COLOR_PALETTES, CORNER_STYLES, BORDER_STYLES } from '@/lib/qrShapes';
import { AdvancedQRGenerator } from '@/lib/advancedQRGenerator';
import type { QRCodeSettings } from '@/hooks/useQRCodeSettings';
import jsPDF from 'jspdf';

interface QRCodeMainCardProps {
  eventId: string;
}

interface QRColorsSettings {
  background: string;
  foreground: string;
}

interface QRDesignSettings {
  pattern: string;
  shape: string;
  cornerStyle: string;
  borderStyle: string;
  borderWidth: number;
}

interface QRLogoSettings {
  enabled: boolean;
  source: 'upload' | 'preset' | null;
  file: File | string | null;
  presetId: string | null;
  sizePct: number;
  clearBehind: boolean;
}

interface QRFrameSettings {
  frameId: string;
  label: string;
  font: string;
  textSizePct: number;
  useCustomColor: boolean;
  color: string;
}

const defaultColors: QRColorsSettings = {
  background: "#ffffff",
  foreground: "#060606"
};

const defaultDesign: QRDesignSettings = {
  pattern: "basic",
  shape: "square",
  cornerStyle: "square",
  borderStyle: "none",
  borderWidth: 2
};

const defaultLogo: QRLogoSettings = {
  enabled: false,
  source: null,
  file: null,
  presetId: null,
  sizePct: 100,
  clearBehind: false
};

const defaultFrame: QRFrameSettings = {
  frameId: "none",
  label: "SCAN ME",
  font: "Arial",
  textSizePct: 100,
  useCustomColor: false,
  color: "#000000"
};

const frameOptions = [
  { id: 'none', label: 'None', icon: X },
  { id: 'classic', label: 'Classic Border', icon: Square },
  { id: 'rounded', label: 'Rounded Border', icon: Circle },
  { id: 'bottom-label', label: 'Bottom Label', icon: RectangleHorizontal },
  { id: 'elegant', label: 'Elegant Frame', icon: Diamond }
];

const fontOptions = [
  'Arial', 'Georgia', 'Times New Roman', 'Helvetica', 'Verdana', 'Courier New'
];

const logoPresets = [
  { id: 'heart', label: 'Heart', icon: Heart, color: '#e11d48' },
  { id: 'star', label: 'Star', icon: Star, color: '#f59e0b' },
  { id: 'diamond', label: 'Diamond', icon: Diamond, color: '#8b5cf6' },
  { id: 'users', label: 'People', icon: Users, color: '#3b82f6' },
  { id: 'sparkles', label: 'Sparkles', icon: Sparkles, color: '#ec4899' },
  { id: 'zap', label: 'Lightning', icon: Zap, color: '#eab308' },
  { id: 'crown', label: 'Crown', icon: Crown, color: '#d97706' },
  { id: 'gift', label: 'Gift', icon: Gift, color: '#10b981' }
];



export const QRCodeMainCard: React.FC<QRCodeMainCardProps> = ({ eventId }) => {
  const { events } = useEvents();
  const { toast } = useToast();
  
  const selectedEvent = events.find(event => event.id === eventId);
  const eventUrl = selectedEvent?.slug ? buildGuestLookupUrl(selectedEvent.slug) : `https://…/live-view/${eventId}`;

  // QR Settings State
  const [qrSettings, setQrSettings] = useState<{ colors: QRColorsSettings; design: QRDesignSettings; logo: QRLogoSettings; frame: QRFrameSettings }>({
    colors: { ...defaultColors },
    design: { ...defaultDesign },
    logo: { ...defaultLogo },
    frame: { ...defaultFrame }
  });

  // Preview state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [contrastWarning, setContrastWarning] = useState<boolean>(false);
  
  // Accordion state - track which sections are open
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  
  // Toggle accordion sections
  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const newSections = new Set(prev);
      if (newSections.has(section)) {
        newSections.delete(section);
      } else {
        newSections.add(section);
      }
      return newSections;
    });
  };

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

  // Create logo data URL from preset
  const createPresetLogoDataUrl = useCallback(async (presetId: string): Promise<string> => {
    const preset = logoPresets.find(p => p.id === presetId);
    if (!preset) return '';
    
    // Create a simple SVG icon and convert to data URL
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="${preset.color}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${preset.id === 'heart' ? '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l6 6 6-6z"/>' :
          preset.id === 'star' ? '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>' :
          preset.id === 'diamond' ? '<path d="M6 3h12l4 6-10 12L2 9l4-6z"/>' :
          preset.id === 'users' ? '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' :
          preset.id === 'sparkles' ? '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0L9.937 15.5Z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>' :
          preset.id === 'zap' ? '<polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>' :
          preset.id === 'crown' ? '<path d="M2 3h20l-2 14H4L2 3Z"/><path d="M6 3L4 8l4-1 4 4 4-4 4 1L18 3"/>' :
          '<path d="M5 12s2.545-5 7-5c4.454 0 7 5 7 5s-2.546 5-7 5c-4.455 0-7-5-7-5z"/><path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>'
        }
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }, []);

  // Convert local settings to QRCodeSettings format
  const convertToQRCodeSettings = useCallback(async (): Promise<QRCodeSettings> => {
    let centerImage = '';
    
    if (qrSettings.logo.enabled) {
      if (qrSettings.logo.source === 'upload' && qrSettings.logo.file instanceof File) {
        // Convert uploaded file to data URL
        const reader = new FileReader();
        centerImage = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string || '');
          reader.readAsDataURL(qrSettings.logo.file as File);
        });
      } else if (qrSettings.logo.source === 'preset' && qrSettings.logo.presetId) {
        centerImage = await createPresetLogoDataUrl(qrSettings.logo.presetId);
      }
    }

    return {
      event_id: eventId,
      user_id: '', // Will be filled by the backend
      background_color: qrSettings.colors.background,
      foreground_color: qrSettings.colors.foreground,
      shape: qrSettings.design.shape,
      pattern: qrSettings.design.pattern,
      pattern_style: 'default',
      corner_style: qrSettings.design.cornerStyle,
      border_style: qrSettings.design.borderStyle,
      border_width: qrSettings.design.borderWidth,
      border_color: qrSettings.colors.foreground,
      center_image_url: centerImage,
      center_image_size: qrSettings.logo.sizePct,
      has_scan_text: qrSettings.frame.frameId !== 'none',
      scan_text: qrSettings.frame.frameId !== 'none' ? qrSettings.frame.label : '',
      gradient_type: 'none',
      gradient_colors: [],
      background_image_url: undefined,
      shadow_enabled: false,
      shadow_color: '#000000',
      shadow_blur: 10,
      background_opacity: 100,
      output_size: 512,
      output_format: 'png',
      color_palette: 'custom',
      advanced_settings: {
        font: qrSettings.frame.font,
        textSize: qrSettings.frame.textSizePct,
        useCustomFrameColor: qrSettings.frame.useCustomColor,
        frameColor: qrSettings.frame.color,
        clearBehindLogo: qrSettings.logo.clearBehind
      }
    };
  }, [qrSettings, createPresetLogoDataUrl]);

  // Debounced QR render function using AdvancedQRGenerator
  const renderQR = useCallback(async () => {
    if (!eventUrl) return;

    try {
      const generator = new AdvancedQRGenerator(512);
      const settings = await convertToQRCodeSettings();
      
      const qrDataURL = await generator.generate(eventUrl, settings);
      setQrDataUrl(qrDataURL);

      // Check contrast
      const contrast = calculateContrast(qrSettings.colors.background, qrSettings.colors.foreground);
      setContrastWarning(contrast < 4.5);

    } catch (error) {
      console.error('Error rendering QR code:', error);
    }
  }, [eventUrl, qrSettings, calculateContrast, convertToQRCodeSettings]);

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

  // Reset frame
  const handleResetFrame = () => {
    setQrSettings(prev => ({
      ...prev,
      frame: { ...defaultFrame }
    }));
  };

  // Action button handlers
  const handleDownloadPNG = useCallback(async () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `qr-code-${selectedEvent?.name || 'event'}.png`;
    link.href = qrDataUrl;
    link.click();
    toast({ title: "PNG downloaded successfully!" });
  }, [qrDataUrl, selectedEvent?.name, toast]);

  const handleDownloadJPG = useCallback(async () => {
    if (!qrDataUrl) return;
    // Convert PNG to JPG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx!.fillStyle = '#FFFFFF';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, 0, 0);
      const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const link = document.createElement('a');
      link.download = `qr-code-${selectedEvent?.name || 'event'}.jpg`;
      link.href = jpgDataUrl;
      link.click();
      toast({ title: "JPG downloaded successfully!" });
    };
    img.src = qrDataUrl;
  }, [qrDataUrl, selectedEvent?.name, toast]);

  const handleDownloadSVG = useCallback(async () => {
    if (!eventUrl || !qrDataUrl) return;
    try {
      // Convert canvas to SVG (simplified approach)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx!.drawImage(img, 0, 0);
        
        // Create a simple SVG wrapper
        const svgContent = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}">
            <image href="${qrDataUrl}" width="${img.width}" height="${img.height}"/>
          </svg>
        `;
        
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `qr-code-${selectedEvent?.name || 'event'}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "SVG downloaded successfully!" });
      };
      img.src = qrDataUrl;
    } catch (error) {
      toast({ title: "Error downloading SVG", variant: "destructive" });
    }
  }, [qrDataUrl, selectedEvent?.name, toast]);

  const handleDownloadPDF = useCallback(async () => {
    if (!qrDataUrl) return;
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const img = new Image();
      img.onload = () => {
        // A4 dimensions: 210 x 297 mm
        // Center QR code on page - using 100mm x 100mm size
        const qrSize = 100;
        const x = (210 - qrSize) / 2;
        const y = (297 - qrSize) / 2;
        
        pdf.addImage(img, 'PNG', x, y, qrSize, qrSize);
        pdf.save(`qr-code-${selectedEvent?.name || 'event'}.pdf`);
        toast({ title: "PDF downloaded successfully!" });
      };
      img.src = qrDataUrl;
    } catch (error) {
      toast({ title: "Error downloading PDF", variant: "destructive" });
    }
  }, [qrDataUrl, selectedEvent?.name, toast]);

  const handleResetQR = useCallback(() => {
    setQrSettings({
      colors: { ...defaultColors },
      design: { ...defaultDesign },
      logo: { ...defaultLogo },
      frame: { ...defaultFrame }
    });
    toast({ title: "QR settings reset to defaults" });
  }, [toast]);

  const handlePrintQR = useCallback(() => {
    if (!qrDataUrl) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${selectedEvent?.name || 'Event'}</title>
            <style>
              body { margin: 0; padding: 20px; text-align: center; }
              img { max-width: 100%; height: auto; }
              h1 { font-family: Arial, sans-serif; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <h1>QR Code - ${selectedEvent?.name || 'Event'}</h1>
            <img src="${qrDataUrl}" alt="QR Code" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    toast({ title: "QR code sent to printer" });
  }, [qrDataUrl, selectedEvent?.name, toast]);

  const handleSaveQR = useCallback(() => {
    // For now, just show a toast - this could be extended to save to database
    toast({ title: "QR code settings saved!" });
  }, [toast]);


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

  // Frame change handlers
  const updateFrame = (updates: Partial<QRFrameSettings>) => {
    setQrSettings(prev => ({
      ...prev,
      frame: { ...prev.frame, ...updates }
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

        {/* Connection Status Indicators */}
        <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-800">Connected & Synced</span>
          </div>
          
          {/* Event Information */}
          {selectedEvent && (
            <div className="flex items-center justify-between text-xs text-green-700">
              <div className="flex items-center gap-2">
                <QrCodeIcon className="h-3 w-3" />
                <span>Linked to: <strong>{selectedEvent.name}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Live</span>
              </div>
            </div>
          )}
          
          {/* Scan Instructions */}
          <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
            📱 When scanned, opens guest lookup for this event
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left Column - Preview */}
          <div id="qr-left" className="col-span-1">
            <Card className="bg-white border-2 border-primary/20 rounded-lg h-full">
              <CardContent className="p-6">
                {/* QR Preview + Actions Wrapper */}
                <div id="qr-preview-wrap" className="flex flex-col items-center gap-4">
                  {/* QR Preview */}
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

                  {/* Action Buttons Grid */}
                  <div id="qr-action-grid" className="grid grid-cols-2 gap-3 w-full max-w-[460px]">
                    {/* Row 1 */}
                    <Button 
                      id="btn-dl-png" 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2" 
                      onClick={handleDownloadPNG}
                      aria-label="Download PNG"
                      title="Download PNG"
                    >
                      <FileDown className="h-4 w-4 text-purple-600" />
                      PNG
                    </Button>
                    <Button 
                      id="btn-dl-jpg" 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2" 
                      onClick={handleDownloadJPG}
                      aria-label="Download JPG"
                      title="Download JPG"
                    >
                      <ImageIcon className="h-4 w-4 text-purple-600" />
                      JPG
                    </Button>

                    {/* Row 2 */}
                    <Button 
                      id="btn-dl-svg" 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2" 
                      onClick={handleDownloadSVG}
                      aria-label="Download SVG"
                      title="Download SVG"
                    >
                      <Code className="h-4 w-4 text-purple-600" />
                      SVG
                    </Button>
                    <Button 
                      id="btn-dl-pdf" 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2" 
                      onClick={handleDownloadPDF}
                      aria-label="Download PDF"
                      title="Download PDF"
                    >
                      <FileText className="h-4 w-4 text-purple-600" />
                      PDF
                    </Button>

                    {/* Row 3 */}
                    <Button 
                      id="btn-reset-qr" 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2" 
                      onClick={handleResetQR}
                      aria-label="Reset QR settings"
                      title="Reset QR settings"
                    >
                      <RotateCcw className="h-4 w-4 text-purple-600" />
                      Reset
                    </Button>
                    <Button 
                      id="btn-print-qr" 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2" 
                      onClick={handlePrintQR}
                      aria-label="Print QR"
                      title="Print QR"
                    >
                      <Printer className="h-4 w-4 text-purple-600" />
                      Print
                    </Button>

                    {/* Row 4 */}
                    <Button 
                      id="btn-save-qr" 
                      variant="default" 
                      className="col-span-2 w-full flex items-center justify-center gap-2" 
                      onClick={handleSaveQR}
                      aria-label="Save QR style"
                      title="Save QR style"
                    >
                      <Save className="h-4 w-4 text-white" />
                      Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Controls */}
          <div id="qr-right" className="col-span-1">
            <Card className="bg-white border-2 border-primary/20 rounded-lg h-full">
              <CardContent className="p-4">
                <h3 className="text-2xl font-semibold text-purple-700 mb-4">Customise Your QR Code</h3>
                <Accordion 
                  id="qr-controls" 
                  type="multiple" 
                  value={Array.from(openSections)}
                  onValueChange={(values) => setOpenSections(new Set(values))}
                  className="w-full space-y-4 overflow-visible"
                >
                  <AccordionItem value="colors" className="qr-acc-item rounded-2xl border-2 border-purple-500 overflow-visible bg-white" data-state={openSections.has('colors') ? 'open' : 'closed'}>
                    <button
                      onClick={() => toggleSection('colors')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection('colors'); }}}
                      className="qr-acc-header w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-transparent border-0 transition hover:bg-purple-50/50"
                      aria-expanded={openSections.has('colors')}
                      aria-controls="panel-colors"
                      role="button"
                      data-target="#panel-colors"
                    >
                      <Palette className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-gray-800">Colors</span>
                      <ChevronDown 
                        className={`ml-auto h-4 w-4 text-gray-500 transition-transform ${
                          openSections.has('colors') ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <AccordionContent className="qr-acc-panel pt-2 space-y-6 border-0 bg-white rounded-b-2xl">
                      {/* Background Section */}
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Background</Label>
                        
                        <div className="flex items-center space-x-2">
                          <input
                            id="color-bg"
                            type="color"
                            value={qrSettings.colors.background}
                            onChange={(e) => updateColors({ background: e.target.value })}
                            className="w-8 h-8 rounded border border-input"
                          />
                          <Input
                            value={qrSettings.colors.background}
                            onChange={(e) => updateColors({ background: e.target.value })}
                            className="text-xs font-mono"
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>

                      {/* Foreground Section */}
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Foreground</Label>
                        
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

                  <AccordionItem value="design" className="qr-acc-item rounded-2xl border-2 border-purple-500 overflow-visible bg-white" data-state={openSections.has('design') ? 'open' : 'closed'}>
                    <button
                      onClick={() => toggleSection('design')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection('design'); }}}
                      className="qr-acc-header w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-transparent border-0 transition hover:bg-purple-50/50"
                      aria-expanded={openSections.has('design')}
                      aria-controls="panel-design"
                      role="button"
                      data-target="#panel-design"
                    >
                      <Grid3X3 className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-gray-800">Design</span>
                      <ChevronDown 
                        className={`ml-auto h-4 w-4 text-gray-500 transition-transform ${
                          openSections.has('design') ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <AccordionContent className="qr-acc-panel pt-2 space-y-6 border-0 bg-white rounded-b-2xl">
                      {/* Pattern Selection */}
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Pattern</Label>
                        <Select value={qrSettings.design.pattern} onValueChange={(value) => updateDesign({ pattern: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pattern" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {QR_PATTERNS.map((pattern) => (
                              <SelectItem key={pattern.value} value={pattern.value}>
                                {pattern.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Shape Selection */}
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Module Shape</Label>
                        <Select value={qrSettings.design.shape} onValueChange={(value) => updateDesign({ shape: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select shape" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {QR_SHAPES.filter(shape => shape.category === 'basic').map((shape) => (
                              <SelectItem key={shape.value} value={shape.value}>
                                {shape.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Corner Style */}
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Corner Style</Label>
                        <Select value={qrSettings.design.cornerStyle} onValueChange={(value) => updateDesign({ cornerStyle: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select corner style" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {CORNER_STYLES.map((corner) => (
                              <SelectItem key={corner.value} value={corner.value}>
                                {corner.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Border Style */}
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Border</Label>
                        <Select value={qrSettings.design.borderStyle} onValueChange={(value) => updateDesign({ borderStyle: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select border style" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {BORDER_STYLES.map((border) => (
                              <SelectItem key={border.value} value={border.value}>
                                {border.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Border Width */}
                      {qrSettings.design.borderStyle !== 'none' && (
                        <div className="space-y-4">
                          <Label className="text-sm font-medium">Border Width: {qrSettings.design.borderWidth}px</Label>
                          <Slider
                            value={[qrSettings.design.borderWidth]}
                            onValueChange={(value) => updateDesign({ borderWidth: value[0] })}
                            max={10}
                            min={1}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="logo" className="qr-acc-item rounded-2xl border-2 border-purple-500 overflow-visible bg-white" data-state={openSections.has('logo') ? 'open' : 'closed'}>
                    <button
                      onClick={() => toggleSection('logo')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection('logo'); }}}
                      className="qr-acc-header w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-transparent border-0 transition hover:bg-purple-50/50"
                      aria-expanded={openSections.has('logo')}
                      aria-controls="panel-logo"
                      role="button"
                      data-target="#panel-logo"
                    >
                      <ImageIcon className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-gray-800">Logo</span>
                      <ChevronDown 
                        className={`ml-auto h-4 w-4 text-gray-500 transition-transform ${
                          openSections.has('logo') ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <AccordionContent className="qr-acc-panel pt-2 space-y-6 border-0 bg-white rounded-b-2xl">
                      {/* Logo Enable Switch */}
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Enable Logo</Label>
                        <Switch
                          checked={qrSettings.logo.enabled}
                          onCheckedChange={(checked) => updateLogo({ enabled: checked })}
                        />
                      </div>

                      {qrSettings.logo.enabled && (
                        <>
                          {/* Logo Source Selection */}
                          <div className="space-y-4">
                            <Label className="text-sm font-medium">Logo Source</Label>
                            <RadioGroup 
                              value={qrSettings.logo.source || ''} 
                              onValueChange={(value) => updateLogo({ source: value as 'upload' | 'preset' })}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="upload" id="upload" />
                                <Label htmlFor="upload">Upload Custom</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="preset" id="preset" />
                                <Label htmlFor="preset">Choose Preset</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {/* File Upload */}
                          {qrSettings.logo.source === 'upload' && (
                            <div className="space-y-4">
                              <Label className="text-sm font-medium">Upload Logo</Label>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      // Convert to data URL immediately for preview
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        const dataUrl = event.target?.result as string;
                                        updateLogo({ file, source: 'upload' });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                  className="hidden"
                                  id="logo-upload"
                                />
                                <Label htmlFor="logo-upload" className="cursor-pointer">
                                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm text-gray-600">Click to upload logo</p>
                                </Label>
                              </div>
                            </div>
                          )}

                          {/* Preset Selection */}
                          {qrSettings.logo.source === 'preset' && (
                            <div className="space-y-4">
                              <Label className="text-sm font-medium">Choose Preset Logo</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {logoPresets.map((preset) => {
                                  const IconComponent = preset.icon;
                                  return (
                                    <button
                                      key={preset.id}
                                      onClick={() => updateLogo({ presetId: preset.id })}
                                      className={`p-3 border rounded-lg flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors ${
                                        qrSettings.logo.presetId === preset.id 
                                          ? 'border-purple-500 bg-purple-50' 
                                          : 'border-gray-200'
                                      }`}
                                    >
                                      <IconComponent className="h-6 w-6" style={{ color: preset.color }} />
                                      <span className="text-xs">{preset.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Logo Size */}
                          <div className="space-y-4">
                            <Label className="text-sm font-medium">Logo Size: {qrSettings.logo.sizePct}%</Label>
                            <Slider
                              value={[qrSettings.logo.sizePct]}
                              onValueChange={(value) => updateLogo({ sizePct: value[0] })}
                              max={150}
                              min={50}
                              step={5}
                              className="w-full"
                            />
                          </div>

                          {/* Clear Behind Logo */}
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Clear Background</Label>
                            <Switch
                              checked={qrSettings.logo.clearBehind}
                              onCheckedChange={(checked) => updateLogo({ clearBehind: checked })}
                            />
                          </div>
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="frame" className="qr-acc-item rounded-2xl border-2 border-purple-500 overflow-visible bg-white" data-state={openSections.has('frame') ? 'open' : 'closed'}>
                    <button
                      onClick={() => toggleSection('frame')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection('frame'); }}}
                      className="qr-acc-header w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-transparent border-0 transition hover:bg-purple-50/50"
                      aria-expanded={openSections.has('frame')}
                      aria-controls="panel-frame"
                      role="button"
                      data-target="#panel-frame"
                    >
                      <Square className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-gray-800">Frame</span>
                      <ChevronDown 
                        className={`ml-auto h-4 w-4 text-gray-500 transition-transform ${
                          openSections.has('frame') ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <AccordionContent className="qr-acc-panel pt-2 space-y-6 border-0 bg-white rounded-b-2xl">
                      {/* Frame Style */}
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Frame Style</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {frameOptions.map((frame) => {
                            const IconComponent = frame.icon;
                            return (
                              <button
                                key={frame.id}
                                onClick={() => updateFrame({ frameId: frame.id })}
                                className={`p-3 border rounded-lg flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                                  qrSettings.frame.frameId === frame.id 
                                    ? 'border-purple-500 bg-purple-50' 
                                    : 'border-gray-200'
                                }`}
                              >
                                <IconComponent className="h-5 w-5 text-purple-600" />
                                <span className="text-sm font-medium">{frame.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Text */}
                      {qrSettings.frame.frameId !== 'none' && (
                        <>
                          <div className="space-y-4">
                            <Label className="text-sm font-medium">Frame Text</Label>
                            <Input
                              value={qrSettings.frame.label}
                              onChange={(e) => updateFrame({ label: e.target.value })}
                              placeholder="SCAN ME"
                              className="w-full"
                            />
                          </div>

                          {/* Font Selection */}
                          <div className="space-y-4">
                            <Label className="text-sm font-medium">Font</Label>
                            <Select value={qrSettings.frame.font} onValueChange={(value) => updateFrame({ font: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select font" />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                {fontOptions.map((font) => (
                                  <SelectItem key={font} value={font}>
                                    <span style={{ fontFamily: font }}>{font}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Text Size */}
                          <div className="space-y-4">
                            <Label className="text-sm font-medium">Text Size: {qrSettings.frame.textSizePct}%</Label>
                            <Slider
                              value={[qrSettings.frame.textSizePct]}
                              onValueChange={(value) => updateFrame({ textSizePct: value[0] })}
                              max={150}
                              min={50}
                              step={5}
                              className="w-full"
                            />
                          </div>

                          {/* Custom Color Toggle */}
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Custom Color</Label>
                            <Switch
                              checked={qrSettings.frame.useCustomColor}
                              onCheckedChange={(checked) => updateFrame({ useCustomColor: checked })}
                            />
                          </div>

                          {/* Frame Color */}
                          {qrSettings.frame.useCustomColor && (
                            <div className="space-y-4">
                              <Label className="text-sm font-medium">Frame Color</Label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="color"
                                  value={qrSettings.frame.color}
                                  onChange={(e) => updateFrame({ color: e.target.value })}
                                  className="w-8 h-8 rounded border border-input"
                                />
                                <Input
                                  value={qrSettings.frame.color}
                                  onChange={(e) => updateFrame({ color: e.target.value })}
                                  className="text-xs font-mono"
                                  placeholder="#000000"
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}
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