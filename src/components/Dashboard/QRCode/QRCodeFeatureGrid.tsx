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
  onNavigateToTab?: (tab: string) => void;
}

const featureCards = [
  {
    id: 'qr-seating-chart-signage',
    title: 'QR Code Seating Chart Signage',
    description: 'Ready-to-print signage templates with QR codes',
    icon: FileImage,
    status: 'active',
    action: 'Create',
  },
  {
    id: 'table-seating-chart',
    title: 'Table Seating Chart',
    description: 'Downloadable table layouts with guest assignments',
    icon: Users,
    status: 'active',
    action: 'Generate',
  },
  {
    id: 'full-seating-chart',
    title: 'Full Seating Chart',
    description: 'Complete guest list with check-off boxes',
    icon: FileText,
    status: 'active',
    action: 'Generate',
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

export const QRCodeFeatureGrid: React.FC<QRCodeFeatureGridProps> = ({ eventId, onNavigateToTab }) => {
  const handleFeatureClick = (cardId: string) => {
    if (cardId === 'qr-seating-chart-signage') {
      onNavigateToTab?.('signage');
    } else if (cardId === 'table-seating-chart') {
      onNavigateToTab?.('table-chart');
    } else if (cardId === 'full-seating-chart') {
      onNavigateToTab?.('full-seating-chart');
    }
  };
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold gradient-text mb-2">QR Code Features</h2>
        <p className="text-muted-foreground">
          Comprehensive tools for creating the perfect seating experience
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {featureCards.map((card) => {
          const Icon = card.icon;
          const isActive = card.status === 'active';
          const isComingSoon = card.status === 'coming-soon';
          const isPlaceholder = card.status === 'placeholder';

          return (
            <Card 
              key={card.id} 
              className={`ww-box relative transition-all duration-200 hover:shadow-lg ${
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
                  onClick={() => isActive && handleFeatureClick(card.id)}
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
      <Card className="ww-box bg-gradient-subtle border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm mb-1">Development Progress</h3>
              <p className="text-xs text-muted-foreground">
                Features are being developed to provide comprehensive seating management tools.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">3/4 Active</Badge>
              <Badge variant="secondary" className="text-xs">1 Planned</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};