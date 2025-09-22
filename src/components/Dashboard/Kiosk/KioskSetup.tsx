import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Monitor, 
  ExternalLink, 
  QrCode, 
  Copy, 
  Maximize,
  Calendar,
  CheckCircle2,
  Settings,
  Tablet,
  Info
} from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { buildGuestLookupUrl } from '@/lib/urlUtils';
import QRCode from 'qrcode';

interface KioskSetupProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export const KioskSetup: React.FC<KioskSetupProps> = ({ 
  selectedEventId, 
  onEventSelect 
}) => {
  const { events, loading: eventsLoading } = useEvents();
  const { toast } = useToast();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;
  const kioskUrl = selectedEvent?.slug ? `${window.location.origin}/kiosk/${selectedEvent.slug}` : '';

  const handleCopyUrl = async () => {
    if (!kioskUrl) return;
    
    try {
      await navigator.clipboard.writeText(kioskUrl);
      toast({
        title: "URL Copied",
        description: "Kiosk URL has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy URL to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleOpenKiosk = () => {
    if (!kioskUrl) return;
    window.open(kioskUrl, '_blank');
  };

  const handleFullscreen = () => {
    if (!kioskUrl) return;
    const newWindow = window.open(kioskUrl, '_blank', 'fullscreen=yes,scrollbars=no,toolbar=no,menubar=no,status=no');
    if (newWindow) {
      // Try to make it fullscreen
      setTimeout(() => {
        try {
          newWindow.document.documentElement.requestFullscreen?.();
        } catch (error) {
          console.log('Fullscreen not available');
        }
      }, 1000);
    }
  };

  const generateQRCode = async () => {
    if (!kioskUrl) return;
    
    setIsGeneratingQR(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(kioskUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      toast({
        title: "QR Code Generation Failed",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQR(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="ww-box bg-gradient-subtle border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Monitor className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Kiosk Live View Setup</CardTitle>
              <CardDescription>
                Configure a self-service guest lookup kiosk for your event entrance
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Event Selection */}
      <Card className="ww-box">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Event Selection
          </CardTitle>
          <CardDescription>
            Choose which event to display on the kiosk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-foreground min-w-fit">
              Choose Event:
            </label>
            <Select value={selectedEventId || "no-event"} onValueChange={onEventSelect}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
              </SelectTrigger>
              <SelectContent>
                {events.length > 0 ? (
                  events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{event.name}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-events" disabled>
                    {eventsLoading ? "Loading events..." : "No events found"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {selectedEvent && (
            <div className="flex items-center gap-2 mt-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-600">
                Selected: {selectedEvent.name}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kiosk URL and Controls */}
      {selectedEvent && (
        <Card className="ww-box">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Kiosk URL & Controls
            </CardTitle>
            <CardDescription>
              Use this URL to set up your kiosk device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* URL Display */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <code className="text-sm break-all flex-1 mr-4">{kioskUrl}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="flex-shrink-0"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                onClick={handleOpenKiosk}
                className="flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Kiosk
              </Button>
              
              <Button 
                variant="gradient" 
                onClick={handleFullscreen}
                className="flex items-center justify-center gap-2"
              >
                <Maximize className="w-4 h-4" />
                Launch Fullscreen
              </Button>
              
              <Button 
                variant="outline" 
                onClick={generateQRCode}
                disabled={isGeneratingQR}
                className="flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                {isGeneratingQR ? 'Generating...' : 'Generate QR'}
              </Button>
            </div>

            {/* QR Code Display */}
            {qrCodeDataUrl && (
              <div className="text-center p-6 bg-white rounded-lg border">
                <h4 className="font-semibold mb-4">QR Code for Kiosk Setup</h4>
                <img 
                  src={qrCodeDataUrl} 
                  alt="Kiosk QR Code" 
                  className="mx-auto mb-4"
                />
                <p className="text-sm text-muted-foreground">
                  Scan this QR code to quickly open the kiosk on a tablet or mobile device
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card className="ww-box">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tablet className="w-5 h-5" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">1</Badge>
              <p className="text-sm">
                <strong>Choose your device:</strong> Use a tablet, laptop, or desktop computer for the kiosk
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">2</Badge>
              <p className="text-sm">
                <strong>Open the kiosk URL:</strong> Navigate to the kiosk URL on your chosen device
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">3</Badge>
              <p className="text-sm">
                <strong>Go fullscreen:</strong> Use the "Launch Fullscreen" button or press F11 on desktop
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">4</Badge>
              <p className="text-sm">
                <strong>Position the device:</strong> Place the device at your event entrance where guests can easily access it
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">5</Badge>
              <p className="text-sm">
                <strong>Test the interface:</strong> Try searching for a few guest names to ensure everything works properly
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 mb-1">Pro Tips:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• The kiosk automatically clears searches after 30 seconds of inactivity</li>
                  <li>• Use landscape orientation for tablets for the best experience</li>
                  <li>• Ensure the device has a stable internet connection</li>
                  <li>• Consider adding a sign explaining how to use the kiosk</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};