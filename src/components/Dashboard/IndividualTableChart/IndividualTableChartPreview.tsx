import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

  // Helper function to determine chair side for square tables
  const getChairSide = (angle: number) => {
    // Normalize angle to 0-2π
    const normalizedAngle = ((angle + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    
    if (normalizedAngle >= 7 * Math.PI / 4 || normalizedAngle < Math.PI / 4) return 'top';
    if (normalizedAngle >= Math.PI / 4 && normalizedAngle < 3 * Math.PI / 4) return 'right';
    if (normalizedAngle >= 3 * Math.PI / 4 && normalizedAngle < 5 * Math.PI / 4) return 'bottom';
    return 'left';
  };

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
      // Reduced chair radius for round tables (closer to table)
      let radius = settings.tableShape === 'round' ? 37 : 40;
      
      // Move seats 1 and 6 outward by additional 2.5% (~10px) to avoid touching table
      if (settings.tableShape === 'round' && (i === 1 || i === 6)) {
        radius = 39.5;
      }
      
      // For square tables, move specific chairs further out to avoid table overlap
      if (settings.tableShape === 'square' && [2, 5, 7, 10].includes(i)) {
        radius = 48; // Move these chairs further out
      }
      
      const x = 50 + radius * Math.cos(angle); // Center at 50%
      const y = 50 + radius * Math.sin(angle);
      
      // Calculate label position for square tables
      let labelX = x;
      let labelY = y;
      let textAlign = 'center';
      
      if (settings.tableShape === 'square' && guest) {
        const side = getChairSide(angle);
        const chairSize = 14; // 56px / 4 = 14% (w-14 h-14)
        const offset = 3.5; // 14px offset converted to percentage
        
        switch (side) {
          case 'right':
            labelX = x + chairSize/2 + offset;
            labelY = y;
            textAlign = 'left';
            break;
          case 'left':
            labelX = x - chairSize/2 - offset;
            labelY = y;
            textAlign = 'right';
            break;
          case 'top':
            labelX = x;
            labelY = y - chairSize/2 - offset;
            textAlign = 'center';
            break;
          case 'bottom':
            labelX = x;
            labelY = y + chairSize/2 + offset;
            textAlign = 'center';
            break;
        }
      } else if (settings.tableShape === 'round' && guest) {
        // Position labels 26px outward from chair edge for round tables (+10px adjustment)
        const chairRadius = i === 1 || i === 6 ? 39.5 : 37; // Account for moved chairs
        const labelOffset = 6.5; // 26px converted to percentage (26/400 * 100)
        const labelRadius = chairRadius + labelOffset;
        labelX = 50 + labelRadius * Math.cos(angle);
        labelY = 50 + labelRadius * Math.sin(angle);
        
        // Determine text alignment based on angle (hemisphere)
        const angleDegrees = (angle * 180) / Math.PI;
        if (angleDegrees >= -90 && angleDegrees <= 90) {
          // Right hemisphere - left align text
          textAlign = 'left';
        } else {
          // Left hemisphere - right align text
          textAlign = 'right';
        }
      }
      
      seats.push({
        number: i,
        guest,
        x,
        y,
        angle,
        labelX,
        labelY,
        textAlign
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
                <TooltipProvider>
                  {seats.map((seat) => {
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

                        {/* Guest Name - Side-aware positioning for square tables */}
                        {seat.guest && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute font-semibold ${getFontSize(settings.fontSize)} max-w-20 cursor-help`}
                                style={{
                                  left: `${seat.labelX}%`,
                                  top: `${seat.labelY}%`,
                                  textAlign: seat.textAlign as any,
                                  transform: seat.textAlign === 'center' ? 'translate(-50%, -50%)' : 
                                           seat.textAlign === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                <div className="bg-white/90 px-2 py-1 rounded text-gray-800 shadow-sm">
                                  {seat.guest.first_name}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{seat.guest.first_name} {seat.guest.last_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </TooltipProvider>
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