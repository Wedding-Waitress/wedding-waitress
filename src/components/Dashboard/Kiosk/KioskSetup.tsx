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
  MonitorCog,
  ExternalLink, 
  QrCode, 
  Copy, 
  Check,
  Maximize,
  CalendarDays,
  CircleCheck,
  Link2,
  TabletSmartphone,
  MonitorSmartphone,
  MapPin,
  SearchCheck,
  LoaderCircle,
  Info
} from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { buildKioskUrl } from '@/lib/urlUtils';
import { KioskLiveViewConfig } from './KioskLiveViewConfig';
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
  const [copied, setCopied] = useState(false);
  const [isOpeningKiosk, setIsOpeningKiosk] = useState(false);

  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;
  const kioskUrl = selectedEvent?.slug ? buildKioskUrl(selectedEvent.slug) : '';

  const handleCopyUrl = async () => {
    if (!kioskUrl) return;
    
    try {
      await navigator.clipboard.writeText(kioskUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
    setIsOpeningKiosk(true);
    const opened = window.open(kioskUrl, '_blank');
    if (!opened) {
      toast({
        title: 'Popup blocked',
        description: 'Allow pop-ups for this site to open the kiosk window.',
        variant: 'destructive',
      });
    }
    setTimeout(() => setIsOpeningKiosk(false), 800);
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
          // Silently fail if fullscreen is not available
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
    <div className="space-y-6 md:max-lg:space-y-8 md:max-lg:px-2">
      {/* Consolidated header + Event Selection + Kiosk URL & Controls */}
      <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
        <CardHeader>
          {/* Kiosk Live View Setup heading + description on one row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg w-fit">
              <MonitorCog className="w-[25px] h-[25px] text-primary" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div className="flex flex-col lg:flex-row lg:items-baseline gap-1 lg:gap-3">
              <CardTitle className="ww-kiosk-main-heading text-2xl font-bold text-foreground">Kiosk Live View Setup - This is for check-ins at corporate events, workshops, and seminars</CardTitle>
              <CardDescription className="shrink-0">
                Configure a self-service guest lookup kiosk for your event entrance
              </CardDescription>
            </div>
          </div>

          {/* Event Selection heading + description on one row */}
          <div className="flex flex-col lg:flex-row lg:items-baseline gap-1 lg:gap-3 pt-5">
            <CardTitle className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <CalendarDays className="w-[22px] h-[22px] text-foreground shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Event Selection
            </CardTitle>
            <CardDescription className="shrink-0">
              Choose which event to display on the kiosk
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 items-start">
            {/* LEFT: event controls */}
            <div className="xl:col-span-7 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <label className="text-sm font-medium text-foreground whitespace-nowrap inline-flex items-center gap-[7px]">
                  <CalendarDays className="w-[17px] h-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  Choose Event:
                </label>
                <Select value={selectedEventId || "no-event"} onValueChange={onEventSelect}>
                  <SelectTrigger className="w-full sm:w-[300px] border-primary focus:ring-primary font-bold text-[#967A59]">
                    <SelectValue placeholder="Choose Event" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {events.length > 0 ? (
                      events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          <div className="flex items-center space-x-2">
                            <CalendarDays className="w-[17px] h-[17px]" strokeWidth={1.8} aria-hidden="true" />
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
                  <CircleCheck className="w-4 h-4 text-green-500 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <span className="font-medium text-green-500">
                    Selected: {selectedEvent.name}
                  </span>
                </div>
              )}
            </div>

            {/* RIGHT: Kiosk URL & Controls */}
            {selectedEvent && (
              <div className="xl:col-span-5 space-y-6">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <Link2 className="w-[22px] h-[22px] text-foreground shrink-0" strokeWidth={1.8} aria-hidden="true" />
                    Kiosk URL & Controls
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Use this URL to set up your kiosk device
                  </CardDescription>
                </div>

                {/* URL Display */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4 lg:justify-between">
                    <code className="text-sm break-all flex-1 min-w-0">{kioskUrl}</code>
                    <button
                      onClick={handleCopyUrl}
                      className="lv-premium-shade inline-flex items-center justify-center gap-2 h-12 px-5 text-base font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors flex-shrink-0 w-full lg:w-auto"
                      aria-label="Copy kiosk URL"
                    >
                      {copied ? (
                        <Check className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                      ) : (
                        <Copy className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                      )}
                      Copy
                    </button>
                  </div>
                </div>

                {/* Action Buttons: stacked vertically full-width */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={generateQRCode}
                    disabled={isGeneratingQR}
                    className="lv-premium-shade inline-flex items-center justify-center gap-2 h-12 px-4 text-base font-medium rounded-full text-white bg-[#472c1d] hover:bg-[#3a2317] transition-colors disabled:opacity-50 disabled:pointer-events-none w-full"
                  >
                    {isGeneratingQR ? (
                      <LoaderCircle className="w-4 h-4 text-white animate-spin" strokeWidth={1.8} aria-hidden="true" />
                    ) : (
                      <QrCode className="w-4 h-4 text-white" strokeWidth={1.8} aria-hidden="true" />
                    )}
                    {isGeneratingQR ? 'Generating...' : 'Generate QR Code'}
                  </button>

                  <button
                    onClick={handleOpenKiosk}
                    disabled={isOpeningKiosk}
                    aria-label="Open kiosk in a new tab"
                    className="lv-premium-shade inline-flex items-center justify-center gap-2 h-12 px-4 text-base font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none w-full"
                  >
                    {isOpeningKiosk ? (
                      <LoaderCircle className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
                    ) : (
                      <ExternalLink className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                    )}
                    Open Kiosk
                  </button>

                  <button
                    onClick={handleFullscreen}
                    className="lv-premium-shade inline-flex items-center justify-center gap-2 h-12 px-4 text-base font-medium rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors w-full"
                  >
                    <Maximize className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                    Launch Fullscreen
                  </button>
                </div>

                {/* QR Code Display */}
                {qrCodeDataUrl && (
                  <div className="text-center p-6 bg-white rounded-lg border">
                    <h4 className="font-semibold mb-4 inline-flex items-center justify-center gap-2">
                      <QrCode className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
                      QR Code for Kiosk Setup
                    </h4>
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
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Guest Live View Configuration */}
      {selectedEvent && <KioskLiveViewConfig eventId={selectedEvent.id} />}

      {/* Setup Instructions */}
      <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <TabletSmartphone className="w-[22px] h-[22px] text-foreground shrink-0" strokeWidth={1.8} aria-hidden="true" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">1</Badge>
              <MonitorSmartphone className="w-4 h-4 mt-1 shrink-0 text-[#856A4C]" strokeWidth={1.8} aria-hidden="true" />
              <p className="text-sm">
                <strong>Choose your device:</strong> Use a tablet, laptop, or desktop computer for the kiosk
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">2</Badge>
              <Link2 className="w-4 h-4 mt-1 shrink-0 text-[#856A4C]" strokeWidth={1.8} aria-hidden="true" />
              <p className="text-sm">
                <strong>Open the kiosk URL:</strong> Navigate to the kiosk URL on your chosen device
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">3</Badge>
              <Maximize className="w-4 h-4 mt-1 shrink-0 text-[#856A4C]" strokeWidth={1.8} aria-hidden="true" />
              <p className="text-sm">
                <strong>Go fullscreen:</strong> Use the "Launch Fullscreen" button or press F11 on desktop
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">4</Badge>
              <MapPin className="w-4 h-4 mt-1 shrink-0 text-[#856A4C]" strokeWidth={1.8} aria-hidden="true" />
              <p className="text-sm">
                <strong>Position the device:</strong> Place the device at your event entrance where guests can easily access it
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">5</Badge>
              <SearchCheck className="w-4 h-4 mt-1 shrink-0 text-[#856A4C]" strokeWidth={1.8} aria-hidden="true" />
              <p className="text-sm">
                <strong>Test the interface:</strong> Try searching for a few guest names to ensure everything works properly
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#FAF6F0] rounded-lg border border-primary/30">
            <div className="flex items-start gap-2">
              <Info className="w-[18px] h-[18px] text-primary mt-0.5 flex-shrink-0" strokeWidth={1.8} aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Pro Tips:</p>
                <ul className="text-sm text-foreground/80 space-y-1">
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