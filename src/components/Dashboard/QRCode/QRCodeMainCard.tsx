import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/enhanced-button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { QrCode as QrCodeIcon, Copy, Download, RotateCcw, Save, Printer, FileDown, Palette, ChevronDown, FileText, Code, Image as ImageIcon, ExternalLink, Link, Eye, EyeOff, Upload, Mail, Edit } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { useLiveViewVisibility } from '@/hooks/useLiveViewVisibility';
import { useLiveViewModuleSettings } from '@/hooks/useLiveViewModuleSettings';
import { buildGuestLookupUrl } from '@/lib/urlUtils';
import { supabase } from '@/integrations/supabase/client';
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
const defaultColors: QRColorsSettings = {
  background: "#ffffff",
  foreground: "#000000"
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
  const selectedEvent = events.find(event => event.id === eventId);
  const currentEvent = events.find(event => event.id === eventId);
  const eventUrl = selectedEvent?.slug ? buildGuestLookupUrl(selectedEvent.slug) : `https://…/live-view/${eventId}`;

  // QR Settings State
  const [qrSettings, setQrSettings] = useState<{
    colors: QRColorsSettings;
  }>({
    colors: {
      ...defaultColors
    }
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
  const convertToQRCodeSettings = useCallback(async (): Promise<QRCodeSettings> => {
    return {
      event_id: eventId,
      user_id: '',
      // Will be filled by the backend
      background_color: qrSettings.colors.background,
      foreground_color: qrSettings.colors.foreground,
      shape: 'square',
      pattern: 'basic',
      pattern_style: 'default',
      corner_style: 'square',
      border_style: 'none',
      border_width: 0,
      border_color: qrSettings.colors.foreground,
      center_image_url: undefined,
      center_image_size: 80,
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
    };
  }, [qrSettings]);

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
    setQrSettings({
      colors: {
        ...defaultColors
      }
    });
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
    setQrSettings({
      colors: {
        ...defaultColors
      }
    });
    toast({
      title: "QR settings reset to defaults"
    });
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
    setQrSettings(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        ...updates
      }
    }));
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
                  Share seating chart link with your guests via SMS, WhatsApp, email or socials.
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

              {/* Color Customization Controls */}
              <div className="w-full p-4 bg-purple-50/50 border border-purple-600 rounded-lg space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-800">Customise Your QR Code</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Background Color */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Background</Label>
                    <div className="flex items-center space-x-2">
                      <input id="color-bg" type="color" value={qrSettings.colors.background} onChange={e => updateColors({
                      background: e.target.value
                    })} className="w-6 h-6 rounded border border-input" />
                      <Input value={qrSettings.colors.background} onChange={e => updateColors({
                      background: e.target.value
                    })} className="text-xs font-mono flex-1 h-8" placeholder="#ffffff" />
                    </div>
                  </div>

                  {/* Foreground Color */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Foreground</Label>
                    <div className="flex items-center space-x-2">
                      <input id="color-fg" type="color" value={qrSettings.colors.foreground} onChange={e => updateColors({
                      foreground: e.target.value
                    })} className="w-6 h-6 rounded border border-input" />
                      <Input value={qrSettings.colors.foreground} onChange={e => updateColors({
                      foreground: e.target.value
                    })} className="text-xs font-mono flex-1 h-8" placeholder="#000000" />
                    </div>
                  </div>
                </div>

                {/* Scannability Warning and Reset Colors */}
                <div className="flex items-center gap-2">
                  <Button id="btn-reset-colors" variant="ghost" size="sm" onClick={handleResetColors} className="text-sm text-muted-foreground hover:text-foreground h-7 px-2 shrink-0">
                    Reset Colors
                  </Button>
                  <div id="color-contrast-helper" className={`flex-1 p-1.5 rounded-md text-xs ${contrastWarning ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                    {contrastWarning ? '⚠️ Low contrast' : '✅ Good contrast'}
                  </div>
                </div>
              </div>

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
                                            const fileExt = file.name.split('.').pop();
                                            const fileName = `${Date.now()}.${fileExt}`;
                                            const filePath = `${eventId}/rsvp_invite/${fileName}`;
                                            
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
                                          const fileExt = file.name.split('.').pop();
                                          const fileName = `${Date.now()}.${fileExt}`;
                                          const filePath = `${eventId}/rsvp_invite/${fileName}`;
                                          
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
                          <div className="p-4 bg-muted/30 rounded-md space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Video upload feature coming soon. You'll be able to upload a personal welcome message for your guests.
                            </p>
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