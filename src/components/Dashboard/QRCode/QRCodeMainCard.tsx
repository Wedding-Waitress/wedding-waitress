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
import { QrCode as QrCodeIcon, Copy, Download, RotateCcw, Save, Printer, FileImage, Upload, RotateCw, Twitter, Instagram, Mail, MapPin, Phone, MessageCircle, Video, Wifi, Globe, Youtube, CreditCard, Bitcoin, X, Square, Circle, RectangleHorizontal, RectangleVertical, Trophy, Ticket, Tag, Palette, Grid3X3, Image as ImageIcon, ChevronDown, FileDown, Code, FileText } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { buildGuestLookupUrl } from '@/lib/urlUtils';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { PATTERN_DEFS } from '@/lib/qrPatternDefinitions';
import { FINDER_BORDER_DEFS, FINDER_CENTER_DEFS } from '@/lib/qrFinderDefinitions';
import { AdvancedQREngine } from '@/lib/advancedQREngine';
import { QRCodeSettings } from '@/hooks/useQRCodeSettings';

interface QRCodeMainCardProps {
  eventId: string;
}

interface QRColorsSettings {
  background: string;
  foreground: string;
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

const defaultFrame: QRFrameSettings = {
  frameId: "none",
  label: "SCAN ME",
  font: "AbrilFatface",
  textSizePct: 100,
  useCustomColor: false,
  color: "#000000"
};

const frameOptions = [
  { id: 'none', label: 'None', icon: X },
  { id: 'classic', label: 'Classic border', icon: Square },
  { id: 'rounded', label: 'Rounded border', icon: Circle },
  { id: 'bottomBar', label: 'Bottom label', icon: RectangleHorizontal },
  { id: 'topBar', label: 'Top label', icon: RectangleHorizontal },
  { id: 'ribbonTop', label: 'Ribbon (top)', icon: Trophy },
  { id: 'ribbonBottom', label: 'Ribbon (bottom)', icon: Trophy },
  { id: 'phone', label: 'Phone tag', icon: Phone },
  { id: 'ticket', label: 'Ticket', icon: Ticket },
  { id: 'tag', label: 'Tag', icon: Tag }
];

const fontOptions = [
  'AbrilFatface',
  'Inter',
  'Poppins',
  'Montserrat',
  'Playfair Display',
  'Lora',
  'Roboto'
];

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
  const [qrSettings, setQrSettings] = useState<{ colors: QRColorsSettings; design: QRDesignSettings; logo: QRLogoSettings; frame: QRFrameSettings }>({
    colors: { ...defaultColors },
    design: { ...defaultDesign },
    logo: { ...defaultLogo },
    frame: { ...defaultFrame }
  });

  // Initialize QR Engine
  const [qrEngine] = useState(() => new AdvancedQREngine(1024));

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

  // Debounced QR render function
  const renderQR = useCallback(async () => {
    if (!eventUrl) return;

    try {
      // Create settings for the advanced QR engine
      const qrEngineSettings = {
        background_color: qrSettings.colors.background,
        foreground_color: qrSettings.colors.foreground,
        pattern_style: qrSettings.design.patternId,
        design: {
          useCustomMarkerColors: qrSettings.design.useCustomMarkerColors,
          useDifferentMarkerColors: qrSettings.design.useDifferentMarkerColors,
          markerBorderColor: qrSettings.design.markerBorderColor,
          markerCenterColor: qrSettings.design.markerCenterColor,
          markers: qrSettings.design.markers
        }
      };

      // Generate high-quality SVG using advanced engine
      const svgString = await qrEngine.generateQR(eventUrl, qrEngineSettings);
      
      // Convert SVG to data URL for preview
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      // Create image from SVG for canvas rendering
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 400;
      canvas.height = 400;
      
      img.onload = () => {
        ctx.clearRect(0, 0, 400, 400);
        ctx.drawImage(img, 0, 0, 400, 400);
        const dataUrl = canvas.toDataURL('image/png');
        setQrDataUrl(dataUrl);
        URL.revokeObjectURL(svgUrl);
      };
      
      img.src = svgUrl;

      // Check contrast
      const contrast = calculateContrast(qrSettings.colors.background, qrSettings.colors.foreground);
      setContrastWarning(contrast < 4.5);

    } catch (error) {
      console.error('Error rendering QR code:', error);
      // Fallback to basic QR generation
      try {
        const qrDataURL = await QRCode.toDataURL(eventUrl, {
          width: 400,
          margin: 2,
          color: {
            dark: qrSettings.colors.foreground,
            light: qrSettings.colors.background
          }
        });
        setQrDataUrl(qrDataURL);
      } catch (fallbackError) {
        console.error('Fallback QR generation failed:', fallbackError);
      }
    }
  }, [eventUrl, qrSettings, calculateContrast, qrEngine]);

  // Debounced render effect with faster updates
  useEffect(() => {
    const timer = setTimeout(renderQR, 120);
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
    if (!eventUrl) return;
    try {
      // Generate QR first, then export
      await renderQR();
      const pngBlob = await qrEngine.exportAs('png', 0.9);
      const url = URL.createObjectURL(pngBlob);
      const link = document.createElement('a');
      link.download = `qr-code-${selectedEvent?.name || 'event'}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "PNG downloaded successfully!" });
    } catch (error) {
      console.error('PNG export error:', error);
      // Fallback to current method
      if (qrDataUrl) {
        const link = document.createElement('a');
        link.download = `qr-code-${selectedEvent?.name || 'event'}.png`;
        link.href = qrDataUrl;
        link.click();
        toast({ title: "PNG downloaded successfully!" });
      }
    }
  }, [eventUrl, selectedEvent?.name, toast, qrEngine, qrDataUrl, renderQR]);

  const handleDownloadJPG = useCallback(async () => {
    if (!eventUrl) return;
    try {
      // Generate QR first, then export
      await renderQR();
      const jpgBlob = await qrEngine.exportAs('jpeg', 0.9);
      const url = URL.createObjectURL(jpgBlob);
      const link = document.createElement('a');
      link.download = `qr-code-${selectedEvent?.name || 'event'}.jpg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "JPG downloaded successfully!" });
    } catch (error) {
      console.error('JPG export error:', error);
      // Fallback to current method
      if (qrDataUrl) {
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
      }
    }
  }, [eventUrl, selectedEvent?.name, toast, qrEngine, qrDataUrl, renderQR]);

  const handleDownloadSVG = useCallback(async () => {
    if (!eventUrl) return;
    try {
      // Generate settings for the QR engine first
      await renderQR();
      
      // Export using the advanced QR engine
      const svgBlob = await qrEngine.exportAs('svg');
      const url = URL.createObjectURL(svgBlob);
      const link = document.createElement('a');
      link.download = `qr-code-${selectedEvent?.name || 'event'}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "SVG downloaded successfully!" });
    } catch (error) {
      console.error('SVG export error:', error);
      toast({ title: "Error downloading SVG", variant: "destructive" });
    }
  }, [eventUrl, selectedEvent?.name, toast, qrEngine, renderQR]);

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
                    <AccordionContent className="qr-acc-panel pt-2 space-y-5 border-0 bg-white rounded-b-2xl">
                       {/* Pattern Section */}
                       <div className="space-y-3">
                         <Label className="text-sm font-medium">Pattern</Label>
                         <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                           {PATTERN_DEFS.map((pattern, i) => {
                             const isSelected = qrSettings.design.patternId === pattern.id;
                             return (
                               <button
                                 key={pattern.id}
                                 id={pattern.id}
                                 onClick={() => updateDesign({ patternId: pattern.id })}
                                 className={`w-14 h-14 min-w-12 min-h-12 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 hover:bg-purple-50 ${
                                   isSelected 
                                     ? 'border-2 border-purple-500 bg-purple-50' 
                                     : 'border border-gray-200 hover:border-purple-300'
                                 }`}
                                 title={pattern.label}
                                 aria-pressed={isSelected}
                               >
                                 <svg 
                                   viewBox="0 0 100 100" 
                                   className="w-full h-full p-1"
                                   fill="none"
                                   ref={(svgRef) => {
                                     if (svgRef && pattern.thumb) {
                                       // Clear previous content
                                       svgRef.innerHTML = '';
                                       pattern.thumb(svgRef);
                                     }
                                   }}
                                 />
                               </button>
                             );
                           })}
                         </div>
                       </div>

                       {/* Marker Border Section */}
                       <div className="space-y-3">
                         <Label className="text-sm font-medium">Marker border (finder outer shape)</Label>
                         <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                           {FINDER_BORDER_DEFS.map((borderDef) => {
                             const isSelected = qrSettings.design.markerBorderId === borderDef.id;
                             return (
                               <button
                                 key={borderDef.id}
                                 id={borderDef.id}
                                 onClick={() => updateDesign({ markerBorderId: borderDef.id })}
                                 className={`w-14 h-14 min-w-12 min-h-12 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 hover:bg-purple-50 ${
                                   isSelected 
                                     ? 'border-2 border-purple-500 bg-purple-50' 
                                     : 'border border-gray-200 hover:border-purple-300'
                                 }`}
                                 title={borderDef.label}
                                 aria-pressed={isSelected}
                               >
                                 <svg 
                                   viewBox="0 0 100 100" 
                                   className="w-full h-full p-2"
                                   fill="none"
                                   ref={(svgRef) => {
                                     if (svgRef && borderDef.thumb) {
                                       // Clear previous content
                                       svgRef.innerHTML = '';
                                       borderDef.thumb(svgRef);
                                     }
                                   }}
                                 />
                               </button>
                             );
                           })}
                         </div>
                       </div>

                       {/* Marker Center Section */}
                       <div className="space-y-3">
                         <Label className="text-sm font-medium">Marker center (finder inner shape)</Label>
                         <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                           {FINDER_CENTER_DEFS.map((centerDef) => {
                             const isSelected = qrSettings.design.markerCenterId === centerDef.id;
                             return (
                               <button
                                 key={centerDef.id}
                                 id={centerDef.id}
                                 onClick={() => updateDesign({ markerCenterId: centerDef.id })}
                                 className={`w-14 h-14 min-w-12 min-h-12 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 hover:bg-purple-50 ${
                                   isSelected 
                                     ? 'border-2 border-purple-500 bg-purple-50' 
                                     : 'border border-gray-200 hover:border-purple-300'
                                 }`}
                                 title={centerDef.label}
                                 aria-pressed={isSelected}
                               >
                                 <svg 
                                   viewBox="0 0 100 100" 
                                   className="w-full h-full p-3"
                                   fill="none"
                                   ref={(svgRef) => {
                                     if (svgRef && centerDef.thumb) {
                                       // Clear previous content
                                       svgRef.innerHTML = '';
                                       centerDef.thumb(svgRef);
                                     }
                                   }}
                                 />
                               </button>
                             );
                           })}
                         </div>
                       </div>

                      {/* Custom Marker Colors Section */}
                      <div className="space-y-4">
                        {/* Row 1: Global Marker Colors (side by side) */}
                        {qrSettings.design.useCustomMarkerColors && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Marker border</Label>
                              <div className="flex items-center space-x-2">
                                <input
                                  id="color-marker-border"
                                  type="color"
                                  value={qrSettings.design.markerBorderColor}
                                  onChange={(e) => updateDesign({ markerBorderColor: e.target.value })}
                                  className="w-8 h-8 rounded border border-input"
                                />
                                <Input
                                  value={qrSettings.design.markerBorderColor}
                                  onChange={(e) => updateDesign({ markerBorderColor: e.target.value })}
                                  className="text-xs font-mono"
                                  placeholder="#000000"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Marker center</Label>
                              <div className="flex items-center space-x-2">
                                <input
                                  id="color-marker-center"
                                  type="color"
                                  value={qrSettings.design.markerCenterColor}
                                  onChange={(e) => updateDesign({ markerCenterColor: e.target.value })}
                                  className="w-8 h-8 rounded border border-input"
                                />
                                <Input
                                  value={qrSettings.design.markerCenterColor}
                                  onChange={(e) => updateDesign({ markerCenterColor: e.target.value })}
                                  className="text-xs font-mono"
                                  placeholder="#000000"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Row 2: Toggle Controls */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="toggle-custom-marker-color"
                              checked={qrSettings.design.useCustomMarkerColors}
                              onCheckedChange={(checked) => updateDesign({ useCustomMarkerColors: checked })}
                            />
                            <Label htmlFor="toggle-custom-marker-color" className="text-sm">Custom marker color</Label>
                          </div>

                          {qrSettings.design.useCustomMarkerColors && (
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="toggle-different-marker-colors"
                                checked={qrSettings.design.useDifferentMarkerColors}
                                onCheckedChange={(checked) => updateDesign({ useDifferentMarkerColors: checked })}
                              />
                              <Label htmlFor="toggle-different-marker-colors" className="text-sm">Different markers colors</Label>
                            </div>
                          )}
                        </div>

                        {/* Row 3: Per-Marker Overrides (only when both toggles are ON) */}
                        {qrSettings.design.useCustomMarkerColors && qrSettings.design.useDifferentMarkerColors && (
                          <div className="grid grid-cols-2 gap-6">
                            {/* Left Column: Marker border overrides */}
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Marker border overrides</Label>
                              
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Top Right</Label>
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
                                      className="w-6 h-6 rounded border border-input"
                                    />
                                    <Input
                                      value={qrSettings.design.markers.TR.border}
                                      onChange={(e) => updateDesign({ 
                                        markers: { 
                                          ...qrSettings.design.markers, 
                                          TR: { ...qrSettings.design.markers.TR, border: e.target.value }
                                        }
                                      })}
                                      className="text-xs font-mono"
                                      placeholder="#000000"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Bottom Left</Label>
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
                                      className="w-6 h-6 rounded border border-input"
                                    />
                                    <Input
                                      value={qrSettings.design.markers.BL.border}
                                      onChange={(e) => updateDesign({ 
                                        markers: { 
                                          ...qrSettings.design.markers, 
                                          BL: { ...qrSettings.design.markers.BL, border: e.target.value }
                                        }
                                      })}
                                      className="text-xs font-mono"
                                      placeholder="#000000"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Right Column: Marker center overrides */}
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Marker center overrides</Label>
                              
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Top Right</Label>
                                  <div className="flex items-center space-x-2">
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
                                      className="w-6 h-6 rounded border border-input"
                                    />
                                    <Input
                                      value={qrSettings.design.markers.TR.center}
                                      onChange={(e) => updateDesign({ 
                                        markers: { 
                                          ...qrSettings.design.markers, 
                                          TR: { ...qrSettings.design.markers.TR, center: e.target.value }
                                        }
                                      })}
                                      className="text-xs font-mono"
                                      placeholder="#000000"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Bottom Left</Label>
                                  <div className="flex items-center space-x-2">
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
                                      className="w-6 h-6 rounded border border-input"
                                    />
                                    <Input
                                      value={qrSettings.design.markers.BL.center}
                                      onChange={(e) => updateDesign({ 
                                        markers: { 
                                          ...qrSettings.design.markers, 
                                          BL: { ...qrSettings.design.markers.BL, center: e.target.value }
                                        }
                                      })}
                                      className="text-xs font-mono"
                                      placeholder="#000000"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
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
                      {/* Frame Picker */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Frame Style</Label>
                        <div className="grid grid-cols-5 gap-2">
                          {frameOptions.map((option) => {
                            const Icon = option.icon;
                            const isSelected = qrSettings.frame.frameId === option.id;
                            return (
                              <button
                                key={option.id}
                                id={option.id}
                                onClick={() => updateFrame({ frameId: option.id })}
                                className={`aspect-square w-full border-2 rounded-md p-3 hover:border-primary/50 transition-colors ${
                                  isSelected ? 'border-primary bg-primary/10' : 'border-muted'
                                } ${option.id === 'none' ? 'bg-red-50' : 'bg-white'}`}
                                title={option.label}
                              >
                                <Icon 
                                  className="w-full h-full" 
                                  style={{ color: option.id === 'none' ? '#DC2626' : '#000000' }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Label & Font */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="frame-label" className="text-sm font-medium">Frame label</Label>
                          <Input
                            id="frame-label"
                            value={qrSettings.frame.label}
                            onChange={(e) => updateFrame({ label: e.target.value })}
                            placeholder="SCAN ME"
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="frame-font" className="text-sm font-medium">Label font</Label>
                          <Select
                            value={qrSettings.frame.font}
                            onValueChange={(value) => updateFrame({ font: value })}
                          >
                            <SelectTrigger id="frame-font">
                              <SelectValue placeholder="Select font" />
                            </SelectTrigger>
                            <SelectContent>
                              {fontOptions.map((font) => (
                                <SelectItem key={font} value={font}>
                                  {font}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Text Size Slider */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Text size: {qrSettings.frame.textSizePct}%</Label>
                        <Slider
                          id="frame-text-size"
                          value={[qrSettings.frame.textSizePct]}
                          onValueChange={([value]) => updateFrame({ textSizePct: value })}
                          min={0}
                          max={150}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      {/* Color Controls */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="toggle-frame-color"
                            checked={qrSettings.frame.useCustomColor}
                            onCheckedChange={(checked) => updateFrame({ useCustomColor: checked })}
                          />
                          <Label htmlFor="toggle-frame-color" className="text-sm">Custom frame color</Label>
                        </div>

                        {qrSettings.frame.useCustomColor && (
                          <div className="space-y-2 ml-6">
                            <Label htmlFor="frame-color" className="text-sm font-medium">Frame color</Label>
                            <div className="flex items-center space-x-2">
                              <input
                                id="frame-color"
                                type="color"
                                value={qrSettings.frame.color}
                                onChange={(e) => updateFrame({ color: e.target.value })}
                                className="w-8 h-8 rounded border border-input cursor-pointer"
                              />
                              <Input
                                value={qrSettings.frame.color}
                                onChange={(e) => updateFrame({ color: e.target.value })}
                                placeholder="#000000"
                                className="flex-1 font-mono text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Reset Button */}
                      <div className="pt-2">
                        <Button
                          id="btn-reset-frame"
                          variant="ghost"
                          size="sm"
                          onClick={handleResetFrame}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Reset Frame
                        </Button>
                      </div>
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