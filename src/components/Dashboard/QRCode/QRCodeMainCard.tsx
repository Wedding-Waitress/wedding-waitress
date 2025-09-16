import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Copy, 
  Palette, 
  Settings2, 
  RefreshCw,
  Link,
  Image as ImageIcon,
  Square,
  Circle
} from 'lucide-react';
import QRCode from 'qrcode';
import { useQRCodeSettings } from '@/hooks/useQRCodeSettings';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';

interface QRCodeMainCardProps {
  eventId: string;
}

export const QRCodeMainCard: React.FC<QRCodeMainCardProps> = ({ eventId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { settings, loading, saveSettings } = useQRCodeSettings(eventId);
  const { events } = useEvents();
  const { toast } = useToast();
  const [qrUrl, setQrUrl] = useState('');

  const selectedEvent = events.find(event => event.id === eventId);

  useEffect(() => {
    if (selectedEvent?.slug) {
      const url = `${window.location.origin}/s/${selectedEvent.slug}`;
      setQrUrl(url);
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (qrUrl && settings && canvasRef.current) {
      generateQRCode();
    }
  }, [qrUrl, settings]);

  const generateQRCode = async () => {
    if (!canvasRef.current || !qrUrl || !settings) return;

    try {
      const options = {
        width: 300,
        margin: 2,
        color: {
          dark: settings.foreground_color || '#000000',
          light: settings.background_color || '#ffffff',
        },
        errorCorrectionLevel: 'M' as const,
      };

      await QRCode.toCanvas(canvasRef.current, qrUrl, options);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (format: 'png' | 'svg' | 'jpg') => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    let link = document.createElement('a');
    
    if (format === 'png' || format === 'jpg') {
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      link.download = `qr-code-${selectedEvent?.name || 'seating-chart'}.${format}`;
      link.href = canvas.toDataURL(mimeType);
    }
    
    link.click();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    toast({
      title: "Success",
      description: "QR code link copied to clipboard",
    });
  };

  const handleSettingChange = (key: string, value: any) => {
    if (!settings) return;
    
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading QR code settings...</p>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          QR Code Live Preview & Customization
        </CardTitle>
        <CardDescription>
          Customize your QR code appearance and download in multiple formats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Live Preview Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code Preview */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold mb-4">Live Preview</h3>
              <div className="p-6 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
                <canvas 
                  ref={canvasRef}
                  className="mx-auto rounded-md"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
                {settings?.has_scan_text && (
                  <div className="mt-3">
                    <Badge variant="outline" className="text-sm">
                      {settings.scan_text}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Download Options */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDownload('png')}
              >
                <Download className="w-4 h-4 mr-1" />
                PNG
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDownload('jpg')}
              >
                <Download className="w-4 h-4 mr-1" />
                JPG
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={copyLink}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy Link
              </Button>
            </div>

            {/* QR URL Display */}
            <div className="text-center">
              <Label className="text-xs text-muted-foreground">QR Code URL:</Label>
              <div className="mt-1 p-2 bg-muted rounded text-xs font-mono break-all">
                {qrUrl}
              </div>
            </div>
          </div>

          {/* Customization Panel */}
          <div className="space-y-4">
            <h3 className="font-semibold">Customization Options</h3>
            
            {/* Shape Selection */}
            <div className="space-y-2">
              <Label>QR Code Shape</Label>
              <Select 
                value={settings?.shape || 'square'} 
                onValueChange={(value) => handleSettingChange('shape', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">
                    <div className="flex items-center gap-2">
                      <Square className="w-4 h-4" />
                      Square
                    </div>
                  </SelectItem>
                  <SelectItem value="round">
                    <div className="flex items-center gap-2">
                      <Circle className="w-4 h-4" />
                      Round
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Color Customization */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Foreground Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={settings?.foreground_color || '#000000'}
                    onChange={(e) => handleSettingChange('foreground_color', e.target.value)}
                    className="w-12 h-8 p-1 border rounded"
                  />
                  <Input
                    type="text"
                    value={settings?.foreground_color || '#000000'}
                    onChange={(e) => handleSettingChange('foreground_color', e.target.value)}
                    className="flex-1 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={settings?.background_color || '#ffffff'}
                    onChange={(e) => handleSettingChange('background_color', e.target.value)}
                    className="w-12 h-8 p-1 border rounded"
                  />
                  <Input
                    type="text"
                    value={settings?.background_color || '#ffffff'}
                    onChange={(e) => handleSettingChange('background_color', e.target.value)}
                    className="flex-1 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Scan Text Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Show Scan Text</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSettingChange('has_scan_text', !settings?.has_scan_text)}
                >
                  {settings?.has_scan_text ? 'Hide' : 'Show'}
                </Button>
              </div>
              {settings?.has_scan_text && (
                <Input
                  value={settings.scan_text || 'SCAN ME'}
                  onChange={(e) => handleSettingChange('scan_text', e.target.value)}
                  placeholder="Enter scan text..."
                />
              )}
            </div>

            <Separator />

            {/* Advanced Options */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Advanced Options</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" disabled>
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Add Logo
                </Button>
                <Button variant="outline" size="sm" disabled>
                  <Palette className="w-4 h-4 mr-1" />
                  Patterns
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">More customization options coming soon</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};