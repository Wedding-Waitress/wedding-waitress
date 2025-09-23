import React, { useCallback, useEffect, useState } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Download, Copy, QrCode as QrCodeIcon, ExternalLink } from 'lucide-react';
import { AdvancedQRGenerator } from '@/lib/advancedQRGenerator';
import { AdvancedQRCustomizer } from './AdvancedQRCustomizer';
import { useQRCodeSettings, QRCodeSettings } from '@/hooks/useQRCodeSettings';
import { buildGuestLookupUrl } from '@/lib/urlUtils';

interface QRCodeMainCardProps {
  eventId: string;
}

export const QRCodeMainCard: React.FC<QRCodeMainCardProps> = ({ eventId }) => {
  const { settings, loading, saveSettings } = useQRCodeSettings(eventId);
  const { events } = useEvents();
  const { toast } = useToast();
  const [qrUrl, setQrUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const selectedEvent = events.find(event => event.id === eventId);

  useEffect(() => {
    if (selectedEvent?.slug) {
      const url = buildGuestLookupUrl(selectedEvent.slug);
      console.log('Generated QR URL:', url); // Debug logging
      setQrUrl(url);
    }
  }, [selectedEvent]);

  const generateQRCode = useCallback(async () => {
    if (!qrUrl || !settings) return;

    try {
      const generator = new AdvancedQRGenerator(settings.output_size || 512);
      const dataUrl = await generator.generate(qrUrl, settings);
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  }, [qrUrl, settings, toast]);

  useEffect(() => {
    if (qrUrl && settings) {
      generateQRCode();
    }
  }, [generateQRCode]);

  const updateSettings = (newSettings: Partial<QRCodeSettings>) => {
    if (settings) {
      const updated = { ...settings, ...newSettings };
      saveSettings(updated);
    }
  };

  const handleDownload = async (format: 'png' | 'jpg' | 'svg') => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = `qr-code-${selectedEvent?.name || 'event'}.${format}`;
    
    if (format === 'svg') {
      // Generate SVG version using QRCode library
      try {
        const QRCode = await import('qrcode');
        const svgString = await QRCode.toString(qrUrl, {
          type: 'svg',
          errorCorrectionLevel: 'H',
          margin: 2,
          width: settings?.output_size || 512,
          color: {
            dark: settings?.foreground_color || '#000000',
            light: settings?.background_color || '#ffffff'
          }
        });
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      } catch (error) {
        console.error('Error generating SVG:', error);
        toast({
          title: "Error",
          description: "Failed to generate SVG",
          variant: "destructive",
        });
        return;
      }
    } else if (format === 'jpg') {
      // Convert PNG to JPG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
      };
      img.src = qrDataUrl;
    } else {
      link.href = qrDataUrl;
      link.click();
    }

    toast({
      title: "Success",
      description: `QR code downloaded as ${format.toUpperCase()}`,
    });
  };

  const copyLink = () => {
    if (!qrUrl) return;
    
    navigator.clipboard.writeText(qrUrl);
    toast({
      title: "Success",
      description: "Live view link copied to clipboard",
    });
  };

  const openLiveView = () => {
    if (!qrUrl) return;
    
    window.open(qrUrl, '_blank');
  };

  const resetToDefault = () => {
    const defaultSettings: Partial<QRCodeSettings> = {
      event_id: eventId,
      shape: 'square',
      pattern: 'basic',
      pattern_style: 'basic',
      background_color: '#ffffff',
      foreground_color: '#0a0a0a',
      corner_style: 'square',
      has_scan_text: true,
      scan_text: 'SCAN ME',
      gradient_type: 'none',
      gradient_colors: [],
      border_style: 'none',
      border_width: 0,
      border_color: '#000000',
      shadow_enabled: false,
      shadow_blur: 10,
      shadow_color: '#00000033',
      center_image_size: 80,
      background_opacity: 1.0,
      output_size: 1024,
      output_format: 'png',
      color_palette: 'default',
      advanced_settings: {},
    };
    
    saveSettings(defaultSettings as QRCodeSettings);
    toast({
      title: "Success",
      description: "QR code settings reset to default",
    });
  };

  if (loading) {
    return (
      <Card className="ww-box h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  if (!settings || !selectedEvent) {
    return (
      <Card className="ww-box h-full">
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No event selected or settings not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="ww-box h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCodeIcon className="h-5 w-5" />
          QR Code Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Box - QR Code Display and Actions */}
          <div className="border rounded-lg p-6 bg-muted/30 space-y-4">
            {/* Event Name Display */}
            <div className="text-center mb-4">
              <h3 className="text-purple-600 font-bold text-lg">
                {selectedEvent?.name}
              </h3>
            </div>

            {/* QR Code Display */}
            <div className="text-center">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="QR Code Preview" 
                  className="max-w-[280px] mx-auto border rounded-lg bg-white p-2"
                />
              ) : (
                <div className="w-[280px] h-[280px] mx-auto border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-white">
                  <QrCodeIcon className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Live View Buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={openLiveView}
                  className="flex-1"
                  disabled={!qrUrl}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Live View
                </Button>
                <Button 
                  onClick={copyLink} 
                  variant="outline" 
                  className="flex-1"
                  disabled={!qrUrl}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Live View
                </Button>
              </div>
              
              {/* Download Options */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Download:</p>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleDownload('png')} 
                    variant="outline"
                    className="flex-1"
                    disabled={!qrDataUrl}
                  >
                    PNG
                  </Button>
                  <Button 
                    onClick={() => handleDownload('jpg')} 
                    variant="outline" 
                    className="flex-1"
                    disabled={!qrDataUrl}
                  >
                    JPG
                  </Button>
                  <Button 
                    onClick={() => handleDownload('svg')} 
                    variant="outline" 
                    className="flex-1"
                    disabled={!qrDataUrl}
                  >
                    SVG Vector
                  </Button>
                </div>
              </div>
              
              {/* Reset Button */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button 
                    onClick={resetToDefault}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={!settings}
                  >
                    Reset to Default
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Box - Advanced Editor Features */}
          <div className="border rounded-lg p-6 bg-muted/30">
            {settings && (
              <AdvancedQRCustomizer
                eventId={eventId}
                settings={settings}
                onSettingsChange={updateSettings}
                onSave={async () => {
                  const success = await saveSettings(settings);
                  if (success) {
                    generateQRCode();
                  }
                }}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};