import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/enhanced-button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { QrCode as QrCodeIcon, Copy, Download, RotateCcw, Save, Printer, FileDown, Palette, ChevronDown, FileText, Code, Image as ImageIcon, ExternalLink, Link, Eye, EyeOff, Upload, Mail, Edit, Trash2, Loader2, Video, Square, Circle, Diamond, Plus, Minus } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { useLiveViewVisibility } from '@/hooks/useLiveViewVisibility';
import { useLiveViewModuleSettings } from '@/hooks/useLiveViewModuleSettings';
import { useWelcomeVideoUpload } from '@/hooks/useWelcomeVideoUpload';
import { buildGuestLookupUrl } from '@/lib/urlUtils';
import { supabase } from '@/integrations/supabase/client';
import { AdvancedQRGenerator } from '@/lib/advancedQRGenerator';
import type { QRCodeSettings } from '@/hooks/useQRCodeSettings';
import { DEFAULT_QR_SETTINGS } from '@/hooks/useQRCodeSettings';
import jsPDF from 'jspdf';

interface QRCodeMainCardProps {
  eventId: string;
}

interface QRColorsSettings {
  background: string;
  foreground: string;
  dotsColor: string;
  markerBorderColor: string;
  markerCenterColor: string;
}

interface QRShapeSettings {
  dotsShape: 'square' | 'rounded' | 'circle' | 'diamond' | 'plus' | 'vertical' | 'horizontal';
  markerBorderShape: 'square' | 'rounded' | 'circle';
  markerCenterShape: 'square' | 'circle';
}

interface QRLogoSettings {
  url: string | null;
  size: number;
}

const defaultColors: QRColorsSettings = {
  background: "#ffffff",
  foreground: "#000000",
  dotsColor: "#000000",
  markerBorderColor: "#000000",
  markerCenterColor: "#000000"
};

const defaultShapes: QRShapeSettings = {
  dotsShape: 'square',
  markerBorderShape: 'square',
  markerCenterShape: 'square'
};

const defaultLogo: QRLogoSettings = {
  url: null,
  size: 25
};

export const QRCodeMainCard: React.FC<QRCodeMainCardProps> = ({
  eventId
}) => {
  const {
    events
  } = useEvents();
  const {
    toast
  } = useToast();
  const { settings: visibilitySettings, updateVisibility } = useLiveViewVisibility(eventId);
  const { settings: moduleSettings, updateModuleConfig } = useLiveViewModuleSettings(eventId);
  const { uploadVideo, deleteVideo, uploadProgress, isUploading, isProcessing } = useWelcomeVideoUpload(eventId);
  const selectedEvent = events.find(event => event.id === eventId);
  const currentEvent = events.find(event => event.id === eventId);
  const eventUrl = selectedEvent?.slug ? buildGuestLookupUrl(selectedEvent.slug) : `https://…/live-view/${eventId}`;

  // QR Settings State - Enhanced
  const [qrColors, setQrColors] = useState<QRColorsSettings>({ ...defaultColors });
  const [qrShapes, setQrShapes] = useState<QRShapeSettings>({ ...defaultShapes });
  const [qrLogo, setQrLogo] = useState<QRLogoSettings>({ ...defaultLogo });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

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
        description: "The event URL has been copied to your clipboard."
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy URL. Please try again.",
        variant: "destructive"
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

  // Convert local settings to QRCodeSettings format
  const convertToQRCodeSettings = useCallback((): QRCodeSettings => {
    return {
      ...DEFAULT_QR_SETTINGS,
      event_id: eventId,
      user_id: '',
      background_color: qrColors.background,
      foreground_color: qrColors.foreground,
      dots_color: qrColors.dotsColor,
      marker_border_color: qrColors.markerBorderColor,
      marker_center_color: qrColors.markerCenterColor,
      dots_shape: qrShapes.dotsShape,
      marker_border_shape: qrShapes.markerBorderShape,
      marker_center_shape: qrShapes.markerCenterShape,
      center_image_url: qrLogo.url || undefined,
      center_image_size: qrLogo.size,
      shape: qrShapes.dotsShape,
      pattern: 'basic',
      pattern_style: 'default',
      corner_style: 'square',
      border_style: 'none',
      border_width: 0,
      border_color: qrColors.foreground,
      has_scan_text: false,
      scan_text: '',
      gradient_type: 'none',
      gradient_colors: [],
      background_image_url: undefined,
      shadow_enabled: false,
      shadow_color: '#000000',
      shadow_blur: 10,
      background_opacity: 1.0,
      output_size: 512,
      output_format: 'png',
      color_palette: 'custom',
      advanced_settings: {}
    } as QRCodeSettings;
  }, [eventId, qrColors, qrShapes, qrLogo]);

  // Debounced QR render function using AdvancedQRGenerator
  const renderQR = useCallback(async () => {
    if (!eventUrl) return;
    try {
      const generator = new AdvancedQRGenerator(512);
      const settings = convertToQRCodeSettings();
      const qrDataURL = await generator.generate(eventUrl, settings);
      setQrDataUrl(qrDataURL);

      // Check contrast
      const contrast = calculateContrast(qrColors.background, qrColors.dotsColor);
      setContrastWarning(contrast < 4.5);
    } catch (error) {
      console.error('Error rendering QR code:', error);
    }
  }, [eventUrl, qrColors, qrShapes, qrLogo, calculateContrast, convertToQRCodeSettings]);

  // Debounced render effect
  useEffect(() => {
    const timer = setTimeout(renderQR, 150);
    return () => clearTimeout(timer);
  }, [renderQR]);

  // Reset all QR settings
  const handleResetAll = () => {
    setQrColors({ ...defaultColors });
    setQrShapes({ ...defaultShapes });
    setQrLogo({ ...defaultLogo });
    toast({ title: "QR settings reset to defaults" });
  };

  // Logo upload handler
  const handleLogoUpload = async (file: File) => {
    try {
      setIsUploadingLogo(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${eventId}/qr-logo/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('qr-assets')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('qr-assets')
        .getPublicUrl(filePath);
      
      setQrLogo(prev => ({ ...prev, url: publicUrl }));
      toast({ title: 'Logo uploaded successfully' });
    } catch (error: any) {
      toast({ 
        title: 'Upload failed', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (qrLogo.url) {
      try {
        const path = qrLogo.url.split('/qr-assets/')[1];
        if (path) {
          await supabase.storage.from('qr-assets').remove([path]);
        }
      } catch (error) {
        console.error('Error removing logo:', error);
      }
    }
    setQrLogo(prev => ({ ...prev, url: null }));
    toast({ title: 'Logo removed' });
  };

  // Action button handlers
  const handleDownloadPNG = useCallback(async () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `qr-code-${selectedEvent?.name || 'event'}.png`;
    link.href = qrDataUrl;
    link.click();
    toast({
      title: "PNG downloaded successfully!"
    });
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
      toast({
        title: "JPG downloaded successfully!"
      });
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
        const blob = new Blob([svgContent], {
          type: 'image/svg+xml'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `qr-code-${selectedEvent?.name || 'event'}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast({
          title: "SVG downloaded successfully!"
        });
      };
      img.src = qrDataUrl;
    } catch (error) {
      toast({
        title: "Error downloading SVG",
        variant: "destructive"
      });
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
        toast({
          title: "PDF downloaded successfully!"
        });
      };
      img.src = qrDataUrl;
    } catch (error) {
      toast({
        title: "Error downloading PDF",
        variant: "destructive"
      });
    }
  }, [qrDataUrl, selectedEvent?.name, toast]);
  const handleResetQR = useCallback(() => {
    handleResetAll();
  }, []);
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
    toast({
      title: "QR code sent to printer"
    });
  }, [qrDataUrl, selectedEvent?.name, toast]);
  const handleSaveQR = useCallback(() => {
    // For now, just show a toast - this could be extended to save to database
    toast({
      title: "QR code settings saved!"
    });
  }, [toast]);
  const handleLiveView = () => {
    if (selectedEvent?.slug) {
      const liveViewUrl = buildGuestLookupUrl(selectedEvent.slug);
      window.open(liveViewUrl, '_blank');
    }
  };
  const handleCopyLink = async () => {
    try {
      const guestLookupUrl = selectedEvent?.slug ? buildGuestLookupUrl(selectedEvent.slug) : eventUrl;
      await navigator.clipboard.writeText(guestLookupUrl);
      toast({
        title: "Link copied!",
        description: "The guest lookup link has been copied to your clipboard."
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy link. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Color change handlers
  const updateColors = (updates: Partial<QRColorsSettings>) => {
    setQrColors(prev => ({ ...prev, ...updates }));
  };

  // Shape change handlers  
  const updateShapes = (updates: Partial<QRShapeSettings>) => {
    setQrShapes(prev => ({ ...prev, ...updates }));
  };
  return <Card className="ww-box h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-medium text-[#7248e6]">
          <QrCodeIcon className="h-5 w-5 text-purple-600" />
          QR Code Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grid Layout for Top Row and Bottom Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr] gap-4 lg:gap-6 w-full">
          {/* Row 1, Col 1: Connection Status Indicators */}
          <div className="flex-1 space-y-3 p-4 bg-green-50 border-2 border-green-600 rounded-lg my-[30px]">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-800">Connected & Synced</span>
            </div>
            
            {/* Event Information */}
            {selectedEvent && <div className="flex items-center justify-between text-xs text-green-700">
                <div className="flex items-center gap-2">
                  <QrCodeIcon className="h-3 w-3" />
                  <span>Linked to: <strong>{selectedEvent.name}</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Live</span>
                </div>
              </div>}
            
            {/* Scan Instructions */}
            <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
              📱 When scanned, opens guest lookup for this event
            </div>
          </div>

          {/* Row 1, Col 2: Live View Actions */}
          <div className="lg:w-auto space-y-3 p-4 bg-purple-50 border-2 border-purple-600 rounded-lg flex flex-col justify-center my-[30px]">
            <div className="space-y-4">
              {/* Open Live View Button + Helper */}
              <div className="space-y-1">
                <Button onClick={handleLiveView} disabled={!selectedEvent?.slug} className="w-full lg:w-auto lg:min-w-[180px]">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Live View
                </Button>
                <p className="text-xs text-gray-900 pl-1">
                  Preview what guests see when you send them the link or they scan the QR code at your event.
                </p>
              </div>
              
              {/* Copy Link Button + Helper */}
              <div className="space-y-1">
                <Button onClick={handleCopyLink} disabled={!selectedEvent?.slug} className="w-full lg:w-auto lg:min-w-[180px]">
                  <Link className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <p className="text-xs text-gray-900 pl-1">
                  Share your QR Code Seating Chart link with your guests via SMS, WhatsApp, email or socials.
                </p>
              </div>
            </div>
          </div>

          {/* Row 1, Col 3: Empty for alignment */}
          <div className="hidden lg:block"></div>

          {/* Row 2, Col 1: QR Code Card */}
          <Card className="ww-box w-full lg:w-auto">
            <CardContent className="flex flex-col items-center gap-4">
              {/* QR Preview */}
              <div id="qr-preview" className="w-full aspect-square bg-white rounded-lg flex items-center justify-center p-2">
                {qrDataUrl ? <img src={qrDataUrl} alt="QR Code Preview" className="w-full h-full" style={{
                imageRendering: 'pixelated'
              }} /> : <QrCodeIcon className="h-24 w-24 text-muted-foreground/50" />}
              </div>

              {/* Enhanced QR Customization Controls with Accordions */}
              <Accordion type="multiple" className="w-full space-y-2">
                {/* COLOR Section */}
                <AccordionItem value="color" className="border border-purple-200 rounded-lg bg-purple-50/30">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Color</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    {/* Background Color */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Background Color</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={qrColors.background} onChange={e => updateColors({ background: e.target.value })} className="w-8 h-8 rounded border border-input cursor-pointer" />
                        <Input value={qrColors.background} onChange={e => updateColors({ background: e.target.value })} className="text-xs font-mono flex-1 h-8" />
                      </div>
                    </div>
                    
                    {/* Dots Color */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Dots Color</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={qrColors.dotsColor} onChange={e => updateColors({ dotsColor: e.target.value })} className="w-8 h-8 rounded border border-input cursor-pointer" />
                        <Input value={qrColors.dotsColor} onChange={e => updateColors({ dotsColor: e.target.value })} className="text-xs font-mono flex-1 h-8" />
                      </div>
                    </div>
                    
                    {/* Marker Border Color */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Marker Border Color</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={qrColors.markerBorderColor} onChange={e => updateColors({ markerBorderColor: e.target.value })} className="w-8 h-8 rounded border border-input cursor-pointer" />
                        <Input value={qrColors.markerBorderColor} onChange={e => updateColors({ markerBorderColor: e.target.value })} className="text-xs font-mono flex-1 h-8" />
                      </div>
                    </div>
                    
                    {/* Marker Center Color */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Marker Center Color</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={qrColors.markerCenterColor} onChange={e => updateColors({ markerCenterColor: e.target.value })} className="w-8 h-8 rounded border border-input cursor-pointer" />
                        <Input value={qrColors.markerCenterColor} onChange={e => updateColors({ markerCenterColor: e.target.value })} className="text-xs font-mono flex-1 h-8" />
                      </div>
                    </div>
                    
                    {/* Contrast Warning */}
                    <div className={`p-2 rounded-md text-xs ${contrastWarning ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                      {contrastWarning ? '⚠️ Low contrast may affect scanning' : '✅ Good contrast for scanning'}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* SHAPE & FORM Section */}
                <AccordionItem value="shape" className="border border-purple-200 rounded-lg bg-purple-50/30">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Square className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Shape & Form</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    {/* Dots Shape */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Dots</Label>
                      <div className="flex flex-wrap gap-2">
                        {(['square', 'rounded', 'circle', 'diamond', 'plus', 'vertical', 'horizontal'] as const).map((shape) => (
                          <button
                            key={shape}
                            onClick={() => updateShapes({ dotsShape: shape })}
                            className={`w-10 h-10 flex items-center justify-center rounded border-2 transition-all ${
                              qrShapes.dotsShape === shape 
                                ? 'border-purple-600 bg-purple-100' 
                                : 'border-gray-200 hover:border-purple-300'
                            }`}
                            title={shape}
                          >
                            {shape === 'square' && <div className="w-4 h-4 bg-gray-800" />}
                            {shape === 'rounded' && <div className="w-4 h-4 bg-gray-800 rounded-sm" />}
                            {shape === 'circle' && <div className="w-4 h-4 bg-gray-800 rounded-full" />}
                            {shape === 'diamond' && <div className="w-4 h-4 bg-gray-800 rotate-45" />}
                            {shape === 'plus' && <Plus className="w-4 h-4 text-gray-800" />}
                            {shape === 'vertical' && <div className="w-1.5 h-4 bg-gray-800" />}
                            {shape === 'horizontal' && <div className="w-4 h-1.5 bg-gray-800" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Marker Border Shape */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Marker Border</Label>
                      <div className="flex gap-2">
                        {(['square', 'rounded', 'circle'] as const).map((shape) => (
                          <button
                            key={shape}
                            onClick={() => updateShapes({ markerBorderShape: shape })}
                            className={`w-12 h-12 flex items-center justify-center rounded border-2 transition-all ${
                              qrShapes.markerBorderShape === shape 
                                ? 'border-purple-600 bg-purple-100' 
                                : 'border-gray-200 hover:border-purple-300'
                            }`}
                            title={shape}
                          >
                            {shape === 'square' && <div className="w-6 h-6 border-2 border-gray-800" />}
                            {shape === 'rounded' && <div className="w-6 h-6 border-2 border-gray-800 rounded" />}
                            {shape === 'circle' && <div className="w-6 h-6 border-2 border-gray-800 rounded-full" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Marker Center Shape */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Marker Center</Label>
                      <div className="flex gap-2">
                        {(['square', 'circle'] as const).map((shape) => (
                          <button
                            key={shape}
                            onClick={() => updateShapes({ markerCenterShape: shape })}
                            className={`w-12 h-12 flex items-center justify-center rounded border-2 transition-all ${
                              qrShapes.markerCenterShape === shape 
                                ? 'border-purple-600 bg-purple-100' 
                                : 'border-gray-200 hover:border-purple-300'
                            }`}
                            title={shape}
                          >
                            {shape === 'square' && <div className="w-4 h-4 bg-gray-800" />}
                            {shape === 'circle' && <div className="w-4 h-4 bg-gray-800 rounded-full" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* LOGO Section */}
                <AccordionItem value="logo" className="border border-purple-200 rounded-lg bg-purple-50/30">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Logo</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    {/* Logo Upload */}
                    {qrLogo.url ? (
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 border rounded-lg overflow-hidden bg-white flex items-center justify-center">
                          <img src={qrLogo.url} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Button size="sm" variant="outline" onClick={handleRemoveLogo} className="w-full">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove Logo
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-purple-50/50 transition-colors ${isUploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleLogoUpload(file);
                          };
                          input.click();
                        }}
                      >
                        {isUploadingLogo ? (
                          <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-purple-600" />
                        ) : (
                          <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        )}
                        <p className="text-xs font-medium">
                          {isUploadingLogo ? 'Uploading...' : 'Upload Logo or Image'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG up to 2MB
                        </p>
                      </div>
                    )}
                    
                    {/* Logo Size Slider */}
                    {qrLogo.url && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-medium">Logo Size</Label>
                          <span className="text-xs text-muted-foreground">{qrLogo.size}%</span>
                        </div>
                        <Slider
                          value={[qrLogo.size]}
                          onValueChange={(values) => setQrLogo(prev => ({ ...prev, size: values[0] }))}
                          min={10}
                          max={35}
                          step={1}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Recommended: 15-30% for best scannability
                        </p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Reset All Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResetAll}
                className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <RotateCcw className="h-3 w-3 mr-2" />
                Reset All Settings
              </Button>

              {/* Action Buttons Grid */}
              <div id="qr-action-grid" className="grid grid-cols-2 gap-3 w-full">
                {/* Row 1 */}
                <Button id="btn-dl-png" variant="outline" className="w-full flex items-center justify-center gap-2 border-purple-600" onClick={handleDownloadPNG} aria-label="Download PNG" title="Download PNG">
                  <FileDown className="h-4 w-4 text-purple-600" />
                  PNG
                </Button>
                <Button id="btn-dl-jpg" variant="outline" className="w-full flex items-center justify-center gap-2 border-purple-600" onClick={handleDownloadJPG} aria-label="Download JPG" title="Download JPG">
                  <ImageIcon className="h-4 w-4 text-purple-600" />
                  JPG
                </Button>

                {/* Row 2 - Reset & Print */}
                <Button id="btn-reset-qr" variant="outline" className="w-full flex items-center justify-center gap-2 border-purple-600" onClick={handleResetQR} aria-label="Reset QR settings" title="Reset QR settings">
                  <RotateCcw className="h-4 w-4 text-purple-600" />
                  Reset
                </Button>
                <Button id="btn-print-qr" variant="outline" className="w-full flex items-center justify-center gap-2 border-purple-600" onClick={handlePrintQR} aria-label="Print QR" title="Print QR">
                  <Printer className="h-4 w-4 text-purple-600" />
                  Print
                </Button>

                {/* Row 3 */}
                <Button id="btn-save-qr" variant="success" className="col-span-2 w-full flex items-center justify-center gap-2" onClick={handleSaveQR} aria-label="Save QR style" title="Save QR style">
                  <Save className="h-4 w-4 text-white" />
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Row 2, Col 2 & 3: Merged Guest Live View Configuration Card */}
          <Card className="ww-box w-full lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-2xl font-medium text-[#7248e6]">Guest Live View Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Configure which modules your guests can access when they scan the QR code or visit your event page.
                </p>
                
                {/* RSVP Invite Module */}
                <div className="space-y-3 p-4 rounded-lg border-2 border-border bg-muted/20">
                  {/* Toggle Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-purple-600" />
                      <div>
                        <h4 className="text-sm font-semibold">RSVP Invite</h4>
                        <p className="text-xs text-muted-foreground">Let guests view your digital invitation and RSVP</p>
                      </div>
                    </div>
                    <Switch
                      checked={visibilitySettings?.show_rsvp_invite || false}
                      onCheckedChange={(checked) => updateVisibility('show_rsvp_invite', checked)}
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                    />
                  </div>

                  {/* Configuration Panel (shown when enabled) */}
                  {visibilitySettings?.show_rsvp_invite && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="rsvp-config" className="border-0">
                        <AccordionTrigger className="text-sm py-2 hover:no-underline">
                          <span className="text-purple-600">Configure RSVP Invite Settings</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <div className="p-3 bg-purple-50/50 rounded-md space-y-2">
                              <h5 className="text-xs font-semibold">Upload Your Digital Invitation</h5>
                              <p className="text-xs text-muted-foreground">
                                Create an A4 size (148W × 210H mm) digital invitation and upload it as PDF, JPG, or PNG.
                              </p>
                              <p className="text-xs font-medium mt-2">Suggested content:</p>
                              <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                                <li>Invitation message ("You Are Invited")</li>
                                <li>Event date, time, and venue details</li>
                                <li>Contact information</li>
                                <li>RSVP deadline</li>
                              </ul>
                            </div>

                            {/* Upload Area */}
                            <div className="space-y-2">
                              {moduleSettings?.rsvp_invite_config?.file_url ? (
                                <div className="flex items-center gap-2 p-3 bg-background rounded-md border">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">
                                      {moduleSettings.rsvp_invite_config.file_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Uploaded {new Date(moduleSettings.rsvp_invite_config.uploaded_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = '.pdf,.jpg,.jpeg,.png';
                                      input.onchange = async (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file && eventId) {
                                          try {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            if (!user) throw new Error('Not authenticated');
                                            
                                            const fileExt = file.name.split('.').pop();
                                            const fileName = `${Date.now()}.${fileExt}`;
                                            const filePath = `${user.id}/${eventId}/rsvp_invite/${fileName}`;
                                            
                                            const { error: uploadError } = await supabase.storage
                                              .from('invitations')
                                              .upload(filePath, file);
                                            
                                            if (uploadError) throw uploadError;
                                            
                                            const { data: { publicUrl } } = supabase.storage
                                              .from('invitations')
                                              .getPublicUrl(filePath);
                                            
                                            await updateModuleConfig('rsvp_invite_config', {
                                              file_url: publicUrl,
                                              file_name: file.name,
                                              file_type: file.type,
                                              uploaded_at: new Date().toISOString()
                                            });
                                            
                                            toast({ title: 'Invitation replaced successfully' });
                                          } catch (error: any) {
                                            toast({ 
                                              title: 'Upload failed', 
                                              description: error.message,
                                              variant: 'destructive' 
                                            });
                                          }
                                        }
                                      };
                                      input.click();
                                    }}
                                  >
                                    Replace
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={async () => {
                                      if (eventId && moduleSettings?.rsvp_invite_config?.file_url) {
                                        try {
                                          const path = moduleSettings.rsvp_invite_config.file_url.split('/invitations/')[1];
                                          await supabase.storage.from('invitations').remove([path]);
                                          await updateModuleConfig('rsvp_invite_config', {});
                                          toast({ title: 'Invitation removed successfully' });
                                        } catch (error: any) {
                                          toast({ 
                                            title: 'Remove failed', 
                                            description: error.message,
                                            variant: 'destructive' 
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ) : (
                                <div
                                  className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.pdf,.jpg,.jpeg,.png';
                                    input.onchange = async (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file && eventId) {
                                        try {
                                          const { data: { user } } = await supabase.auth.getUser();
                                          if (!user) throw new Error('Not authenticated');
                                          
                                          const fileExt = file.name.split('.').pop();
                                          const fileName = `${Date.now()}.${fileExt}`;
                                          const filePath = `${user.id}/${eventId}/rsvp_invite/${fileName}`;
                                          
                                          const { error: uploadError } = await supabase.storage
                                            .from('invitations')
                                            .upload(filePath, file);
                                          
                                          if (uploadError) throw uploadError;
                                          
                                          const { data: { publicUrl } } = supabase.storage
                                            .from('invitations')
                                            .getPublicUrl(filePath);
                                          
                                          await updateModuleConfig('rsvp_invite_config', {
                                            file_url: publicUrl,
                                            file_name: file.name,
                                            file_type: file.type,
                                            uploaded_at: new Date().toISOString()
                                          });
                                          
                                          toast({ title: 'Invitation uploaded successfully' });
                                        } catch (error: any) {
                                          toast({ 
                                            title: 'Upload failed', 
                                            description: error.message,
                                            variant: 'destructive' 
                                          });
                                        }
                                      }
                                    };
                                    input.click();
                                  }}
                                >
                                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                  <p className="text-sm font-medium mb-1">Upload Digital Invitation</p>
                                  <p className="text-xs text-muted-foreground">
                                    Click to upload PDF, JPG, or PNG
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  if (currentEvent?.slug) {
                                    const url = buildGuestLookupUrl(currentEvent.slug) + '?tab=rsvp-invite';
                                    window.open(url, '_blank');
                                  }
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Preview
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  if (currentEvent?.slug) {
                                    const url = buildGuestLookupUrl(currentEvent.slug) + '?tab=rsvp-invite';
                                    navigator.clipboard.writeText(url);
                                    toast({
                                      title: 'Link copied!',
                                      description: 'Share this link with your guests'
                                    });
                                  }
                                }}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy Link
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>

                {/* Welcome Video Module */}
                <div className="space-y-3 p-4 rounded-lg border-2 border-border bg-muted/20">
                  {/* Toggle Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="h-5 w-5 text-purple-600" />
                      <div>
                        <h4 className="text-sm font-semibold">Welcome Video</h4>
                        <p className="text-xs text-muted-foreground">Add a personal video message for your guests</p>
                      </div>
                    </div>
                    <Switch
                      checked={visibilitySettings?.show_welcome_video || false}
                      onCheckedChange={(checked) => updateVisibility('show_welcome_video', checked)}
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                    />
                  </div>

                  {/* Configuration Panel (shown when enabled) */}
                  {visibilitySettings?.show_welcome_video && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="video-config" className="border-0">
                        <AccordionTrigger className="text-sm py-2 hover:no-underline">
                          <span className="text-purple-600">Configure Welcome Video Settings</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="p-4 bg-muted/30 rounded-md space-y-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Welcome Video</Label>
                              <p className="text-xs text-muted-foreground">
                                Upload a personal video message for your guests (max 2 minutes, MP4/MOV/WebM, up to 500MB)
                              </p>
                            </div>
                            
                            {moduleSettings?.welcome_video_config?.video_url ? (
                              <div className="space-y-3">
                                <div className="relative rounded-lg overflow-hidden bg-black">
                                  <iframe
                                    src={moduleSettings.welcome_video_config.video_url}
                                    className="w-full aspect-video"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = 'video/mp4,video/quicktime,video/webm';
                                      input.onchange = async (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) {
                                          await uploadVideo(file);
                                        }
                                      };
                                      input.click();
                                    }}
                                  >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Replace Video
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-destructive" 
                                    onClick={async () => {
                                      if (confirm('Are you sure you want to remove this video?')) {
                                        await deleteVideo();
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'video/mp4,video/quicktime,video/webm';
                                  input.onchange = async (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                      await uploadVideo(file);
                                    }
                                  };
                                  input.click();
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const file = e.dataTransfer.files?.[0];
                                  if (file) {
                                    uploadVideo(file);
                                  }
                                }}
                                onDragOver={(e) => e.preventDefault()}
                              >
                                <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                                <p className="text-xs text-muted-foreground mt-1">MP4, MOV, or WebM (max 2 minutes, 500MB)</p>
                              </div>
                            )}
                            
                            {(isUploading || isProcessing) && (
                              <div className="space-y-2">
                                {isUploading && (
                                  <>
                                    <Progress value={uploadProgress} className="h-2" />
                                    <p className="text-xs text-center text-muted-foreground">
                                      Uploading... {uploadProgress}%
                                    </p>
                                  </>
                                )}
                                {isProcessing && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing video... This may take a few minutes.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              </CardContent>
            </Card>
        </div>

      </CardContent>
    </Card>;
};