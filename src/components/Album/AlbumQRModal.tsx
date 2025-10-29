import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Link2, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildGalleryUploadUrl } from '@/lib/urlUtils';
import QRCodeLib from 'qrcode';

interface AlbumQRModalProps {
  eventSlug: string;
  eventName: string;
  onClose: () => void;
}

export const AlbumQRModal = ({ eventSlug, eventName, onClose }: AlbumQRModalProps) => {
  const { toast } = useToast();
  const uploadCanvasRef = useRef<HTMLCanvasElement>(null);
  const galleryCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState('upload');

  const uploadUrl = buildGalleryUploadUrl(eventSlug);
  const galleryUrl = `${buildGalleryUploadUrl(eventSlug)}#gallery`;

  useEffect(() => {
    generateQRCodes();
  }, [uploadUrl, galleryUrl]);

  const generateQRCodes = async () => {
    try {
      if (uploadCanvasRef.current) {
        await QRCodeLib.toCanvas(uploadCanvasRef.current, uploadUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#6D28D9',
            light: '#FFFFFF',
          },
        });
      }
      if (galleryCanvasRef.current) {
        await QRCodeLib.toCanvas(galleryCanvasRef.current, galleryUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#6D28D9',
            light: '#FFFFFF',
          },
        });
      }
    } catch (error) {
      console.error('QR generation error:', error);
    }
  };

  const copyToClipboard = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied!', description: `${label} copied to clipboard` });
  };

  const downloadQRCode = (canvas: HTMLCanvasElement | null, filename: string) => {
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `${eventName}-${filename}.png`;
    link.href = canvas.toDataURL();
    link.click();
    
    toast({ title: 'Downloaded!', description: 'QR code saved to your device' });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            QR Codes for {eventName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Link</TabsTrigger>
            <TabsTrigger value="gallery">Gallery Link</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Guests scan this to upload photos, videos, voice messages, and guestbook entries
              </p>
              <div className="bg-white p-6 rounded-lg inline-block shadow-sm">
                <canvas ref={uploadCanvasRef} />
              </div>
              <div className="mt-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => copyToClipboard(uploadUrl, 'Upload link')}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Copy Upload Link
                </Button>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => downloadQRCode(uploadCanvasRef.current, 'upload-qr')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {uploadUrl}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Guests scan this to view the gallery and see all approved photos & videos
              </p>
              <div className="bg-white p-6 rounded-lg inline-block shadow-sm">
                <canvas ref={galleryCanvasRef} />
              </div>
              <div className="mt-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => copyToClipboard(galleryUrl, 'Gallery link')}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Copy Gallery Link
                </Button>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => downloadQRCode(galleryCanvasRef.current, 'gallery-qr')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {galleryUrl}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Tip:</strong> Print these QR codes and place them at your venue for easy guest access!
        </div>
      </DialogContent>
    </Dialog>
  );
};
