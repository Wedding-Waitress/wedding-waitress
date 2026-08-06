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

  // Auto-generate the QR code whenever the selected event (and thus URL) changes.
  React.useEffect(() => {
    let cancelled = false;
    if (!kioskUrl) {
      setQrCodeDataUrl('');
      return;
    }
    QRCode.toDataURL(kioskUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then((url) => { if (!cancelled) setQrCodeDataUrl(url); })
      .catch(() => { if (!cancelled) setQrCodeDataUrl(''); });
    return () => { cancelled = true; };
  }, [kioskUrl]);

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

        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Choose Event row */}
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

          {/* Full-width divider */}
          <hr className="w-full border-t border-[#472c1d]" />

          {/* Two equal boxes: Kiosk URL & Controls | Setup Instructions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* LEFT: Kiosk URL & Controls */}
            <div className="h-full rounded-lg border border-[#472c1d] p-5 space-y-5">
              <div>
                <h3 className="flex items-center gap-2 text-[20px] font-bold text-[#472c1d]">
                  <Link2 className="w-[22px] h-[22px] text-[#472c1d] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  Kiosk URL &amp; Controls
                </h3>
                <CardDescription className="mt-1">
                  Use this URL to set up your kiosk device
                </CardDescription>
              </div>

              {!selectedEvent ? (
                <p className="text-sm text-muted-foreground">
                  Choose an event above to generate your kiosk link and QR code.
                </p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                  {/* QR Code */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-[#472c1d] text-center">
                    <h4 className="font-semibold mb-3 inline-flex items-center justify-center gap-2">
                      <QrCode className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
                      QR Code for Kiosk Setup
                    </h4>
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="Kiosk QR Code"
                        className="mx-auto mb-3 max-w-full h-auto"
                      />
                    ) : (
                      <div className="w-full aspect-square max-w-[200px] flex items-center justify-center text-sm text-muted-foreground mb-3">
                        Generating QR code...
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Scan this QR code to quickly open the kiosk on a tablet or mobile device
                    </p>
                  </div>

                  {/* URL + Actions */}
                  <div className="flex flex-col gap-3 justify-center">
                    <div className="p-4 bg-muted rounded-lg flex flex-col gap-3">
                      <code className="text-sm break-all block">{kioskUrl}</code>
                      <button
                        onClick={handleCopyUrl}
                        className="lv-premium-shade inline-flex items-center justify-center gap-2 h-12 px-5 text-base font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors w-full"
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
                </div>
              )}
            </div>

            {/* RIGHT: Setup Instructions */}
            <div className="h-full rounded-lg border border-[#472c1d] p-5 space-y-4">
              <h3 className="flex items-center gap-2 text-[20px] font-bold text-[#472c1d]">
                <TabletSmartphone className="w-[22px] h-[22px] text-[#472c1d] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                Setup Instructions
              </h3>

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

              <div className="p-4 bg-[#FAF6F0] rounded-lg border border-[#472c1d]">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guest Live View Configuration */}
      {selectedEvent && <KioskLiveViewConfig eventId={selectedEvent.id} />}
    </div>
  );
};
