import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  Eye, 
  FileImage, 
  Users, 
  ChefHat, 
  FileText, 
  CreditCard, 
  Monitor, 
  Printer,
  Settings
} from 'lucide-react';

interface QRCodeFeatureGridProps {
  eventId: string;
}

const featureCards = [
  {
    id: 'qr-seating-chart',
    title: 'QR Code Seating Chart',
    description: 'Main QR code generator with customization options',
    icon: QrCode,
    status: 'active',
    action: 'Customize',
  },
  {
    id: 'live-view',
    title: 'Live View',
    description: 'Preview what guests see when they scan the QR code',
    icon: Eye,
    status: 'coming-soon',
    action: 'Preview',
  },
  {
    id: 'qr-signage',
    title: 'QR Code Signage',
    description: 'Ready-to-print signage templates with QR codes',
    icon: FileImage,
    status: 'coming-soon',
    action: 'Create',
  },
  {
    id: 'table-seating-chart',
    title: 'Table Seating Chart',
    description: 'Downloadable table layouts with guest assignments',
    icon: Users,
    status: 'coming-soon',
    action: 'Generate',
  },
  {
    id: 'kitchen-dietary',
    title: 'Kitchen Dietary List',
    description: 'Staff dietary requirements and allergies sheet',
    icon: ChefHat,
    status: 'coming-soon',
    action: 'Export',
  },
  {
    id: 'full-seating-chart',
    title: 'Full Seating Chart',
    description: 'Complete guest list with check-off boxes',
    icon: FileText,
    status: 'coming-soon',
    action: 'Download',
  },
  {
    id: 'place-cards',
    title: 'Table Name Place Cards',
    description: 'Individual foldable place cards for guests',
    icon: CreditCard,
    status: 'coming-soon',
    action: 'Create',
  },
  {
    id: 'kiosk-view',
    title: 'Kiosk Live View',
    description: 'Full-screen self-service seating lookup',
    icon: Monitor,
    status: 'coming-soon',
    action: 'Setup',
  },
  {
    id: 'printables',
    title: 'Printables',
    description: 'Various print templates and materials',
    icon: Printer,
    status: 'coming-soon',
    action: 'Browse',
  },
  {
    id: 'additional',
    title: 'Additional Features',
    description: 'More features and customization options',
    icon: Settings,
    status: 'placeholder',
    action: 'Explore',
  },
];

export const QRCodeFeatureGrid: React.FC<QRCodeFeatureGridProps> = ({ eventId }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold gradient-text mb-2">QR Code Features</h2>
        <p className="text-muted-foreground">
          Comprehensive tools for creating the perfect seating experience
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {featureCards.map((card) => {
          const Icon = card.icon;
          const isActive = card.status === 'active';
          const isComingSoon = card.status === 'coming-soon';
          const isPlaceholder = card.status === 'placeholder';

          return (
            <Card 
              key={card.id} 
              className={`relative transition-all duration-200 hover:shadow-lg ${
                isActive 
                  ? 'border-primary/50 shadow-purple-glow/20' 
                  : isComingSoon 
                    ? 'border-warning/30' 
                    : 'border-muted-foreground/20'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${
                    isActive 
                      ? 'bg-primary/10' 
                      : isComingSoon 
                        ? 'bg-warning/10' 
                        : 'bg-muted/50'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      isActive 
                        ? 'text-primary' 
                        : isComingSoon 
                          ? 'text-warning' 
                          : 'text-muted-foreground'
                    }`} />
                  </div>
                  <Badge 
                    variant={isActive ? "default" : isComingSoon ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {isActive ? 'Active' : isComingSoon ? 'Soon' : 'Planned'}
                  </Badge>
                </div>
                <CardTitle className="text-sm leading-tight">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-xs mb-4 leading-relaxed">
                  {card.description}
                </CardDescription>
                <Button 
                  variant={isActive ? "default" : "outline"} 
                  size="sm" 
                  className="w-full text-xs"
                  disabled={!isActive}
                >
                  {card.action}
                </Button>
              </CardContent>

              {/* Coming Soon Overlay */}
              {(isComingSoon || isPlaceholder) && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Badge variant="outline" className="bg-background/80">
                    {isComingSoon ? 'Coming Soon' : 'Planned Feature'}
                  </Badge>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Development Status Info */}
      <Card className="bg-gradient-subtle border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm mb-1">Development Progress</h3>
              <p className="text-xs text-muted-foreground">
                QR Code generation is now active. Additional features will be rolled out in upcoming updates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">1/10 Active</Badge>
              <Badge variant="secondary" className="text-xs">9 Coming Soon</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};