import React from 'react';
import { Button } from '@/components/ui/button';
import { Link, Mail, Phone, MessageSquare, Wifi, User, Calendar, CreditCard } from 'lucide-react';

interface QRCodeTypeSelectorProps {
  activeType: string;
  onTypeChange: (type: string) => void;
}

const qrTypes = [
  { id: 'url', label: 'URL', icon: Link },
  { id: 'text', label: 'Text', icon: MessageSquare },
  { id: 'email', label: 'E-mail', icon: Mail },
  { id: 'phone', label: 'Phone', icon: Phone },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
  { id: 'vcard', label: 'V-card', icon: User },
  { id: 'event', label: 'Event', icon: Calendar },
  { id: 'paypal', label: 'PayPal', icon: CreditCard },
];

export const QRCodeTypeSelector: React.FC<QRCodeTypeSelectorProps> = ({
  activeType,
  onTypeChange,
}) => {
  return (
    <div className="flex flex-wrap gap-2 p-4 bg-background border-b">
      {qrTypes.map((type) => {
        const Icon = type.icon;
        return (
          <Button
            key={type.id}
            variant={activeType === type.id ? "default" : "outline"}
            size="sm"
            onClick={() => onTypeChange(type.id)}
            className={`flex items-center gap-2 ${
              activeType === type.id 
                ? "bg-primary text-primary-foreground" 
                : "bg-background hover:bg-accent"
            }`}
          >
            <Icon className="h-4 w-4" />
            {type.label}
          </Button>
        );
      })}
    </div>
  );
};