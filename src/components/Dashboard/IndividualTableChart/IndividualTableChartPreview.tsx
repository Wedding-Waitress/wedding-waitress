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
        const offset = 2.8; // 14px offset converted to percentage
        
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
        // Position labels further outward (+6mm additional gap from seat edge)
        const chairRadius = i === 1 || i === 6 ? 39.5 : 37; // Account for moved chairs
        const labelOffset = 12.5; // Increased by 6mm (8.5 + 5.7)
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
              maxWidth: '210mm'
            }}
          >
            <div style={{ padding: '10mm' }} className="h-full flex flex-col relative">
            {/* Header Section */}  
            <div className="text-center mb-2 space-y-1">
              {/* Event Name - Purple and Bold */}
              <div className="text-center font-semibold text-xl text-primary">
                {event?.name || 'Event'}
              </div>

              {/* Title and Date with Day of Week */}
              <div className="text-center text-sm text-black font-normal">
                Table Seating Arrangements – {event?.date ? new Date(event.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^(\w+) (\d+) (\w+) (\d+)$/, (_, day, date, month, year) => {
                  const d = parseInt(date);
                  const suffix = d > 3 && d < 21 ? 'th' : ['th', 'st', 'nd', 'rd'][d % 10] || 'th';
                  return `${day} ${d}${suffix}, ${month} ${year}`;
                }) : ''}
              </div>

              {/* Venue, Tables, Page Info and Timestamp */}
              <div className="text-center text-xs text-black font-normal">
                {event?.venue || 'Venue'} – Total Tables: {table.table_no} – Page 1 – 1 Generated on: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} Time: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
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
                                className="absolute font-semibold text-[15px] print:text-[12pt] max-w-24 cursor-help"
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
                  Guests on this Table & Dietary - Printed on - {new Date().toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })} - {new Date().toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit', 
                    hour12: true 
                  })}
                </h3>
                <div className="flex text-[15px] leading-[1.35] print:text-[12pt] print:leading-[1.35]">
                  {/* Left Column */}
                  <div className="flex-1 space-y-1">
                    {sortedGuests.filter((_, index) => index % 2 === 0).map((guest, originalIndex) => {
                      const actualIndex = sortedGuests.findIndex(g => g.id === guest.id);
                      return (
                        <div key={guest.id} className="flex items-start py-1 leading-[1.7] min-h-[20px]">
                          <span className="w-6 text-left flex-shrink-0">{actualIndex + 1}.</span>
                          <span className="break-words text-left">
                            {guest.first_name} {guest.last_name}
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
                            {guest.first_name} {guest.last_name}
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