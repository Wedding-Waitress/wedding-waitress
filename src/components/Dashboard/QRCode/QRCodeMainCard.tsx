import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { QrCode as QrCodeIcon, Copy, Download, RotateCcw, Save, Printer, FileImage } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { buildGuestLookupUrl } from '@/lib/urlUtils';

interface QRCodeMainCardProps {
  eventId: string;
}

export const QRCodeMainCard: React.FC<QRCodeMainCardProps> = ({ eventId }) => {
  const { events } = useEvents();
  const { toast } = useToast();
  
  const selectedEvent = events.find(event => event.id === eventId);
  const eventUrl = selectedEvent?.slug ? buildGuestLookupUrl(selectedEvent.slug) : `https://…/live-view/${eventId}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      toast({
        title: "URL copied!",
        description: "The event URL has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy URL. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="ww-box h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCodeIcon className="h-5 w-5" />
          QR Code Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* URL Header Row */}
        <div className="space-y-2">
          <Label htmlFor="qr-event-url" className="text-sm font-medium">URL</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="qr-event-url"
              value={eventUrl}
              readOnly
              className="flex-1"
              placeholder="https://…/live-view/{eventId}"
            />
            <Button
              id="btn-copy-url"
              variant="outline"
              size="sm"
              onClick={handleCopyUrl}
              className="shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Preview (Larger) */}
          <div id="qr-left" className="lg:col-span-2">
            <Card className="bg-white border-2 border-primary/20 rounded-lg">
              <CardContent className="p-6">
                {/* QR Preview */}
                <div className="flex justify-center mb-6">
                  <div 
                    id="qr-preview"
                    className="w-full max-w-[460px] aspect-square min-h-[360px] bg-muted/20 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center"
                  >
                    <QrCodeIcon className="h-24 w-24 text-muted-foreground/50" />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-2">
                  <Button id="btn-save-qr" variant="default" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button id="btn-reset-qr" variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button id="btn-dl-png" variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    PNG
                  </Button>
                  <Button id="btn-dl-jpg" variant="outline" size="sm">
                    <FileImage className="h-4 w-4 mr-2" />
                    JPG
                  </Button>
                  <Button id="btn-dl-svg" variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    SVG
                  </Button>
                  <Button id="btn-print-qr" variant="outline" size="sm">
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Controls (Narrower) */}
          <div id="qr-right">
            <Card className="bg-white border-2 border-primary/20 rounded-lg">
              <CardContent className="p-4">
                <Accordion 
                  id="qr-controls" 
                  type="single" 
                  collapsible
                  className="w-full"
                >
                  <AccordionItem value="colors">
                    <AccordionTrigger className="text-sm font-medium hover:text-primary">
                      Colors
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      {/* Colors controls will go here */}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="design">
                    <AccordionTrigger className="text-sm font-medium hover:text-primary">
                      Design
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      {/* Design controls will go here */}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="logo">
                    <AccordionTrigger className="text-sm font-medium hover:text-primary">
                      Logo
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      {/* Logo controls will go here */}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="frame">
                    <AccordionTrigger className="text-sm font-medium hover:text-primary">
                      Frame
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      {/* Frame controls will go here */}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};