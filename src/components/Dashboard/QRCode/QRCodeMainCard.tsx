import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useEvents } from '@/hooks/useEvents';
import { useQRCodeSettings } from '@/hooks/useQRCodeSettings';
import { AdvancedQRGenerator } from '@/lib/advancedQRGenerator';
import { QRCodeTypeSelector } from './QRCodeTypeSelector';
import { QRCodeSidebar } from './QRCodeSidebar';
import { buildGuestLookupUrl } from '@/lib/urlUtils';
import { ExternalLink, Copy, Download, Printer } from 'lucide-react';

interface QRCodeMainCardProps {
  eventId: string;
}

export const QRCodeMainCard: React.FC<QRCodeMainCardProps> = ({ eventId }) => {
  const { settings, loading, saveSettings } = useQRCodeSettings(eventId);
  const { events } = useEvents();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [activeType, setActiveType] = useState<string>('url');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(false);

  const selectedEvent = events?.find(event => event.id === eventId);

  // Initialize QR code generator
  const qrGenerator = new AdvancedQRGenerator(512);

  useEffect(() => {
    if (selectedEvent?.slug) {
      const url = buildGuestLookupUrl(selectedEvent.slug);
      setQrCodeUrl(url);
      setCustomUrl(url);
    }
  }, [selectedEvent]);

  // Generate QR code when URL or settings change
  const generateQRCode = useCallback(async () => {
    if (!qrCodeUrl || !settings) return;
    
    try {
      const dataUrl = await qrGenerator.generate(qrCodeUrl, settings);
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast.error('Failed to generate QR code');
    }
  }, [qrCodeUrl, settings, qrGenerator]);

  useEffect(() => {
    generateQRCode();
  }, [generateQRCode]);

  const updateSettings = async (newSettings: Partial<typeof settings>) => {
    if (!settings) return;
    
    const updatedSettings = { ...settings, ...newSettings };
    await saveSettings(updatedSettings);
  };

  const handleDownload = async (format: 'png' | 'svg' | 'pdf') => {
    if (!qrCodeDataUrl) {
      toast.error('QR code not ready');
      return;
    }

    try {
      let blob: Blob;
      let filename: string;

      if (format === 'svg') {
        toast.error('SVG format not yet supported');
        return;
      } else if (format === 'pdf') {
        toast.error('PDF format not yet supported');
        return;
      } else {
        // Convert canvas to blob
        const canvas = qrGenerator.getCanvas();
        blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          }, 'image/png', 0.9);
        });
        filename = `qr-code-${selectedEvent?.name || 'event'}.${format}`;
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`QR code downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download QR code');
    }
  };

  const handlePrint = () => {
    if (!qrCodeDataUrl) {
      toast.error('QR code not ready');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>QR Code</title></head>
          <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
            <img src="${qrCodeDataUrl}" style="max-width: 100%; max-height: 100%;" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const copyLink = async () => {
    if (!qrCodeUrl) return;
    
    try {
      await navigator.clipboard.writeText(qrCodeUrl);
      toast.success('Link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link');
    }
  };

  const openLiveView = () => {
    if (qrCodeUrl) {
      window.open(qrCodeUrl, '_blank');
    }
  };

  const handleUrlChange = (url: string) => {
    setCustomUrl(url);
    setQrCodeUrl(url);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center">Loading QR code settings...</div>
        </CardContent>
      </Card>
    );
  }

  if (!selectedEvent || !settings) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {!selectedEvent ? "Event not found" : "Settings not available"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Top Type Selector */}
      <QRCodeTypeSelector 
        activeType={activeType}
        onTypeChange={setActiveType}
      />

      {/* URL Input Section */}
      <div className="p-4 border-b bg-background">
        <div className="space-y-4">
          <div>
            <Label htmlFor="url-input" className="text-lg font-medium">URL</Label>
          </div>
          <div>
            <Label htmlFor="url-input" className="text-sm text-muted-foreground">URL</Label>
            <Input
              id="url-input"
              type="url"
              placeholder="https://www.midnightdjs.com.au/"
              value={customUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="tracking"
              checked={trackingEnabled}
              onCheckedChange={setTrackingEnabled}
            />
            <Label htmlFor="tracking" className="text-sm text-muted-foreground">
              Edit QR Code info after print & see how many people scan it (paid feature)
            </Label>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <QRCodeSidebar 
          settings={settings}
          onSettingsChange={updateSettings}
        />

        {/* Right Content Area - QR Code Preview and Actions */}
        <div className="flex-1 p-6 flex flex-col">
          {/* QR Code Preview */}
          <div className="flex-1 flex items-center justify-center mb-6">
            <div className="bg-muted/30 p-8 rounded-lg">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code"
                  className="max-w-full h-auto"
                  style={{ maxWidth: '300px', maxHeight: '300px' }}
                />
              ) : (
                <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground">Generating QR Code...</span>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-center mb-4">
            <Button
              size="lg"
              className="px-8 py-3 bg-primary/20 hover:bg-primary/30 text-primary"
            >
              Save
            </Button>
          </div>

          {/* Download Buttons */}
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload('png')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload('svg')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              SVG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload('pdf')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};