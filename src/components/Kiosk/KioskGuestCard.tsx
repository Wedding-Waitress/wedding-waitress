import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  MapPin, 
  Utensils,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  table_no: number | null;
  table_id: string | null;
  seat_no?: number | null;
  relation_display?: string;
  rsvp: string;
  dietary?: string;
  table_name?: string;
}

interface KioskGuestCardProps {
  guest: Guest;
}

export const KioskGuestCard: React.FC<KioskGuestCardProps> = ({ guest }) => {
  const getRSVPColor = (rsvp: string) => {
    switch (rsvp.toLowerCase()) {
      case 'attending':
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRSVPIcon = (rsvp: string) => {
    switch (rsvp.toLowerCase()) {
      case 'attending':
      case 'confirmed':
        return CheckCircle2;
      case 'pending':
        return Clock;
      case 'declined':
        return XCircle;
      default:
        return Clock;
    }
  };

  const RSVPIcon = getRSVPIcon(guest.rsvp);

  return (
    <Card className="bg-white shadow-xl border-2 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
      <CardContent className="p-8">
        {/* Guest Name */}
        <div className="flex items-center mb-6">
          <div className="p-3 bg-primary/10 rounded-full mr-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground">
              {guest.first_name} {guest.last_name}
            </h3>
            {guest.relation_display && (
              <p className="text-lg text-muted-foreground">
                {guest.relation_display}
              </p>
            )}
          </div>
        </div>

        {/* Table Assignment */}
        <div className="space-y-4 mb-6">
          {guest.table_no ? (
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center">
                <MapPin className="w-6 h-6 text-primary mr-3" />
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    Table {guest.table_no}
                  </p>
                  {guest.table_name && (
                    <p className="text-sm text-muted-foreground">
                      {guest.table_name}
                    </p>
                  )}
                </div>
              </div>
              {guest.seat_no && (
                <div className="text-right">
                  <p className="text-lg font-semibold text-primary">
                    Seat {guest.seat_no}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <MapPin className="w-6 h-6 text-orange-500 mr-3" />
              <p className="text-lg font-medium text-orange-800">
                Table assignment pending
              </p>
            </div>
          )}
        </div>

        {/* RSVP Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <RSVPIcon className="w-5 h-5 mr-2" />
            <span className="text-lg font-medium text-foreground">RSVP Status:</span>
          </div>
          <Badge className={`px-4 py-2 text-lg font-medium ${getRSVPColor(guest.rsvp)}`}>
            {guest.rsvp}
          </Badge>
        </div>

        {/* Dietary Requirements */}
        {guest.dietary && guest.dietary !== 'NA' && guest.dietary !== 'None' && (
          <div className="flex items-start p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Utensils className="w-5 h-5 text-blue-500 mr-3 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">Dietary Requirements:</p>
              <p className="text-sm text-blue-700">{guest.dietary}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};