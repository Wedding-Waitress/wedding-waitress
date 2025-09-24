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
    
    // Create seats for all positions, filling in guests where available
    for (let i = 1; i <= seatCount; i++) {
      let guest = sortedGuests.find(g => g.seat_no === i);
      
      // If no guest assigned to this seat, try to assign unassigned guests
      if (!guest) {
        guest = sortedGuests.find(g => !g.seat_no || g.seat_no === 0);
        if (guest) {
          // Temporarily assign seat number for display
          guest = { ...guest, seat_no: i };
        }
      }
      
      const angle = ((i - 1) / seatCount) * 2 * Math.PI - Math.PI / 2; // Start from top
      
      // Calculate position on circle (relative to center)
      let radius = settings.tableShape === 'round' ? 42 : 40;
      
      // For square tables, move specific chairs further out to avoid table overlap
      if (settings.tableShape === 'square' && [2, 5, 7, 10].includes(i)) {
        radius = 48; // Move these chairs further out
      }
      
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
            maxHeight: '900px',
            minHeight: '600px'
          }}
        >
          <div className="h-full flex flex-col p-6 relative">
            {/* Line 1: Event Info */}
            <div className="text-center mb-4 space-y-1">
              <div className="font-semibold text-xl">
                {event.name} • {event.venue} • {event.date ? format(new Date(event.date), 'PPP') : ''}
              </div>
              <div className="font-semibold text-xl">
                Table Seating Arrangements
              </div>
            </div>


            {/* Line 3: Table Visualization */}
            <div className="flex-1 flex items-center justify-center mb-6">
              <div className="relative" style={{ width: '500px', height: '450px' }}>
                {/* Table */}
                <div 
                  className={`absolute border border-gray-800 flex items-center justify-center bg-gray-50 ${
                    settings.tableShape === 'round' ? 'rounded-full' : 'rounded-lg'
                  }`}
                  style={{ 
                    left: '50%', 
                    top: '50%', 
                    transform: 'translate(-50%, -50%)',
                    width: '280px', // Increased from 200px
                    height: '280px' // Increased from 200px
                  }}
                >
                  <div className={`font-bold ${getTitleSize(settings.fontSize)} text-gray-700 text-center`}>
                    <div>TABLE</div>
                    <div>{table.table_no}</div>
                  </div>
                </div>

                {/* Seats */}
                {seats.map((seat) => {
                  // Calculate name positioning - closer to chairs for both table types
                  const nameRadius = settings.tableShape === 'round' ? 48 : 46; // Brought closer to chairs
                  let nameX = 50 + nameRadius * Math.cos(seat.angle);
                  let nameY = 50 + nameRadius * Math.sin(seat.angle);
                  
                  return (
                    <div key={seat.number}>
                      {/* Seat Circle with thin black border */}
                      <div
                        className="absolute w-14 h-14 border border-black rounded-full bg-white flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 shadow-md"
                        style={{
                          left: `${seat.x}%`,
                          top: `${seat.y}%`,
                        }}
                      >
                        {settings.showSeatNumbers && (
                          <span className="font-bold text-sm">{seat.number}</span>
                        )}
                      </div>

                      {/* Guest Name - Only first name, positioned to avoid overlaps */}
                      {seat.guest && (
                        <div
                          className={`absolute transform -translate-x-1/2 font-semibold ${getFontSize(settings.fontSize)} text-center max-w-20`}
                          style={{
                            left: `${nameX}%`,
                            top: `${nameY}%`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <div className="bg-white/90 px-2 py-1 rounded text-gray-800 shadow-sm">
                            {seat.guest.first_name}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Line 4 & 5: Guest List */}
            {settings.includeGuestList && (
              <div className="mb-6">
                <h3 className={`font-bold mb-3 ${getFontSize(settings.fontSize)}`}>
                  Guests on this Table & Dietary
                </h3>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {sortedGuests.map((guest, index) => (
                    <div key={guest.id} className="truncate">
                      {index + 1}. {guest.first_name} {guest.last_name}
                      {settings.includeDietary && guest.dietary && guest.dietary !== 'NA' && (
                        <span> - {guest.dietary}</span>
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