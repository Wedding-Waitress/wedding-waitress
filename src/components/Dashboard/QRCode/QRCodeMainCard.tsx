import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode as QrCodeIcon } from 'lucide-react';

interface QRCodeMainCardProps {
  eventId: string;
}

export const QRCodeMainCard: React.FC<QRCodeMainCardProps> = ({ eventId }) => {
  return (
    <Card className="ww-box h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCodeIcon className="h-5 w-5" />
          QR Code Generator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div id="qr-generator-body" style={{minHeight: "360px"}}></div>
      </CardContent>
    </Card>
  );
};