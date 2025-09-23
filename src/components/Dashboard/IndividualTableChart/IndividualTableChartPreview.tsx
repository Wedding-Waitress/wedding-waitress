import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Guest } from '@/hooks/useGuests';
import { TableWithGuestCount } from '@/hooks/useTables';
import { IndividualChartSettings } from './IndividualTableSeatingChartPage';
import weddingWaitressLogo from '@/assets/wedding-waitress-logo.png';

interface IndividualTableChartPreviewProps {
  settings: IndividualChartSettings;
  table: TableWithGuestCount;
  guests: Guest[];
  event: any;
}

export const IndividualTableChartPreview: React.FC<IndividualTableChartPreviewProps> = ({
  settings,
  table,
  guests,
  event,
}) => {
  // Filter guests for this specific table
  const tableGuests = guests.filter(guest => guest.table_id === table.id);
  
  // Sort guests by seat number
  const sortedGuests = tableGuests.sort((a, b) => {
    const seatA = a.seat_no || 0;
    const seatB = b.seat_no || 0;
    return seatA - seatB;
  });

  // Arrange seats around the table
  const arrangeSeats = () => {
    const seatCount = table.limit_seats;
    const seats = [];
    
    for (let i = 1; i <= seatCount; i++) {
      const guest = sortedGuests.find(g => g.seat_no === i);
      const angle = ((i - 1) / seatCount) * 2 * Math.PI - Math.PI / 2; // Start from top
      
      // Calculate position on circle (relative to center)
      const radius = settings.tableShape === 'round' ? 45 : 40;
      const x = 50 + radius * Math.cos(angle); // Center at 50%
      const y = 50 + radius * Math.sin(angle);
      
      seats.push({
        number: i,
        guest,
        x,
        y,
        angle
      });
    }
    
    return seats;
  };

  const seats = arrangeSeats();
  
  // Get font size classes
  const getFontSize = (size: string) => {
    switch (size) {
      case 'small': return 'text-xs';
      case 'large': return 'text-lg';
      default: return 'text-sm';
    }
  };

  const getTitleSize = (size: string) => {
    switch (size) {
      case 'small': return 'text-lg';
      case 'large': return 'text-3xl';
      default: return 'text-2xl';
    }
  };

  return (
    <Card className="ww-box">
      <CardContent className="p-0">
        {/* A4 Preview Container */}
        <div 
          className="w-full bg-white text-black print:shadow-none shadow-lg mx-auto"
          style={{ 
            aspectRatio: '210/297', // A4 aspect ratio
            maxHeight: '800px'
          }}
        >
          <div className="h-full flex flex-col p-8 relative">
            {/* Line 1: Event Info */}
            <div className={`text-center mb-4 ${getFontSize(settings.fontSize)}`}>
              <div className="font-semibold">
                {event.name} • {event.venue} • {event.date ? format(new Date(event.date), 'PPP') : ''}
              </div>
            </div>

            {/* Line 2: Table Title */}
            <div className={`text-center mb-8 ${getTitleSize(settings.fontSize)} font-bold`}>
              {settings.title || `TABLE ${table.table_no}`}
            </div>

            {/* Line 3: Table Visualization */}
            <div className="flex-1 flex items-center justify-center mb-8">
              <div className="relative" style={{ width: '400px', height: '400px' }}>
                {/* Table */}
                <div 
                  className={`absolute inset-0 border-4 border-gray-800 flex items-center justify-center bg-gray-50 ${
                    settings.tableShape === 'round' ? 'rounded-full' : 'rounded-lg'
                  }`}
                  style={{ 
                    left: '50%', 
                    top: '50%', 
                    transform: 'translate(-50%, -50%)',
                    width: '200px',
                    height: '200px'
                  }}
                >
                  <div className={`font-bold ${getTitleSize(settings.fontSize)} text-gray-700`}>
                    {table.table_no}
                  </div>
                </div>

                {/* Seats */}
                {seats.map((seat) => (
                  <div key={seat.number}>
                    {/* Seat Circle */}
                    <div
                      className="absolute w-12 h-12 border-2 border-gray-800 rounded-full bg-white flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${seat.x}%`,
                        top: `${seat.y}%`,
                      }}
                    >
                      {settings.showSeatNumbers && (
                        <span className="font-semibold text-xs">{seat.number}</span>
                      )}
                    </div>

                    {/* Guest Name */}
                    {settings.includeNames && seat.guest && (
                      <div
                        className={`absolute transform -translate-x-1/2 font-medium ${getFontSize(settings.fontSize)}`}
                        style={{
                          left: `${seat.x}%`,
                          top: `${seat.y + (seat.y < 50 ? -8 : 8)}%`, // Position above or below based on seat position
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {seat.guest.first_name} {seat.guest.last_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Line 4 & 5: Guest List */}
            {settings.includeGuestList && (
              <div className="mb-8">
                <h3 className={`font-bold mb-4 ${getFontSize(settings.fontSize)}`}>
                  Guest's on this Table & Dietary
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {sortedGuests.map((guest, index) => (
                    <div key={guest.id} className={`flex justify-between items-center ${getFontSize(settings.fontSize)}`}>
                      <span>
                        {index + 1}. {guest.first_name} {guest.last_name}
                      </span>
                      {settings.includeDietary && guest.dietary && guest.dietary !== 'NA' && (
                        <Badge variant="outline" className="text-xs">
                          {guest.dietary}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Line 6: Logo */}
            {settings.showLogo && (
              <div className="flex justify-center mt-auto">
                <img 
                  src={weddingWaitressLogo} 
                  alt="Wedding Waitress" 
                  className="h-8 opacity-60"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};