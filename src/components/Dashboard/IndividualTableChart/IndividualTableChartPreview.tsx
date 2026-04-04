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

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

// Dietary icon helper
const getDietaryIcon = (dietary: string | null): string | null => {
  if (!dietary || dietary === 'NA') return null;
  const lower = dietary.toLowerCase();
  if (lower.includes('vegan')) return '🌱';
  if (lower.includes('vegetarian') || lower.includes('veg')) return '🥬';
  if (lower.includes('gluten')) return '🌾';
  if (lower.includes('nut')) return '🥜';
  if (lower.includes('seafood') || lower.includes('fish')) return '🐟';
  if (lower.includes('allergy') || lower.includes('allergic')) return '🚫';
  return '🍽️';
};

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

  // Long table auto-scaling based on guest count
  const longTableScaling = useMemo(() => {
    const count = sortedGuests.length;
    if (count <= 40) return { chairSize: 32, fontSize: 11, listFontSize: 11, spacing: 'normal' };
    if (count <= 60) return { chairSize: 26, fontSize: 9, listFontSize: 9, spacing: 'compact' };
    if (count <= 80) return { chairSize: 22, fontSize: 8, listFontSize: 8, spacing: 'tight' };
    return { chairSize: 18, fontSize: 7, listFontSize: 7, spacing: 'minimal' };
  }, [sortedGuests.length]);

  // Get arranged guests for long table (use custom arrangement or default)
  // Split numbering: Left side gets seats 1-N/2, Right side gets seats N/2+1 to N
  // Optional end seats at top and bottom
  const longTableGuests = useMemo(() => {
    if (settings.tableShape !== 'long') return { leftSide: [], rightSide: [], topEnd: [], bottomEnd: [] };
    
    const endSeatsEnabled = settings.enableEndSeats;
    const seatsPerEnd = settings.endSeatsCount || 1;
    
    // Reserve guests for end seats if enabled
    const totalEndSeats = endSeatsEnabled ? seatsPerEnd * 2 : 0;
    const sideGuests = sortedGuests.slice(0, sortedGuests.length - totalEndSeats);
    const endGuests = sortedGuests.slice(sortedGuests.length - totalEndSeats);
    
    // Split side guests: first half to left side, second half to right side
    const halfPoint = Math.ceil(sideGuests.length / 2);
    const leftSide: { guest: Guest; seatNumber: number }[] = [];
    const rightSide: { guest: Guest; seatNumber: number }[] = [];
    
    sideGuests.forEach((guest, index) => {
      const seatNumber = index + 1; // Sequential numbering 1, 2, 3...
      if (index < halfPoint) {
        // Left side: seats 1, 2, 3, 4, 5...
        leftSide.push({ guest, seatNumber });
      } else {
        // Right side: seats 6, 7, 8, 9, 10...
        rightSide.push({ guest, seatNumber });
      }
    });
    
    // Assign end seats (top gets first batch, bottom gets second batch)
    const topEnd: { guest: Guest; seatNumber: number }[] = [];
    const bottomEnd: { guest: Guest; seatNumber: number }[] = [];
    
    if (endSeatsEnabled && endGuests.length > 0) {
      const baseSeatNumber = sideGuests.length + 1;
      endGuests.forEach((guest, index) => {
        const seatNumber = baseSeatNumber + index;
        if (index < seatsPerEnd) {
          topEnd.push({ guest, seatNumber });
        } else {
          bottomEnd.push({ guest, seatNumber });
        }
      });
    }
    
    return { leftSide, rightSide, topEnd, bottomEnd };
  }, [settings.tableShape, settings.enableEndSeats, settings.endSeatsCount, sortedGuests]);

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

  // Arrange seats around the table - only for assigned guests
  const arrangeSeats = () => {
    const guestCount = sortedGuests.length;
    const seats = [];
    
    // Only create seats for actual guests assigned to this table
    for (let i = 0; i < guestCount; i++) {
      const guest = sortedGuests[i];
      
      let x, y, labelX, labelY, textAlign, angle;
      
      if (settings.tableShape === 'square') {
        // SQUARE TABLE: Side-based centered distribution
        // Divide guests into 4 groups, one per side, centered on each side
        const guestsPerSide = Math.ceil(guestCount / 4);
        
        const side = Math.floor(i / guestsPerSide); // 0=top, 1=right, 2=bottom, 3=left
        const positionInSide = i % guestsPerSide;
        
        // Calculate how many guests are actually on this side
        const startIdx = side * guestsPerSide;
        const endIdx = Math.min(startIdx + guestsPerSide, guestCount);
        const guestsOnThisSide = endIdx - startIdx;
        
        // Use wider spacing for top/bottom (horizontal names need more room)
        // Use tighter spacing for left/right (vertical names extend outward)
        const isHorizontalSide = side === 0 || side === 2;
        const chairSpacing = isHorizontalSide ? 16 : 14; // 16% for top/bottom, 14% for left/right
        
        // Calculate centered positioning for this side's group
        const totalWidth = (guestsOnThisSide - 1) * chairSpacing;
        const startOffset = 50 - (totalWidth / 2);
        const positionPercent = startOffset + (positionInSide * chairSpacing);
        
        if (side === 0) {
          // Top side - horizontal line, chairs ~10% from table edge
          x = positionPercent;
          y = 10; // Equal distance from table (~10% clearance)
          labelX = positionPercent;
          labelY = 0; // Labels above chairs
          textAlign = 'center';
          angle = -Math.PI / 2;
        } else if (side === 1) {
          // Right side - vertical line, chairs ~10% from table edge
          x = 88; // Equal distance from table (~10% clearance)
          y = positionPercent;
          labelX = 93; // Labels right of chairs (closer)
          labelY = positionPercent;
          textAlign = 'left';
          angle = 0;
        } else if (side === 2) {
          // Bottom side - horizontal line (reverse order for natural reading)
          x = 100 - positionPercent;
          y = 90; // Equal distance from table (~10% clearance)
          labelX = 100 - positionPercent;
          labelY = 100; // Labels below chairs
          textAlign = 'center';
          angle = Math.PI / 2;
        } else {
          // Left side - vertical line (reverse order), chairs ~10% from table edge
          x = 12; // Equal distance from table (~10% clearance)
          y = 100 - positionPercent;
          labelX = 7; // Labels left of chairs (closer)
          labelY = 100 - positionPercent;
          textAlign = 'right';
          angle = Math.PI;
        }
        
      } else {
        // ROUND TABLE: Use pixel-based positioning for perfect circle
        angle = (i / guestCount) * 2 * Math.PI - Math.PI / 2; // Start from top, evenly distributed
        
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
        
        // Position labels further outward (+6mm additional gap from seat edge)
        const labelOffsetPercent = 8; // Additional offset as percentage
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
      
      seats.push({
        number: guest.seat_no || i + 1,
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

  const getTitleSizePx = (size: string) => {
    switch (size) {
      case 'small': return 18;
      case 'large': return 30;
      default: return 24;
    }
  };

  // Auto-fit function that scales font size based on text length to fit container
  const getAutoFitStyle = (text: string | number, fontSize: string) => {
    const baseSize = getTitleSizePx(fontSize);
    const containerWidth = 250;
    const charWidthRatio = 0.6;
    const textLength = String(text).length;
    const estimatedWidth = textLength * baseSize * charWidthRatio;
    
    if (estimatedWidth <= containerWidth) {
      return {}; // No scaling needed, use Tailwind class
    }
    
    const scaleFactor = containerWidth / estimatedWidth;
    const scaledSize = Math.max(Math.floor(baseSize * scaleFactor), 12);
    return { fontSize: `${scaledSize}px` };
  };

  const getGuestNameSize = (size: string) => {
    switch (size) {
      case 'small': return 'text-sm print:text-[10.5pt]';
      case 'large': return 'text-lg print:text-[13.5pt]';
      default: return 'text-base print:text-[12pt]'; // medium
    }
  };

  const getGuestListSize = (size: string) => {
    // Match PDF export sizing - use smaller fonts to prevent line wrapping
    return 'text-sm print:text-[11pt]';
  };

  // Auto-fit font scaling for guest list to ensure logo is always visible
  const getAutoFitGuestListStyle = () => {
    if (!settings.includeGuestList) return {};
    
    const guestCount = sortedGuests.length;
    
    // A4 page available height after header, table visualization, and logo
    // Total: 297mm = ~1123px, padding ~80px, header ~110px, table ~480px, logo ~68px
    const availableForGuestList = 1123 - 80 - 110 - 480 - 68 - 40; // 40px for title
    
    // Calculate rows needed (2 columns)
    const rowsNeeded = Math.ceil(guestCount / 2);
    
    // Base row heights per font size
    const rowHeights: Record<string, number> = {
      'small': 24,
      'medium': 28,
      'large': 34
    };
    
    const baseRowHeight = rowHeights[settings.fontSize] || 28;
    const requiredHeight = rowsNeeded * baseRowHeight;
    
    if (requiredHeight <= availableForGuestList) {
      return {}; // No scaling needed
    }
    
    // Calculate scale factor
    const scaleFactor = availableForGuestList / requiredHeight;
    
    // Get base font sizes in px
    const baseFontSizes: Record<string, number> = {
      'small': 14,   // text-sm
      'medium': 16,  // text-base
      'large': 18    // text-lg
    };
    
    const baseFontSize = baseFontSizes[settings.fontSize] || 16;
    const scaledFontSize = Math.max(baseFontSize * scaleFactor, 11); // Minimum 11px
    const scaledLineHeight = Math.max(baseRowHeight * scaleFactor, 18);
    
    return {
      fontSize: `${scaledFontSize}px`,
      lineHeight: `${scaledLineHeight}px`
    };
  };

  const autoFitGuestListStyle = getAutoFitGuestListStyle();

  return (
    <Card className="bg-transparent shadow-none border-0">
      <CardContent className="p-0">
        {/* A4 Preview Container */}
        <div className="flex justify-center">
          <div 
            id="printA4-individual-table"
            className="bg-white border border-gray-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] overflow-hidden"
            style={{ 
              width: '210mm', 
              height: '297mm',
              minWidth: '210mm',
              maxWidth: '210mm',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ padding: '1.27cm', boxSizing: 'border-box' }} className="h-full flex flex-col relative">
            {/* Header Section - Running Sheet Style */}  
            <div className="text-center mb-2">
              {/* Event Name - Large Purple Bold */}
              <div className="text-center font-bold" style={{ color: '#6d28d9', fontSize: '22px' }}>
                {event?.name || 'Event'}
              </div>

              {/* Subtitle with guest count */}
              <div className="text-center font-normal" style={{ fontSize: '16px', color: '#222', marginTop: '4px' }}>
                Individual Table Charts – {sortedGuests.length} {sortedGuests.length === 1 ? 'Guest' : 'Guests'}
              </div>

              {/* Ceremony & Reception Details */}
              <div className="text-center" style={{ marginTop: '4px', marginBottom: '6px' }}>
                {event?.ceremony_date && (
                  <div style={{ color: '#555', fontSize: '12px', marginTop: '2px' }}>
                    Ceremony: {(() => {
                      const date = new Date(event.ceremony_date + 'T00:00:00');
                      const day = date.getDate();
                      const ordinal = (n: number) => { const s = ['th','st','nd','rd']; const v = n % 100; return n + (s[(v-20)%10] || s[v] || s[0]); };
                      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                      return `${dayName} ${ordinal(day)}, ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
                    })()} | {event?.ceremony_venue || 'Venue TBD'} | {(() => {
                      const fmt = (t: string | null) => { if (!t) return 'TBD'; const [h,m] = t.split(':'); const hr = parseInt(h); const ampm = hr >= 12 ? 'PM' : 'AM'; const dh = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr; return `${dh}:${m} ${ampm}`; };
                      return `${fmt(event?.ceremony_start_time)} – ${fmt(event?.ceremony_finish_time)}`;
                    })()}
                  </div>
                )}
                <div style={{ color: '#555', fontSize: '12px', marginTop: '2px' }}>
                  Reception: {event?.date ? (() => {
                    const date = new Date(event.date + 'T00:00:00');
                    const day = date.getDate();
                    const ordinal = (n: number) => { const s = ['th','st','nd','rd']; const v = n % 100; return n + (s[(v-20)%10] || s[v] || s[0]); };
                    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                    return `${dayName} ${ordinal(day)}, ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
                  })() : 'TBD'} | {event?.venue || 'Venue TBD'} | {(() => {
                    const fmt = (t: string | null) => { if (!t) return 'TBD'; const [h,m] = t.split(':'); const hr = parseInt(h); const ampm = hr >= 12 ? 'PM' : 'AM'; const dh = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr; return `${dh}:${m} ${ampm}`; };
                    return `${fmt(event?.start_time)} – ${fmt(event?.finish_time)}`;
                  })()}
                </div>
              </div>

              {/* Purple Divider */}
              <div style={{ borderTop: '2px solid #6d28d9', margin: '8px 0 14px 0' }}></div>
            </div>


            {/* Line 3: Table Visualization */}
            {settings.tableShape === 'long' ? (
              /* LONG TABLE LAYOUT - Table centered with full names + dietary next to chairs */
              <div className="flex-1 flex items-center justify-center mb-4">
                <div className="relative h-full w-full flex items-center justify-center py-4">
                  {/* Long Table Rectangle */}
                  <div 
                    className="relative border-2 border-gray-700 bg-gray-50 rounded-lg"
                    style={{ 
                      width: '120px', 
                      height: 'calc(100% - 40px)',
                      minHeight: '400px'
                    }}
                  >
                    {/* Rotated Table Name Inside */}
                    <div 
                      className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap"
                      style={{ fontSize: `${Math.max(14, 24 - sortedGuests.length / 5)}px` }}
                    >
                      <div className="font-bold text-gray-600 text-center">
                        <div>TABLE</div>
                        <div>{table.table_no ?? table.name}</div>
                      </div>
                    </div>
                    
                    {/* Left Side Chairs with Full Names + Dietary - Perfect Straight Line */}
                    <div className="absolute left-0 top-4 bottom-4" style={{ transform: 'translateX(calc(-100% - 28px))' }}>
                      {longTableGuests.leftSide.map((item, index) => {
                        // Calculate even spacing for perfect straight line
                        const totalGuests = longTableGuests.leftSide.length;
                        const topPercent = totalGuests === 1 ? 50 : (index / (totalGuests - 1)) * 100;
                        
                        return (
                          <TooltipProvider key={item.guest.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div 
                                  className="absolute flex items-center gap-1"
                                  style={{ 
                                    top: `${topPercent}%`, 
                                    right: 0,
                                    transform: 'translateY(-50%)'
                                  }}
                                >
                                  {/* Full Guest Name + Dietary Text - Left of Chair */}
                                  <span 
                                    className="text-right font-medium whitespace-nowrap"
                                    style={{ fontSize: longTableScaling.fontSize }}
                                  >
                                    {item.guest.first_name} {item.guest.last_name}
                                    {settings.includeDietary && item.guest.dietary && item.guest.dietary !== 'NA' && (
                                      <span className="text-primary font-bold ml-1">- {item.guest.dietary}</span>
                                    )}
                                  </span>
                                  {/* Chair Circle */}
                                  <div 
                                    className="rounded-full bg-white border border-black flex items-center justify-center font-bold cursor-help flex-shrink-0"
                                    style={{ width: longTableScaling.chairSize, height: longTableScaling.chairSize, fontSize: longTableScaling.fontSize }}
                                  >
                                    {settings.showSeatNumbers && item.seatNumber}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{item.guest.first_name} {item.guest.last_name}{item.guest.dietary && item.guest.dietary !== 'NA' ? ` - ${item.guest.dietary}` : ''}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                    
                    {/* Right Side Chairs with Full Names + Dietary - Perfect Straight Line */}
                    <div className="absolute right-0 top-4 bottom-4" style={{ transform: 'translateX(calc(100% + 28px))' }}>
                      {longTableGuests.rightSide.map((item, index) => {
                        // Calculate even spacing for perfect straight line
                        const totalGuests = longTableGuests.rightSide.length;
                        const topPercent = totalGuests === 1 ? 50 : (index / (totalGuests - 1)) * 100;
                        
                        return (
                          <TooltipProvider key={item.guest.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div 
                                  className="absolute flex items-center gap-1"
                                  style={{ 
                                    top: `${topPercent}%`, 
                                    left: 0,
                                    transform: 'translateY(-50%)'
                                  }}
                                >
                                  {/* Chair Circle */}
                                  <div 
                                    className="rounded-full bg-white border border-black flex items-center justify-center font-bold cursor-help flex-shrink-0"
                                    style={{ width: longTableScaling.chairSize, height: longTableScaling.chairSize, fontSize: longTableScaling.fontSize }}
                                  >
                                    {settings.showSeatNumbers && item.seatNumber}
                                  </div>
                                  {/* Full Guest Name + Dietary Text - Right of Chair */}
                                  <span 
                                    className="text-left font-medium whitespace-nowrap"
                                    style={{ fontSize: longTableScaling.fontSize }}
                                  >
                                    {item.guest.first_name} {item.guest.last_name}
                                    {settings.includeDietary && item.guest.dietary && item.guest.dietary !== 'NA' && (
                                      <span className="text-primary font-bold ml-1">- {item.guest.dietary}</span>
                                    )}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{item.guest.first_name} {item.guest.last_name}{item.guest.dietary && item.guest.dietary !== 'NA' ? ` - ${item.guest.dietary}` : ''}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                    
                    {/* Top End Seats - Only when enabled */}
                    {settings.enableEndSeats && longTableGuests.topEnd.length > 0 && (
                      <div 
                        className="absolute left-1/2 flex items-end"
                        style={{ 
                          top: '-40px', 
                          transform: 'translateX(-50%)'
                        }}
                      >
                        {longTableGuests.topEnd.length === 1 ? (
                          // Single seat - centered with name above, dietary below name, chair at bottom
                          <TooltipProvider key={longTableGuests.topEnd[0].guest.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex flex-col items-center gap-1">
                                  <span 
                                    className="text-center font-medium whitespace-nowrap"
                                    style={{ fontSize: longTableScaling.fontSize }}
                                  >
                                    {longTableGuests.topEnd[0].guest.first_name} {longTableGuests.topEnd[0].guest.last_name}
                                  </span>
                                  {settings.includeDietary && longTableGuests.topEnd[0].guest.dietary && longTableGuests.topEnd[0].guest.dietary !== 'NA' && (
                                    <span 
                                      className="text-primary font-bold text-center whitespace-nowrap"
                                      style={{ fontSize: longTableScaling.fontSize }}
                                    >
                                      - {longTableGuests.topEnd[0].guest.dietary}
                                    </span>
                                  )}
                                  <div 
                                    className="rounded-full bg-white border border-black flex items-center justify-center font-bold cursor-help"
                                    style={{ width: longTableScaling.chairSize, height: longTableScaling.chairSize, fontSize: longTableScaling.fontSize }}
                                  >
                                    {settings.showSeatNumbers && longTableGuests.topEnd[0].seatNumber}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{longTableGuests.topEnd[0].guest.first_name} {longTableGuests.topEnd[0].guest.last_name}{longTableGuests.topEnd[0].guest.dietary && longTableGuests.topEnd[0].guest.dietary !== 'NA' ? ` - ${longTableGuests.topEnd[0].guest.dietary}` : ''}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          // Two seats - chairs close together in center, names on outer sides
                          <div className="flex items-end gap-1">
                            {/* First guest - name+dietary on left, chair on right */}
                            <TooltipProvider key={longTableGuests.topEnd[0].guest.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-end gap-2">
                                    <div className="flex flex-col items-end">
                                      <span 
                                        className="text-right font-medium whitespace-nowrap"
                                        style={{ fontSize: longTableScaling.fontSize }}
                                      >
                                        {longTableGuests.topEnd[0].guest.first_name} {longTableGuests.topEnd[0].guest.last_name}
                                      </span>
                                      {settings.includeDietary && longTableGuests.topEnd[0].guest.dietary && longTableGuests.topEnd[0].guest.dietary !== 'NA' && (
                                        <span 
                                          className="text-primary font-bold text-right whitespace-nowrap"
                                          style={{ fontSize: longTableScaling.fontSize }}
                                        >
                                          - {longTableGuests.topEnd[0].guest.dietary}
                                        </span>
                                      )}
                                    </div>
                                    <div 
                                      className="rounded-full bg-white border border-black flex items-center justify-center font-bold cursor-help"
                                      style={{ width: longTableScaling.chairSize, height: longTableScaling.chairSize, fontSize: longTableScaling.fontSize }}
                                    >
                                      {settings.showSeatNumbers && longTableGuests.topEnd[0].seatNumber}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{longTableGuests.topEnd[0].guest.first_name} {longTableGuests.topEnd[0].guest.last_name}{longTableGuests.topEnd[0].guest.dietary && longTableGuests.topEnd[0].guest.dietary !== 'NA' ? ` - ${longTableGuests.topEnd[0].guest.dietary}` : ''}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {/* Second guest - chair on left, name+dietary on right */}
                            <TooltipProvider key={longTableGuests.topEnd[1].guest.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-end gap-2">
                                    <div 
                                      className="rounded-full bg-white border border-black flex items-center justify-center font-bold cursor-help"
                                      style={{ width: longTableScaling.chairSize, height: longTableScaling.chairSize, fontSize: longTableScaling.fontSize }}
                                    >
                                      {settings.showSeatNumbers && longTableGuests.topEnd[1].seatNumber}
                                    </div>
                                    <div className="flex flex-col items-start">
                                      <span 
                                        className="text-left font-medium whitespace-nowrap"
                                        style={{ fontSize: longTableScaling.fontSize }}
                                      >
                                        {longTableGuests.topEnd[1].guest.first_name} {longTableGuests.topEnd[1].guest.last_name}
                                      </span>
                                      {settings.includeDietary && longTableGuests.topEnd[1].guest.dietary && longTableGuests.topEnd[1].guest.dietary !== 'NA' && (
                                        <span 
                                          className="text-primary font-bold text-left whitespace-nowrap"
                                          style={{ fontSize: longTableScaling.fontSize }}
                                        >
                                          - {longTableGuests.topEnd[1].guest.dietary}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{longTableGuests.topEnd[1].guest.first_name} {longTableGuests.topEnd[1].guest.last_name}{longTableGuests.topEnd[1].guest.dietary && longTableGuests.topEnd[1].guest.dietary !== 'NA' ? ` - ${longTableGuests.topEnd[1].guest.dietary}` : ''}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Bottom End Seats - Only when enabled */}
                    {settings.enableEndSeats && longTableGuests.bottomEnd.length > 0 && (
                      <div 
                        className="absolute left-1/2 flex items-start"
                        style={{ 
                          bottom: '-40px', 
                          transform: 'translateX(-50%)'
                        }}
                      >
                        {longTableGuests.bottomEnd.length === 1 ? (
                          // Single seat - centered with chair at top, dietary below, name at bottom
                          <TooltipProvider key={longTableGuests.bottomEnd[0].guest.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex flex-col items-center gap-1">
                                  <div 
                                    className="rounded-full bg-white border border-black flex items-center justify-center font-bold cursor-help"
                                    style={{ width: longTableScaling.chairSize, height: longTableScaling.chairSize, fontSize: longTableScaling.fontSize }}
                                  >
                                    {settings.showSeatNumbers && longTableGuests.bottomEnd[0].seatNumber}
                                  </div>
                                  <span 
                                    className="text-center font-medium whitespace-nowrap"
                                    style={{ fontSize: longTableScaling.fontSize }}
                                  >
                                    {longTableGuests.bottomEnd[0].guest.first_name} {longTableGuests.bottomEnd[0].guest.last_name}
                                  </span>
                                  {settings.includeDietary && longTableGuests.bottomEnd[0].guest.dietary && longTableGuests.bottomEnd[0].guest.dietary !== 'NA' && (
                                    <span 
                                      className="text-primary font-bold text-center whitespace-nowrap"
                                      style={{ fontSize: longTableScaling.fontSize }}
                                    >
                                      - {longTableGuests.bottomEnd[0].guest.dietary}
                                    </span>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{longTableGuests.bottomEnd[0].guest.first_name} {longTableGuests.bottomEnd[0].guest.last_name}{longTableGuests.bottomEnd[0].guest.dietary && longTableGuests.bottomEnd[0].guest.dietary !== 'NA' ? ` - ${longTableGuests.bottomEnd[0].guest.dietary}` : ''}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          // Two seats - chairs close together in center, names on outer sides
                          <div className="flex items-start gap-1">
                            {/* First guest - name+dietary on left, chair on right */}
                            <TooltipProvider key={longTableGuests.bottomEnd[0].guest.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-start gap-2">
                                    <div className="flex flex-col items-end">
                                      <span 
                                        className="text-right font-medium whitespace-nowrap"
                                        style={{ fontSize: longTableScaling.fontSize }}
                                      >
                                        {longTableGuests.bottomEnd[0].guest.first_name} {longTableGuests.bottomEnd[0].guest.last_name}
                                      </span>
                                      {settings.includeDietary && longTableGuests.bottomEnd[0].guest.dietary && longTableGuests.bottomEnd[0].guest.dietary !== 'NA' && (
                                        <span 
                                          className="text-primary font-bold text-right whitespace-nowrap"
                                          style={{ fontSize: longTableScaling.fontSize }}
                                        >
                                          - {longTableGuests.bottomEnd[0].guest.dietary}
                                        </span>
                                      )}
                                    </div>
                                    <div 
                                      className="rounded-full bg-white border border-black flex items-center justify-center font-bold cursor-help"
                                      style={{ width: longTableScaling.chairSize, height: longTableScaling.chairSize, fontSize: longTableScaling.fontSize }}
                                    >
                                      {settings.showSeatNumbers && longTableGuests.bottomEnd[0].seatNumber}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{longTableGuests.bottomEnd[0].guest.first_name} {longTableGuests.bottomEnd[0].guest.last_name}{longTableGuests.bottomEnd[0].guest.dietary && longTableGuests.bottomEnd[0].guest.dietary !== 'NA' ? ` - ${longTableGuests.bottomEnd[0].guest.dietary}` : ''}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {/* Second guest - chair on left, name+dietary on right */}
                            <TooltipProvider key={longTableGuests.bottomEnd[1].guest.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-start gap-2">
                                    <div 
                                      className="rounded-full bg-white border border-black flex items-center justify-center font-bold cursor-help"
                                      style={{ width: longTableScaling.chairSize, height: longTableScaling.chairSize, fontSize: longTableScaling.fontSize }}
                                    >
                                      {settings.showSeatNumbers && longTableGuests.bottomEnd[1].seatNumber}
                                    </div>
                                    <div className="flex flex-col items-start">
                                      <span 
                                        className="text-left font-medium whitespace-nowrap"
                                        style={{ fontSize: longTableScaling.fontSize }}
                                      >
                                        {longTableGuests.bottomEnd[1].guest.first_name} {longTableGuests.bottomEnd[1].guest.last_name}
                                      </span>
                                      {settings.includeDietary && longTableGuests.bottomEnd[1].guest.dietary && longTableGuests.bottomEnd[1].guest.dietary !== 'NA' && (
                                        <span 
                                          className="text-primary font-bold text-left whitespace-nowrap"
                                          style={{ fontSize: longTableScaling.fontSize }}
                                        >
                                          - {longTableGuests.bottomEnd[1].guest.dietary}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{longTableGuests.bottomEnd[1].guest.first_name} {longTableGuests.bottomEnd[1].guest.last_name}{longTableGuests.bottomEnd[1].guest.dietary && longTableGuests.bottomEnd[1].guest.dietary !== 'NA' ? ` - ${longTableGuests.bottomEnd[1].guest.dietary}` : ''}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ROUND/SQUARE TABLE LAYOUT */
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
                    width: '280px',
                    height: '280px'
                  }}
                >
                  <div className="font-bold text-gray-700 text-center">
                    <div className={getTitleSize(settings.fontSize)}>TABLE</div>
                    <div 
                      className={getTitleSize(settings.fontSize)}
                      style={getAutoFitStyle(table.table_no ?? table.name, settings.fontSize)}
                    >
                      {table.table_no ?? table.name}
                    </div>
                  </div>
                </div>

                {/* Seats */}
                <TooltipProvider>
                  {seats.map((seat) => {
                    // Auto-scale font for top/bottom sides to prevent overlap
                    const getAutoScaledNameStyle = () => {
                      if (settings.tableShape !== 'square') return {};
                      
                      // Check if this is a top or bottom side (textAlign === 'center')
                      if (seat.textAlign !== 'center') return {};
                      
                      const guestCount = sortedGuests.length;
                      const guestsPerSide = Math.ceil(guestCount / 4);
                      
                      // Calculate available width per name on horizontal sides
                      const containerWidth = 500; // px
                      const usableWidth = containerWidth * 0.85; // 85% usable
                      const widthPerName = usableWidth / guestsPerSide;
                      
                      // Get base font size in px
                      const baseFontSizes: Record<string, number> = {
                        'small': 14,
                        'medium': 16,
                        'large': 18
                      };
                      const baseFontSize = baseFontSizes[settings.fontSize] || 16;
                      
                      // Estimate name width (first name only)
                      const firstName = seat.guest?.first_name || '';
                      const charWidthRatio = 0.6;
                      const estimatedWidth = firstName.length * baseFontSize * charWidthRatio;
                      
                      if (estimatedWidth <= widthPerName) return {};
                      
                      // Scale down the font
                      const scaleFactor = Math.min(widthPerName / estimatedWidth, 1);
                      const scaledFontSize = Math.max(baseFontSize * scaleFactor, 10);
                      
                      return { fontSize: `${scaledFontSize}px` };
                    };
                    
                    return (
                      <div key={seat.number}>
                        {/* Seat Circle with thin black border - 44px (w-11 h-11) for tight spacing */}
                        <div
                          className="absolute w-11 h-11 border border-black rounded-full bg-white flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 shadow-md"
                          style={{
                            left: `${seat.x}%`,
                            top: `${seat.y}%`,
                          }}
                        >
                          {settings.showSeatNumbers && (
                            <span className="font-bold text-xs">{seat.number}</span>
                          )}
                        </div>

                        {/* Guest Name - Side-aware positioning with auto-scale for top/bottom */}
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
                                  maxHeight: '2.4em',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  ...getAutoScaledNameStyle(),
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
            )}

            {/* Line 4 & 5: Guest List - Auto-scaled to ensure logo visibility (hidden for long tables) */}
            {settings.includeGuestList && settings.tableShape !== 'long' && (
              <div className="mb-4">
                <div
                  className={`flex ${Object.keys(autoFitGuestListStyle).length === 0 ? getGuestListSize(settings.fontSize) : ''}`}
                  style={autoFitGuestListStyle}
                >
                  {/* Left Column */}
                  <div className="flex-1 space-y-0.5">
                  {sortedGuests.filter((_, index) => index % 2 === 0).map((guest) => {
                      const actualIndex = sortedGuests.findIndex(g => g.id === guest.id);
                      const nameStyle: React.CSSProperties = {
                        fontWeight: settings.textStyle === 'bold' ? 700 : 400,
                        fontStyle: settings.textStyle === 'italic' ? 'italic' : 'normal',
                        textDecoration: settings.textStyle === 'underline' ? 'underline' : 'none',
                      };
                      return (
                        <div key={guest.id} className="flex items-start py-0.5">
                          <span className="w-5 text-left flex-shrink-0">{actualIndex + 1}.</span>
                          <span className="break-words text-left">
                            <span style={nameStyle}>{guest.first_name} {guest.last_name}</span>
                            {settings.includeDietary && guest.dietary && guest.dietary !== 'NA' && (
                              <span className="text-primary font-bold"> - {guest.dietary}</span>
                            )}
                            {settings.includeRelation && guest.relation_display && guest.relation_display !== 'Not Assigned' && (
                              <span className="text-muted-foreground"> ({guest.relation_display})</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Right Column */}
                  <div className="flex-1 space-y-0.5 ml-4">
                    {sortedGuests.filter((_, index) => index % 2 === 1).map((guest) => {
                      const actualIndex = sortedGuests.findIndex(g => g.id === guest.id);
                      const nameStyle: React.CSSProperties = {
                        fontWeight: settings.textStyle === 'bold' || settings.textStyle === 'default' ? 700 : 400,
                        fontStyle: settings.textStyle === 'italic' ? 'italic' : 'normal',
                        textDecoration: settings.textStyle === 'underline' ? 'underline' : 'none',
                      };
                      return (
                        <div key={guest.id} className="flex items-start py-0.5">
                          <span className="w-5 text-left flex-shrink-0">{actualIndex + 1}.</span>
                          <span className="break-words text-left">
                            <span style={nameStyle}>{guest.first_name} {guest.last_name}</span>
                            {settings.includeDietary && guest.dietary && guest.dietary !== 'NA' && (
                              <span className="text-primary font-bold"> - {guest.dietary}</span>
                            )}
                            {settings.includeRelation && guest.relation_display && guest.relation_display !== 'Not Assigned' && (
                              <span className="text-muted-foreground"> ({guest.relation_display})</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Footer Section - Running Sheet Style */}
            {settings.showLogo && (
              <div className="mt-auto pt-4 flex items-end justify-between" style={{ paddingBottom: '4px' }}>
                <span style={{ fontSize: '7pt', color: '#aaa' }}>
                  Page {currentTableIndex} of {totalTables}
                </span>
                <img 
                  src={weddingWaitressLogo} 
                  alt="Wedding Waitress" 
                  style={{ width: '42mm', height: '12mm', objectFit: 'contain' }}
                />
                <span style={{ fontSize: '7pt', color: '#aaa' }}>
                  Generated: {(() => {
                    const now = new Date();
                    const hours = now.getHours();
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                    return `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()} ${displayHour}:${String(now.getMinutes()).padStart(2,'0')} ${ampm}`;
                  })()}
                </span>
              </div>
            )}

          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  );
};