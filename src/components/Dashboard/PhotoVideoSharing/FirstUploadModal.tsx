import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FirstUploadModalProps {
  mediaItem: {
    file_url: string;
    type: string;
  };
  eventData: {
    event_display_name?: string;
    name: string;
  };
  qrCodeUrl: string;
  open: boolean;
  onClose: () => void;
}

export const FirstUploadModal: React.FC<FirstUploadModalProps> = ({
  mediaItem,
  eventData,
  qrCodeUrl,
  open,
  onClose,
}) => {
  const getMediaUrl = (filePath: string) => {
    return filePath;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <div className="text-center space-y-6 py-6">
          <div className="text-6xl">💪</div>
          <h2 className="text-3xl font-bold">Good Job!</h2>
          <p className="text-xl text-muted-foreground">
            You have just added your first photo to your event.
          </p>

          {/* Preview Card with QR Overlay */}
          <Card className="relative overflow-hidden border-2">
            <div className="aspect-video relative bg-muted">
              {mediaItem.type === 'image' ? (
                <img
                  src={getMediaUrl(mediaItem.file_url)}
                  alt="First upload"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={getMediaUrl(mediaItem.file_url)}
                  className="w-full h-full object-cover"
                />
              )}
              {/* QR Code Overlay in Corner */}
              <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg">
                <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24" />
              </div>
            </div>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg">
                {eventData.event_display_name || eventData.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Share the QR code with your guests to start collecting memories
              </p>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 px-8"
            onClick={onClose}
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
