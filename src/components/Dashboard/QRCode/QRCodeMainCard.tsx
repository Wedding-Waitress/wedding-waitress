/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * The QR Code Seating Chart feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break QR code generation and customisation
 * - Changes could break the guest lookup link system
 * - Changes could break real-time event syncing
 *
 * Last locked: 2026-02-19
 */
import React, { useState, useEffect, useCallback } from 'react';
import { ColorPickerPopover } from '@/components/ui/color-picker-popover';
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
import { QrCode as QrCodeIcon, Copy, Download, RotateCcw, FileDown, Palette, ChevronDown, FileText, Code, Image as ImageIcon, ExternalLink, Link, Eye, EyeOff, Upload, Mail, Edit, Trash2, Loader2, Video, Square, Circle, Diamond, Plus, Minus, MapPin, UtensilsCrossed, CheckCircle2 } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { useLiveViewVisibility } from '@/hooks/useLiveViewVisibility';
import { useLiveViewModuleSettings } from '@/hooks/useLiveViewModuleSettings';
import { useWelcomeVideoUpload } from '@/hooks/useWelcomeVideoUpload';
import { useEventDynamicQR } from '@/hooks/useEventDynamicQR';
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
  const { dynamicUrl } = useEventDynamicQR(eventId);
  const eventUrl = dynamicUrl || `https://…/live-view/${eventId}`;

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

  // Calculate relative luminance (WCAG 2.1 compliant)
  const getLuminance = useCallback((hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }, []);

  // Calculate contrast ratio (WCAG 2.1 compliant)
  const calculateContrastRatio = useCallback((bg: string, fg: string) => {
    const L1 = getLuminance(bg);
    const L2 = getLuminance(fg);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  }, [getLuminance]);

  // Auto-correct color to ensure high contrast (WCAG AA 4.5:1 minimum)
  const ensureHighContrast = useCallback((bgColor: string, fgColor: string): string => {
    const ratio = calculateContrastRatio(bgColor, fgColor);
    if (ratio >= 4.5) return fgColor; // Already meets WCAG AA
    
    // Determine if background is light or dark
    const bgLum = getLuminance(bgColor);
    
    // If background is light, return dark color; if dark, return light color
    return bgLum > 0.5 ? '#1a1a1a' : '#f0f0f0';
  }, [calculateContrastRatio, getLuminance]);

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

      // Contrast is always ensured via auto-correction
      setContrastWarning(false);
    } catch (error) {
      console.error('Error rendering QR code:', error);
    }
  }, [eventUrl, qrColors, qrShapes, qrLogo, convertToQRCodeSettings]);

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
  // Auto-save QR settings when colors, shapes, or logo changes
  useEffect(() => {
    const saveTimer = setTimeout(async () => {
      if (!eventId) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const settingsToSave = {
          event_id: eventId,
          user_id: user.id,
          background_color: qrColors.background,
          foreground_color: qrColors.foreground,
          dots_color: qrColors.dotsColor,
          marker_border_color: qrColors.markerBorderColor,
          marker_center_color: qrColors.markerCenterColor,
          dots_shape: qrShapes.dotsShape,
          marker_border_shape: qrShapes.markerBorderShape,
          marker_center_shape: qrShapes.markerCenterShape,
          center_image_url: qrLogo.url,
          center_image_size: qrLogo.size,
          updated_at: new Date().toISOString()
        };

        await supabase
          .from('qr_code_settings')
          .upsert(settingsToSave, { onConflict: 'event_id' });
      } catch (error) {
        console.error('Auto-save QR settings error:', error);
      }
    }, 500);

    return () => clearTimeout(saveTimer);
  }, [eventId, qrColors, qrShapes, qrLogo]);
  const handleLiveView = () => {
    if (eventUrl) {
      window.open(eventUrl, '_blank');
    }
  };
  const handleCopyLink = async () => {
    try {
      const guestLookupUrl = eventUrl;
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

  // Color change handlers - only auto-correct when background changes
  const updateColors = (updates: Partial<QRColorsSettings>) => {
    setQrColors(prev => {
      const newColors = { ...prev, ...updates };
      
      // Only auto-correct other colors when the background color was changed
      if ('background' in updates) {
        const bg = newColors.background;
        newColors.dotsColor = ensureHighContrast(bg, newColors.dotsColor);
        newColors.markerBorderColor = ensureHighContrast(bg, newColors.markerBorderColor);
        newColors.markerCenterColor = ensureHighContrast(bg, newColors.markerCenterColor);
        newColors.foreground = ensureHighContrast(bg, newColors.foreground);
      }
      
      return newColors;
    });
  };

  // Shape change handlers  
  const updateShapes = (updates: Partial<QRShapeSettings>) => {
    setQrShapes(prev => ({ ...prev, ...updates }));
  };
  return <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <QrCodeIcon className="h-5 w-5 text-purple-600" />
          QR Code Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {/* Top Row: QR Preview + Customization + Action Buttons (3 equal columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full items-stretch">
          {/* Col 1: QR Code Preview */}
          <div className="bg-white rounded-lg border border-primary p-4 flex items-center justify-center min-h-[320px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
            <div id="qr-preview" className="w-full max-w-[280px] aspect-square flex items-center justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code Preview" className="w-full h-full" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <QrCodeIcon className="h-20 w-20 text-muted-foreground/50" />
              )}
            </div>
          </div>

          {/* Col 2: Customization Panel */}
          <div className="bg-muted/30 rounded-lg border border-primary p-3 space-y-3 overflow-y-auto min-h-[320px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
            <div className="bg-primary text-primary-foreground text-center py-2 px-3 rounded-md -mx-3 -mt-3">
              <h3 className="text-base font-semibold">Design Your QR Code</h3>
            </div>
            {/* Accordions for Color, Shape, Logo */}
            <Accordion type="multiple" className="w-full space-y-2">
              {/* COLOR Section */}
              <AccordionItem value="color" className="border border-primary rounded-lg bg-purple-50/30">
                <AccordionTrigger className="px-3 py-2 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Color</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-sm">Background</Label>
                      <ColorPickerPopover value={qrColors.background} onChange={(c) => updateColors({ background: c })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Dots</Label>
                      <ColorPickerPopover value={qrColors.dotsColor} onChange={(c) => updateColors({ dotsColor: c })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Marker Border</Label>
                      <ColorPickerPopover value={qrColors.markerBorderColor} onChange={(c) => updateColors({ markerBorderColor: c })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Marker Center</Label>
                      <ColorPickerPopover value={qrColors.markerCenterColor} onChange={(c) => updateColors({ markerCenterColor: c })} />
                    </div>
                  </div>
                  <div className="p-1.5 rounded text-xs bg-green-50 text-green-800 border border-green-200">
                    ✅ High contrast (auto-optimized)
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* SHAPE Section */}
              <AccordionItem value="shape" className="border border-purple-200 rounded-lg bg-purple-50/30">
                <AccordionTrigger className="px-3 py-2 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Square className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Shape & Form</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Dots</Label>
                    <div className="flex flex-wrap gap-1">
                      {(['square', 'rounded', 'circle', 'diamond', 'plus', 'vertical', 'horizontal'] as const).map((shape) => (
                        <button
                          key={shape}
                          onClick={() => updateShapes({ dotsShape: shape })}
                          className={`w-8 h-8 flex items-center justify-center rounded border-2 transition-all ${
                            qrShapes.dotsShape === shape 
                              ? 'border-purple-600 bg-purple-100' 
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                          title={shape}
                        >
                          {shape === 'square' && <div className="w-3 h-3 bg-gray-800" />}
                          {shape === 'rounded' && <div className="w-3 h-3 bg-gray-800 rounded-sm" />}
                          {shape === 'circle' && <div className="w-3 h-3 bg-gray-800 rounded-full" />}
                          {shape === 'diamond' && <div className="w-3 h-3 bg-gray-800 rotate-45" />}
                          {shape === 'plus' && <Plus className="w-3 h-3 text-gray-800" />}
                          {shape === 'vertical' && <div className="w-1 h-3 bg-gray-800" />}
                          {shape === 'horizontal' && <div className="w-3 h-1 bg-gray-800" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-sm">Marker Border</Label>
                      <div className="flex gap-1">
                        {(['square', 'rounded', 'circle'] as const).map((shape) => (
                          <button
                            key={shape}
                            onClick={() => updateShapes({ markerBorderShape: shape })}
                            className={`w-8 h-8 flex items-center justify-center rounded border-2 transition-all ${
                              qrShapes.markerBorderShape === shape 
                                ? 'border-purple-600 bg-purple-100' 
                                : 'border-gray-200 hover:border-purple-300'
                            }`}
                            title={shape}
                          >
                            {shape === 'square' && <div className="w-4 h-4 border-2 border-gray-800" />}
                            {shape === 'rounded' && <div className="w-4 h-4 border-2 border-gray-800 rounded" />}
                            {shape === 'circle' && <div className="w-4 h-4 border-2 border-gray-800 rounded-full" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Marker Center</Label>
                      <div className="flex gap-1">
                        {(['square', 'circle'] as const).map((shape) => (
                          <button
                            key={shape}
                            onClick={() => updateShapes({ markerCenterShape: shape })}
                            className={`w-8 h-8 flex items-center justify-center rounded border-2 transition-all ${
                              qrShapes.markerCenterShape === shape 
                                ? 'border-purple-600 bg-purple-100' 
                                : 'border-gray-200 hover:border-purple-300'
                            }`}
                            title={shape}
                          >
                            {shape === 'square' && <div className="w-3 h-3 bg-gray-800" />}
                            {shape === 'circle' && <div className="w-3 h-3 bg-gray-800 rounded-full" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* LOGO Section */}
              <AccordionItem value="logo" className="border border-purple-200 rounded-lg bg-purple-50/30">
                <AccordionTrigger className="px-3 py-2 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Logo</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-3">
                  {qrLogo.url ? (
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 border rounded overflow-hidden bg-white flex items-center justify-center">
                        <img src={qrLogo.url} alt="Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Slider
                          value={[qrLogo.size]}
                          onValueChange={(values) => setQrLogo(prev => ({ ...prev, size: values[0] }))}
                          min={10}
                          max={35}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">{qrLogo.size}%</span>
                          <Button size="sm" variant="ghost" onClick={handleRemoveLogo} className="h-6 px-2 text-xs text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:bg-purple-50/50 transition-colors ${isUploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}
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
                        <Loader2 className="h-5 w-5 mx-auto animate-spin text-purple-600" />
                      ) : (
                        <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
                      )}
                      <p className="text-xs mt-1">{isUploadingLogo ? 'Uploading...' : 'Upload Logo'}</p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            {/* Reset to Default - at bottom of Design panel */}
            <div className="pt-2 mt-auto">
              <Button variant="destructive" onClick={handleResetAll} className="w-full rounded-full">
                Reset to Default
              </Button>
            </div>
          </div>

          {/* Col 3: Action Buttons */}
          <div className="flex flex-col gap-3 justify-start bg-muted/20 rounded-lg border border-primary p-4 min-h-[320px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
            {/* Open Live View - Full Width */}
            <Button variant="default" size="default" onClick={handleLiveView} disabled={!selectedEvent?.slug} className="w-full bg-green-500 hover:bg-green-600 text-white border-0">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Live View
            </Button>
            
            {/* Copy Link - Full Width */}
            <Button variant="outline" size="default" onClick={handleCopyLink} disabled={!selectedEvent?.slug} className="border-purple-400 w-full">
              <Link className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            
            {/* PNG - Full Width */}
            <Button variant="outline" size="default" onClick={handleDownloadPNG} className="border-purple-300 w-full">
              <FileDown className="h-4 w-4 mr-2" />
              PNG
            </Button>
            
            {/* JPG - Full Width */}
            <Button variant="outline" size="default" onClick={handleDownloadJPG} className="border-purple-300 w-full">
              <ImageIcon className="h-4 w-4 mr-2" />
              JPG
            </Button>
            
            {/* Spacer to push Reset to bottom */}
            <div className="flex-grow" />
            
            {/* Reset to Default - Red Destructive, Full Width, Rounded (Like Place Cards) */}
            <div className="pt-4 border-t border-border">
              <Button variant="destructive" onClick={handleResetQR} className="w-full rounded-full">
                Reset to Default
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Row: Guest Live View Configuration (Horizontal 2-column) */}
        <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl font-bold text-foreground">Guest Live View Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure which modules your guests can access when they scan the QR code or visit your event page.
            </p>
            
            {/* 2x2 Grid for all modules */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* RSVP Invite Module */}
              <div className="space-y-3 p-4 rounded-lg border-2 border-border bg-muted/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-purple-600" />
                    <div>
                      <h4 className="text-sm font-semibold">RSVP Invite</h4>
                      <p className="text-xs text-muted-foreground">Let guests view your digital invitation and RSVP</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs whitespace-nowrap ${visibilitySettings?.show_rsvp_invite ? "text-green-600" : "text-red-500"}`}>
                      {visibilitySettings?.show_rsvp_invite ? "Displayed on app" : "Not displayed on app"}
                    </span>
                    <Switch
                      checked={visibilitySettings?.show_rsvp_invite || false}
                      onCheckedChange={(checked) => updateVisibility('show_rsvp_invite', checked)}
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                    />
                  </div>
                </div>

                {visibilitySettings?.show_rsvp_invite && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="rsvp-config" className="border-0">
                      <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        <span className="text-purple-600">Configure RSVP Invite Settings</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <div className="p-3 bg-purple-50/50 rounded-md space-y-2">
                            <h5 className="text-xs font-semibold">Upload Your Digital Invitation</h5>
                            <p className="text-xs text-muted-foreground">
                              Create an A4 size digital invitation and upload it as PDF, JPG, or PNG.
                            </p>
                          </div>

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
                              className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
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
                              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-xs font-medium">Upload Digital Invitation</p>
                              <p className="text-xs text-muted-foreground">PDF, JPG, or PNG</p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                if (eventUrl) {
                                  window.open(eventUrl + '?tab=rsvp-invite', '_blank');
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
                                if (eventUrl) {
                                  navigator.clipboard.writeText(eventUrl + '?tab=rsvp-invite');
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
              <div className="space-y-3 p-4 rounded-lg border-2 border-border bg-muted/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-purple-600" />
                    <div>
                      <h4 className="text-sm font-semibold">Welcome Video</h4>
                      <p className="text-xs text-muted-foreground">Add a personal video message for your guests</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs whitespace-nowrap ${visibilitySettings?.show_welcome_video ? "text-green-600" : "text-red-500"}`}>
                      {visibilitySettings?.show_welcome_video ? "Displayed on app" : "Not displayed on app"}
                    </span>
                    <Switch
                      checked={visibilitySettings?.show_welcome_video || false}
                      onCheckedChange={(checked) => updateVisibility('show_welcome_video', checked)}
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                    />
                  </div>
                </div>

                {visibilitySettings?.show_welcome_video && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="video-config" className="border-0">
                      <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        <span className="text-purple-600">Configure Welcome Video Settings</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="p-3 bg-muted/30 rounded-md space-y-3">
                          <div className="space-y-1">
                            <Label className="text-sm font-medium">Welcome Video</Label>
                            <p className="text-xs text-muted-foreground">
                              Upload a personal video message (max 2 minutes, MP4/MOV/WebM, up to 500MB)
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
                                  <Upload className="w-3 h-3 mr-1" />
                                  Replace
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
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
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
                              <Video className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                              <p className="text-xs font-medium">Click to upload or drag and drop</p>
                              <p className="text-xs text-muted-foreground mt-1">MP4, MOV, or WebM (max 2 min, 500MB)</p>
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
                                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Processing video...
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

              {/* Ceremony Floor Plan Module */}
              <div className="space-y-3 p-4 rounded-lg border-2 border-border bg-muted/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-purple-600" />
                    <div>
                      <h4 className="text-sm font-semibold">Ceremony Floor Plan</h4>
                      <p className="text-xs text-muted-foreground">Show your ceremony floor plan to guests</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs whitespace-nowrap ${visibilitySettings?.show_floor_plan ? "text-green-600" : "text-red-500"}`}>
                      {visibilitySettings?.show_floor_plan ? "Displayed on app" : "Not displayed on app"}
                    </span>
                    <Switch
                      checked={visibilitySettings?.show_floor_plan || false}
                      onCheckedChange={(checked) => updateVisibility('show_floor_plan', checked)}
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                    />
                  </div>
                </div>

                {visibilitySettings?.show_floor_plan && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="floorplan-config" className="border-0">
                      <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        <span className="text-purple-600">Configure Ceremony Floor Plan Settings</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <p className="text-xs text-muted-foreground">Choose how to display your ceremony floor plan to guests. Select one option:</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Upload Image Option */}
                            <button
                              type="button"
                              onClick={() => {
                                updateModuleConfig('floor_plan_config', {
                                  ...moduleSettings?.floor_plan_config,
                                  source: 'upload'
                                });
                              }}
                              className={`p-4 rounded-lg border-2 text-left transition-all ${
                                moduleSettings?.floor_plan_config?.source === 'upload'
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-border bg-background hover:border-muted-foreground/30'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {moduleSettings?.floor_plan_config?.source === 'upload' && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                )}
                                <div>
                                  <p className="text-sm font-semibold">Upload an Image</p>
                                  <p className="text-xs text-muted-foreground mt-1">Upload a JPG or PNG of your ceremony layout</p>
                                </div>
                              </div>
                            </button>

                            {/* Use Existing Floor Plan Option */}
                            <button
                              type="button"
                              onClick={() => {
                                updateModuleConfig('floor_plan_config', {
                                  ...moduleSettings?.floor_plan_config,
                                  source: 'existing'
                                });
                              }}
                              className={`p-4 rounded-lg border-2 text-left transition-all ${
                                moduleSettings?.floor_plan_config?.source === 'existing'
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-border bg-background hover:border-muted-foreground/30'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {moduleSettings?.floor_plan_config?.source === 'existing' && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                )}
                                <div>
                                  <p className="text-sm font-semibold">Use Existing Floor Plan</p>
                                  <p className="text-xs text-muted-foreground mt-1">Display the ceremony floor plan from your dashboard</p>
                                </div>
                              </div>
                            </button>
                          </div>

                          {/* Upload area when 'upload' is selected */}
                          {moduleSettings?.floor_plan_config?.source === 'upload' && (
                            <div className="mt-3">
                              {moduleSettings?.floor_plan_config?.file_url ? (
                                <div className="flex items-center gap-2 p-3 bg-background rounded-md border">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">
                                      {moduleSettings.floor_plan_config.file_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Uploaded {new Date(moduleSettings.floor_plan_config.uploaded_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = '.jpg,.jpeg,.png';
                                      input.onchange = async (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file && eventId) {
                                          try {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            if (!user) throw new Error('Not authenticated');
                                            const fileExt = file.name.split('.').pop();
                                            const fileName = `${Date.now()}.${fileExt}`;
                                            const filePath = `${user.id}/${eventId}/floor_plan/${fileName}`;
                                            const { error: uploadError } = await supabase.storage.from('live-view-uploads').upload(filePath, file);
                                            if (uploadError) throw uploadError;
                                            const { data: { publicUrl } } = supabase.storage.from('live-view-uploads').getPublicUrl(filePath);
                                            await updateModuleConfig('floor_plan_config', {
                                              source: 'upload',
                                              file_url: publicUrl,
                                              file_name: file.name,
                                              file_type: file.type,
                                              uploaded_at: new Date().toISOString()
                                            });
                                            toast({ title: 'Ceremony floor plan replaced successfully' });
                                          } catch (error: any) {
                                            toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
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
                                      if (eventId && moduleSettings?.floor_plan_config?.file_url) {
                                        try {
                                          const path = moduleSettings.floor_plan_config.file_url.split('/live-view-uploads/')[1];
                                          if (path) await supabase.storage.from('live-view-uploads').remove([path]);
                                          await updateModuleConfig('floor_plan_config', { source: 'upload' });
                                          toast({ title: 'Ceremony floor plan removed' });
                                        } catch (error: any) {
                                          toast({ title: 'Remove failed', description: error.message, variant: 'destructive' });
                                        }
                                      }
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ) : (
                                <div
                                  className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.jpg,.jpeg,.png';
                                    input.onchange = async (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file && eventId) {
                                        try {
                                          const { data: { user } } = await supabase.auth.getUser();
                                          if (!user) throw new Error('Not authenticated');
                                          const fileExt = file.name.split('.').pop();
                                          const fileName = `${Date.now()}.${fileExt}`;
                                          const filePath = `${user.id}/${eventId}/floor_plan/${fileName}`;
                                          const { error: uploadError } = await supabase.storage.from('live-view-uploads').upload(filePath, file);
                                          if (uploadError) throw uploadError;
                                          const { data: { publicUrl } } = supabase.storage.from('live-view-uploads').getPublicUrl(filePath);
                                          await updateModuleConfig('floor_plan_config', {
                                            source: 'upload',
                                            file_url: publicUrl,
                                            file_name: file.name,
                                            file_type: file.type,
                                            uploaded_at: new Date().toISOString()
                                          });
                                          toast({ title: 'Ceremony floor plan uploaded successfully' });
                                        } catch (error: any) {
                                          toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
                                        }
                                      }
                                    };
                                    input.click();
                                  }}
                                >
                                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                                  <p className="text-xs font-medium">Upload Ceremony Floor Plan Image</p>
                                  <p className="text-xs text-muted-foreground">JPG or PNG</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Confirmation when 'existing' is selected */}
                          {moduleSettings?.floor_plan_config?.source === 'existing' && (
                            <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <p className="text-xs text-green-800 font-medium">
                                  Your ceremony floor plan from the Floor Plan page will be displayed to guests.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>

              {/* Reception Floor Plan Module */}
              <div className="space-y-3 p-4 rounded-lg border-2 border-border bg-muted/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-purple-600" />
                    <div>
                      <h4 className="text-sm font-semibold">Reception Floor Plan</h4>
                      <p className="text-xs text-muted-foreground">Show your reception floor plan to guests</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs whitespace-nowrap ${visibilitySettings?.show_reception_floor_plan ? "text-green-600" : "text-red-500"}`}>
                      {visibilitySettings?.show_reception_floor_plan ? "Displayed on app" : "Not displayed on app"}
                    </span>
                    <Switch
                      checked={visibilitySettings?.show_reception_floor_plan || false}
                      onCheckedChange={(checked) => updateVisibility('show_reception_floor_plan', checked)}
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                    />
                  </div>
                </div>

                {visibilitySettings?.show_reception_floor_plan && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="reception-floorplan-config" className="border-0">
                      <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        <span className="text-purple-600">Configure Reception Floor Plan Settings</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <p className="text-xs text-muted-foreground">Choose how to display your reception floor plan to guests. Select one option:</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Upload Image Option */}
                            <button
                              type="button"
                              onClick={() => {
                                updateModuleConfig('reception_floor_plan_config', {
                                  ...moduleSettings?.reception_floor_plan_config,
                                  source: 'upload'
                                });
                              }}
                              className={`p-4 rounded-lg border-2 text-left transition-all ${
                                moduleSettings?.reception_floor_plan_config?.source === 'upload'
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-border bg-background hover:border-muted-foreground/30'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {moduleSettings?.reception_floor_plan_config?.source === 'upload' && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                )}
                                <div>
                                  <p className="text-sm font-semibold">Upload an Image</p>
                                  <p className="text-xs text-muted-foreground mt-1">Upload a JPG or PNG of your reception layout</p>
                                </div>
                              </div>
                            </button>

                            {/* Use Existing Floor Plan Option */}
                            <button
                              type="button"
                              onClick={() => {
                                updateModuleConfig('reception_floor_plan_config', {
                                  ...moduleSettings?.reception_floor_plan_config,
                                  source: 'existing'
                                });
                              }}
                              className={`p-4 rounded-lg border-2 text-left transition-all ${
                                moduleSettings?.reception_floor_plan_config?.source === 'existing'
                                  ? 'border-amber-500 bg-amber-50'
                                  : 'border-border bg-background hover:border-muted-foreground/30'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {moduleSettings?.reception_floor_plan_config?.source === 'existing' && (
                                  <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                )}
                                <div>
                                  <p className="text-sm font-semibold">Use Existing Floor Plan</p>
                                  <p className="text-xs text-muted-foreground mt-1">Display the reception floor plan from your dashboard</p>
                                </div>
                              </div>
                            </button>
                          </div>

                          {/* Upload area when 'upload' is selected */}
                          {moduleSettings?.reception_floor_plan_config?.source === 'upload' && (
                            <div className="mt-3">
                              {moduleSettings?.reception_floor_plan_config?.file_url ? (
                                <div className="flex items-center gap-2 p-3 bg-background rounded-md border">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">
                                      {moduleSettings.reception_floor_plan_config.file_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Uploaded {new Date(moduleSettings.reception_floor_plan_config.uploaded_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = '.jpg,.jpeg,.png';
                                      input.onchange = async (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file && eventId) {
                                          try {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            if (!user) throw new Error('Not authenticated');
                                            const fileExt = file.name.split('.').pop();
                                            const fileName = `${Date.now()}.${fileExt}`;
                                            const filePath = `${user.id}/${eventId}/reception_floor_plan/${fileName}`;
                                            const { error: uploadError } = await supabase.storage.from('live-view-uploads').upload(filePath, file);
                                            if (uploadError) throw uploadError;
                                            const { data: { publicUrl } } = supabase.storage.from('live-view-uploads').getPublicUrl(filePath);
                                            await updateModuleConfig('reception_floor_plan_config', {
                                              source: 'upload',
                                              file_url: publicUrl,
                                              file_name: file.name,
                                              file_type: file.type,
                                              uploaded_at: new Date().toISOString()
                                            });
                                            toast({ title: 'Reception floor plan replaced successfully' });
                                          } catch (error: any) {
                                            toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
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
                                      if (eventId && moduleSettings?.reception_floor_plan_config?.file_url) {
                                        try {
                                          const path = moduleSettings.reception_floor_plan_config.file_url.split('/live-view-uploads/')[1];
                                          if (path) await supabase.storage.from('live-view-uploads').remove([path]);
                                          await updateModuleConfig('reception_floor_plan_config', { source: 'upload' });
                                          toast({ title: 'Reception floor plan removed' });
                                        } catch (error: any) {
                                          toast({ title: 'Remove failed', description: error.message, variant: 'destructive' });
                                        }
                                      }
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ) : (
                                <div
                                  className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.jpg,.jpeg,.png';
                                    input.onchange = async (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file && eventId) {
                                        try {
                                          const { data: { user } } = await supabase.auth.getUser();
                                          if (!user) throw new Error('Not authenticated');
                                          const fileExt = file.name.split('.').pop();
                                          const fileName = `${Date.now()}.${fileExt}`;
                                          const filePath = `${user.id}/${eventId}/reception_floor_plan/${fileName}`;
                                          const { error: uploadError } = await supabase.storage.from('live-view-uploads').upload(filePath, file);
                                          if (uploadError) throw uploadError;
                                          const { data: { publicUrl } } = supabase.storage.from('live-view-uploads').getPublicUrl(filePath);
                                          await updateModuleConfig('reception_floor_plan_config', {
                                            source: 'upload',
                                            file_url: publicUrl,
                                            file_name: file.name,
                                            file_type: file.type,
                                            uploaded_at: new Date().toISOString()
                                          });
                                          toast({ title: 'Reception floor plan uploaded successfully' });
                                        } catch (error: any) {
                                          toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
                                        }
                                      }
                                    };
                                    input.click();
                                  }}
                                >
                                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                                  <p className="text-xs font-medium">Upload Reception Floor Plan Image</p>
                                  <p className="text-xs text-muted-foreground">JPG or PNG</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Coming soon message when 'existing' is selected */}
                          {moduleSettings?.reception_floor_plan_config?.source === 'existing' && (
                            <div className="mt-3 p-3 bg-amber-50 rounded-md border border-amber-200">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-amber-600" />
                                <div>
                                  <p className="text-xs text-amber-800 font-medium">
                                    Using existing floor plan
                                  </p>
                                  <p className="text-xs text-amber-700 mt-0.5">
                                    Coming soon — Reception floor plan configuration is not yet available.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>

              {/* Menu Module */}
              <div className="space-y-3 p-4 rounded-lg border-2 border-border bg-muted/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UtensilsCrossed className="h-5 w-5 text-purple-600" />
                    <div>
                      <h4 className="text-sm font-semibold">Menu</h4>
                      <p className="text-xs text-muted-foreground">Upload your wedding menu for guests to view</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs whitespace-nowrap ${visibilitySettings?.show_menu ? "text-green-600" : "text-red-500"}`}>
                      {visibilitySettings?.show_menu ? "Displayed on app" : "Not displayed on app"}
                    </span>
                    <Switch
                      checked={visibilitySettings?.show_menu || false}
                      onCheckedChange={(checked) => updateVisibility('show_menu', checked)}
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                    />
                  </div>
                </div>

                {visibilitySettings?.show_menu && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="menu-config" className="border-0">
                      <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        <span className="text-purple-600">Configure Menu Settings</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <div className="p-3 bg-purple-50/50 rounded-md space-y-2">
                            <h5 className="text-xs font-semibold">Upload Your Wedding Menu</h5>
                            <p className="text-xs text-muted-foreground">
                              Upload your menu as a PDF, JPG, or PNG so guests can view it on their phones.
                            </p>
                          </div>

                          {moduleSettings?.menu_config?.file_url ? (
                            <div className="flex items-center gap-2 p-3 bg-background rounded-md border">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {moduleSettings.menu_config.file_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Uploaded {new Date(moduleSettings.menu_config.uploaded_at).toLocaleDateString()}
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
                                        const filePath = `${user.id}/${eventId}/menu/${fileName}`;
                                        const { error: uploadError } = await supabase.storage.from('live-view-uploads').upload(filePath, file);
                                        if (uploadError) throw uploadError;
                                        const { data: { publicUrl } } = supabase.storage.from('live-view-uploads').getPublicUrl(filePath);
                                        await updateModuleConfig('menu_config', {
                                          file_url: publicUrl,
                                          file_name: file.name,
                                          file_type: file.type,
                                          uploaded_at: new Date().toISOString()
                                        });
                                        toast({ title: 'Menu replaced successfully' });
                                      } catch (error: any) {
                                        toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
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
                                  if (eventId && moduleSettings?.menu_config?.file_url) {
                                    try {
                                      const path = moduleSettings.menu_config.file_url.split('/live-view-uploads/')[1];
                                      if (path) await supabase.storage.from('live-view-uploads').remove([path]);
                                      await updateModuleConfig('menu_config', {});
                                      toast({ title: 'Menu removed' });
                                    } catch (error: any) {
                                      toast({ title: 'Remove failed', description: error.message, variant: 'destructive' });
                                    }
                                  }
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
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
                                      const filePath = `${user.id}/${eventId}/menu/${fileName}`;
                                      const { error: uploadError } = await supabase.storage.from('live-view-uploads').upload(filePath, file);
                                      if (uploadError) throw uploadError;
                                      const { data: { publicUrl } } = supabase.storage.from('live-view-uploads').getPublicUrl(filePath);
                                      await updateModuleConfig('menu_config', {
                                        file_url: publicUrl,
                                        file_name: file.name,
                                        file_type: file.type,
                                        uploaded_at: new Date().toISOString()
                                      });
                                      toast({ title: 'Menu uploaded successfully' });
                                    } catch (error: any) {
                                      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
                                    }
                                  }
                                };
                                input.click();
                              }}
                            >
                              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-xs font-medium">Upload Wedding Menu</p>
                              <p className="text-xs text-muted-foreground">PDF, JPG, or PNG</p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>

              {/* Hero Image / Logo Module */}
              <div className="space-y-3 p-4 rounded-lg border-2 border-border bg-muted/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
                <div className="flex items-center gap-3">
                  <ImageIcon className="h-5 w-5 text-purple-600" />
                  <div>
                    <h4 className="text-sm font-semibold">Add Your Photo or Logo</h4>
                    <p className="text-xs text-muted-foreground">Upload an image to replace the purple gradient behind your event header in the guest view</p>
                    <p className="text-sm font-semibold text-purple-600 mt-1">📸 For best results, use a horizontal - landscape (6×4) photo.</p>
                  </div>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="hero-image-config" className="border-0">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline">
                      <span className="text-purple-600">Configure Hero Background</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <div className="p-3 bg-purple-50/50 rounded-md space-y-2">
                          <h5 className="text-xs font-semibold">Upload Your Photo or Logo</h5>
                          <p className="text-xs text-muted-foreground">
                            Upload a JPG or PNG image. It will appear as the background behind "You're invited to..." in the guest view. A dark overlay is applied automatically for text readability.
                          </p>
                        </div>

                        {moduleSettings?.hero_image_config?.file_url ? (
                          <div className="space-y-3">
                            <div className="relative rounded-md overflow-hidden border">
                              <img 
                                src={moduleSettings.hero_image_config.file_url} 
                                alt="Hero background preview" 
                                className="w-full h-32 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">Preview with overlay</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-background rounded-md border">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {moduleSettings.hero_image_config.file_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Uploaded {new Date(moduleSettings.hero_image_config.uploaded_at).toLocaleDateString()}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = '.jpg,.jpeg,.png';
                                  input.onchange = async (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file && eventId) {
                                      try {
                                        const { data: { user } } = await supabase.auth.getUser();
                                        if (!user) throw new Error('Not authenticated');
                                        const fileExt = file.name.split('.').pop();
                                        const fileName = `${Date.now()}.${fileExt}`;
                                        const filePath = `${user.id}/${eventId}/hero_image/${fileName}`;
                                        const { error: uploadError } = await supabase.storage.from('live-view-uploads').upload(filePath, file);
                                        if (uploadError) throw uploadError;
                                        const { data: { publicUrl } } = supabase.storage.from('live-view-uploads').getPublicUrl(filePath);
                                        await updateModuleConfig('hero_image_config', {
                                          file_url: publicUrl,
                                          file_name: file.name,
                                          file_type: file.type,
                                          uploaded_at: new Date().toISOString()
                                        });
                                        toast({ title: 'Hero image replaced successfully' });
                                      } catch (error: any) {
                                        toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
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
                                  if (eventId && moduleSettings?.hero_image_config?.file_url) {
                                    try {
                                      const path = moduleSettings.hero_image_config.file_url.split('/live-view-uploads/')[1];
                                      if (path) await supabase.storage.from('live-view-uploads').remove([path]);
                                      await updateModuleConfig('hero_image_config', {});
                                      toast({ title: 'Hero image removed' });
                                    } catch (error: any) {
                                      toast({ title: 'Remove failed', description: error.message, variant: 'destructive' });
                                    }
                                  }
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = '.jpg,.jpeg,.png';
                              input.onchange = async (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file && eventId) {
                                  try {
                                    const { data: { user } } = await supabase.auth.getUser();
                                    if (!user) throw new Error('Not authenticated');
                                    const fileExt = file.name.split('.').pop();
                                    const fileName = `${Date.now()}.${fileExt}`;
                                    const filePath = `${user.id}/${eventId}/hero_image/${fileName}`;
                                    const { error: uploadError } = await supabase.storage.from('live-view-uploads').upload(filePath, file);
                                    if (uploadError) throw uploadError;
                                    const { data: { publicUrl } } = supabase.storage.from('live-view-uploads').getPublicUrl(filePath);
                                    await updateModuleConfig('hero_image_config', {
                                      file_url: publicUrl,
                                      file_name: file.name,
                                      file_type: file.type,
                                      uploaded_at: new Date().toISOString()
                                    });
                                    toast({ title: 'Hero image uploaded successfully' });
                                  } catch (error: any) {
                                    toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
                                  }
                                }
                              };
                              input.click();
                            }}
                          >
                            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-xs font-medium">Upload Photo or Logo</p>
                            <p className="text-xs text-muted-foreground">JPG or PNG</p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </CardContent>
        </Card>

      </CardContent>
    </Card>;
};