import React, { useCallback, useEffect, useState } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Copy, QrCode as QrCodeIcon, Settings } from 'lucide-react';
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

  const handleDownload = async (format: 'png' | 'jpg') => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = `qr-code-${selectedEvent?.name || 'event'}.${format}`;
    
    if (format === 'jpg') {
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
      description: "Event link copied to clipboard",
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
        <Tabs defaultValue="preview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Live Preview</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Editor</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4">
            {/* Live Preview */}
            <div className="border rounded-lg p-6 bg-muted/50 text-center">
              <h3 className="text-sm font-medium mb-4">Live Preview</h3>
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="QR Code Preview" 
                  className="max-w-[280px] mx-auto border rounded-lg bg-white p-2"
                />
              ) : (
                <div className="w-[280px] h-[280px] mx-auto border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                  <QrCodeIcon className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              <div className="mt-3 p-2 bg-muted/30 rounded border">
                <p className="text-xs font-medium text-foreground mb-1">Scans to:</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground truncate flex-1">
                    {qrUrl || 'No event selected'}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={copyLink}
                    disabled={!qrUrl}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Customization */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="foreground-color">Foreground</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings?.foreground_color || '#000000'}
                      onChange={(e) => updateSettings({ foreground_color: e.target.value })}
                      className="w-12 h-9 p-0 border-0"
                    />
                    <Input
                      value={settings?.foreground_color || '#000000'}
                      onChange={(e) => updateSettings({ foreground_color: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="background-color">Background</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings?.background_color || '#ffffff'}
                      onChange={(e) => updateSettings({ background_color: e.target.value })}
                      className="w-12 h-9 p-0 border-0"
                    />
                    <Input
                      value={settings?.background_color || '#ffffff'}
                      onChange={(e) => updateSettings({ background_color: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="scan-text">Scan Text</Label>
                  <Switch
                    checked={settings?.has_scan_text || false}
                    onCheckedChange={(checked) => updateSettings({ has_scan_text: checked })}
                  />
                </div>
                {settings?.has_scan_text && (
                  <Input
                    placeholder="SCAN ME"
                    value={settings?.scan_text || ''}
                    onChange={(e) => updateSettings({ scan_text: e.target.value })}
                  />
                )}
              </div>
            </div>

            {/* Download Options */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleDownload('png')} 
                  className="flex-1"
                  disabled={!qrDataUrl}
                >
                  <Download className="h-4 w-4 mr-2" />
                  PNG
                </Button>
                <Button 
                  onClick={() => handleDownload('jpg')} 
                  variant="outline" 
                  className="flex-1"
                  disabled={!qrDataUrl}
                >
                  <Download className="h-4 w-4 mr-2" />
                  JPG
                </Button>
              </div>
              
              <Button 
                onClick={copyLink} 
                variant="outline" 
                className="w-full"
                disabled={!selectedEvent}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Event Link
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};