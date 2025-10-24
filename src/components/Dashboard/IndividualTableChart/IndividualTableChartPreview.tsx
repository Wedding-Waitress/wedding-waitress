/**
 * ⚠️ PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL ⚠️
 * 
 * This Individual Table Charts feature is COMPLETE and LOCKED.
 * All functionality has been thoroughly tested and approved.
 * 
 * DO NOT make changes unless explicitly requested by the project owner.
 * Any modifications could break the carefully calibrated A4 export system,
 * seat positioning algorithms, and multi-table PDF generation.
 * 
 * Last completed: 2025-10-04
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { Guest } from '@/hooks/useGuests';
import { TableWithGuestCount } from '@/hooks/useTables';
import { IndividualChartSettings } from './IndividualTableSeatingChartPage';
import weddingWaitressLogo from '@/assets/wedding-waitress-new-logo.png';

interface IndividualTableChartPreviewProps {
  settings: IndividualChartSettings;
  table: TableWithGuestCount;
  guests: Guest[];
  event: any;
  totalTables?: number;
  currentTableIndex?: number;
}

export const IndividualTableChartPreview: React.FC<IndividualTableChartPreviewProps> = ({
  settings,
  table,
  guests,
  event,
  totalTables = 1,
  currentTableIndex = 1,
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

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const ordinalSuffix = getOrdinalSuffix(day);
    const month = date.toLocaleDateString('en-GB', { month: 'long' });
    const year = date.getFullYear();
    return `${day}${ordinalSuffix} ${month} ${year}`;
  };

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
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
      
      let x, y, labelX, labelY, textAlign, angle;
      
      if (settings.tableShape === 'square') {
        // SQUARE TABLE: Position chairs evenly along the 4 sides
        const seatsPerSide = Math.ceil(seatCount / 4);
        const side = Math.floor((i - 1) / seatsPerSide); // 0=top, 1=right, 2=bottom, 3=left
        const positionOnSide = (i - 1) % seatsPerSide;
        const sideFraction = (positionOnSide + 1) / (seatsPerSide + 1); // Evenly spaced
        
        const chairSize = 14; // 56px / 4 = 14% (w-14 h-14)
        const offset = 2.8; // 14px offset for labels
        
        switch (side) {
          case 0: // Top
            x = 20 + (sideFraction * 60); // Spread across top (20% to 80%)
            y = 10; // Fixed y at top
            labelX = x;
            labelY = y - chairSize/2 - offset;
            textAlign = 'center';
            angle = -Math.PI / 2; // For compatibility
            break;
          case 1: // Right
            x = 85; // Move inward to match top/bottom spacing
            y = 20 + (sideFraction * 60); // Spread down right side
            labelX = x + chairSize/2 + offset;
            labelY = y;
            textAlign = 'left';
            angle = 0; // For compatibility
            break;
          case 2: // Bottom
            x = 20 + (sideFraction * 60); // Spread across bottom
            y = 90; // Fixed y at bottom
            labelX = x;
            labelY = y + chairSize/2 + offset;
            textAlign = 'center';
            angle = Math.PI / 2; // For compatibility
            break;
          case 3: // Left
          default:
            x = 15; // Move inward to match top/bottom spacing
            y = 20 + (sideFraction * 60); // Spread down left side
            labelX = x - chairSize/2 - offset;
            labelY = y;
            textAlign = 'right';
            angle = Math.PI; // For compatibility
            break;
        }
        
        // Override label position if no guest
        if (!guest) {
          labelX = x;
          labelY = y;
        }
        
      } else {
        // ROUND TABLE: Use pixel-based positioning for perfect circle
        angle = ((i - 1) / seatCount) * 2 * Math.PI - Math.PI / 2; // Start from top
        
        // Use height (smaller dimension) to ensure perfect circle
        const containerWidth = 500;
        const containerHeight = 450;
        const centerX = containerWidth / 2; // 250px
        const centerY = containerHeight / 2; // 225px
        const radiusPixels = (37 / 100) * containerHeight; // Base on smaller dimension
        
        // Calculate position in pixels for perfect circle
        const xPixels = centerX + radiusPixels * Math.cos(angle);
        const yPixels = centerY + radiusPixels * Math.sin(angle);
        
        // Convert back to percentage for CSS positioning
        x = (xPixels / containerWidth) * 100;
        y = (yPixels / containerHeight) * 100;
        
        labelX = x;
        labelY = y;
        textAlign = 'center';
        
        if (guest) {
          // Position labels further outward (+6mm additional gap from seat edge)
          const labelOffsetPercent = 12.5; // Additional offset as percentage
          const labelRadiusPixels = ((37 + labelOffsetPercent) / 100) * containerHeight;
          
          const labelXPixels = centerX + labelRadiusPixels * Math.cos(angle);
          const labelYPixels = centerY + labelRadiusPixels * Math.sin(angle);
          
          labelX = (labelXPixels / containerWidth) * 100;
          labelY = (labelYPixels / containerHeight) * 100;
          
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

  const getGuestNameSize = (size: string) => {
    switch (size) {
      case 'small': return 'text-sm print:text-[10.5pt]';
      case 'large': return 'text-lg print:text-[13.5pt]';
      default: return 'text-base print:text-[12pt]'; // medium
    }
  };

  const getGuestListSize = (size: string) => {
    switch (size) {
      case 'small': return 'text-sm print:text-[10.5pt]';
      case 'large': return 'text-lg print:text-[13.5pt]';
      default: return 'text-base print:text-[12pt]'; // medium
    }
  };

  return (
    <Card className="bg-transparent shadow-none border-0">
      <CardContent className="p-0">
        {/* A4 Preview Container */}
        <div className="flex justify-center">
          <div 
            id="printA4-individual-table"
            className="bg-white border border-gray-300 shadow-lg overflow-hidden"
            style={{ 
              width: '210mm', 
              height: '297mm',
              minWidth: '210mm',
              maxWidth: '210mm',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ padding: '1.27cm', boxSizing: 'border-box' }} className="h-full flex flex-col relative">
            {/* Header Section */}  
            <div className="text-center mb-2">
              {/* Event Name - Purple and Bold */}
              <div className="text-center font-bold text-xl text-primary mb-1">
                {event?.name || 'Event'}
              </div>

              {/* Title and Date with Day of Week */}
              <div className="text-center text-base font-semibold text-foreground mb-1">
                Table Seating Arrangements – {event?.date ? new Date(event.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^(\w+) (\d+) (\w+) (\d+)$/, (_, day, date, month, year) => {
                  const d = parseInt(date);
                  const suffix = d > 3 && d < 21 ? 'th' : ['th', 'st', 'nd', 'rd'][d % 10] || 'th';
                  return `${day} ${d}${suffix}, ${month} ${year}`;
                }) : ''}
              </div>

              {/* Venue, Tables, Page Info and Timestamp */}
              <div className="text-center text-sm text-foreground pb-3 mb-3 border-b border-black">
                {event?.venue || 'Venue'} – Total Tables: {totalTables} – Page {currentTableIndex} of {totalTables} – Generated on: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} Time: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
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
                        {seat.guest && settings.includeNames && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute font-bold ${getGuestNameSize(settings.fontSize)} max-w-24 cursor-help`}
                                style={{
                                  left: `${seat.labelX}%`,
                                  top: `${seat.labelY}%`,
                                  textAlign: seat.textAlign as any,
                                  transform: seat.textAlign === 'center' ? 'translate(-50%, -50%)' : 
                                           seat.textAlign === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
                                  lineHeight: '1.2',
                                  wordWrap: 'break-word',
                                  hyphens: 'auto',
                                  maxHeight: '2.4em', // 2 lines at line-height 1.2
                                  overflow: 'hidden',
                                }}
                              >
                                <div className="text-gray-800">
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
                <h3 className="font-semibold text-xl mb-3 text-center underline">
                  Guests on this Table & Meal Selection
                </h3>
                <div className={`flex ${getGuestListSize(settings.fontSize)} leading-[1.35]`}>
                  {/* Left Column */}
                  <div className="flex-1 space-y-1">
                    {sortedGuests.filter((_, index) => index % 2 === 0).map((guest, originalIndex) => {
                      const actualIndex = sortedGuests.findIndex(g => g.id === guest.id);
                      return (
                        <div key={guest.id} className="flex items-start py-1 leading-[1.7] min-h-[20px]">
                          <span className="w-6 text-left flex-shrink-0">{actualIndex + 1}.</span>
                          <span className="break-words text-left">
                            <span className="font-bold">{guest.first_name} {guest.last_name}</span>
                            {settings.includeDietary && guest.dietary && guest.dietary !== 'NA' && (
                              <span className="text-primary font-bold"> - {guest.dietary}</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Right Column */}
                  <div className="flex-1 space-y-1 ml-4">
                    {sortedGuests.filter((_, index) => index % 2 === 1).map((guest, originalIndex) => {
                      const actualIndex = sortedGuests.findIndex(g => g.id === guest.id);
                      return (
                        <div key={guest.id} className="flex items-start py-1 leading-[1.7] min-h-[20px]">
                          <span className="w-6 text-left flex-shrink-0">{actualIndex + 1}.</span>
                          <span className="break-words text-left">
                            <span className="font-bold">{guest.first_name} {guest.last_name}</span>
                            {settings.includeDietary && guest.dietary && guest.dietary !== 'NA' && (
                              <span className="text-primary font-bold"> - {guest.dietary}</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Footer Section with Logo */}
            {settings.showLogo && (
              <div className="mt-auto pt-4 flex justify-center">
                <img 
                  src={weddingWaitressLogo} 
                  alt="Wedding Waitress" 
                  className="h-12 object-contain"
                />
              </div>
            )}

          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  );
};