import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartSettings } from './TableSeatingChartPage';
import { TableWithGuestCount } from '@/hooks/useTables';
import { Guest } from '@/hooks/useGuests';
import { generateTableLayout } from '@/lib/tableLayoutAlgorithms';
import { Eye, Users, Utensils } from 'lucide-react';

interface TableChartPreviewProps {
  settings: ChartSettings;
  tables: TableWithGuestCount[];
  guests: Guest[];
  event: any;
}

interface TablePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  table: TableWithGuestCount;
  guests: Guest[];
}

export const TableChartPreview: React.FC<TableChartPreviewProps> = ({
  settings,
  tables,
  guests,
  event
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const formatDateWithOrdinal = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const ordinal = getOrdinalSuffix(day);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const year = date.getFullYear();
      return `${weekday} ${day}${ordinal}, ${month} ${year}`;
    } catch {
      return dateString;
    }
  };

  // Generate table positions based on layout algorithm
  const tablePositions: TablePosition[] = React.useMemo(() => {
    if (!tables.length) return [];
    
    const positions = generateTableLayout(tables, 'grid');
    
    return positions.map(pos => ({
      ...pos,
      guests: guests.filter(guest => guest.table_id === pos.table.id)
    }));
  }, [tables, guests]);

  // Color schemes
  const getColorScheme = (guest: Guest, table: TableWithGuestCount) => {
    switch (settings.colorCoding) {
      case 'rsvp':
        switch (guest.rsvp) {
          case 'Confirmed': return { bg: '#dcfce7', border: '#16a34a', text: '#15803d' };
          case 'Declined': return { bg: '#fef2f2', border: '#dc2626', text: '#dc2626' };
          case 'Pending': return { bg: '#fefce8', border: '#ca8a04', text: '#a16207' };
          default: return { bg: '#f1f5f9', border: '#64748b', text: '#475569' };
        }
      case 'dietary':
        const hasDietary = guest.dietary && guest.dietary !== 'NA';
        return hasDietary 
          ? { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' }
          : { bg: '#f1f5f9', border: '#64748b', text: '#475569' };
      case 'capacity':
        const isAtCapacity = table.guest_count >= table.limit_seats;
        const isOverCapacity = table.guest_count > table.limit_seats;
        if (isOverCapacity) return { bg: '#fef2f2', border: '#dc2626', text: '#dc2626' };
        if (isAtCapacity) return { bg: '#fefce8', border: '#ca8a04', text: '#a16207' };
        return { bg: '#dcfce7', border: '#16a34a', text: '#15803d' };
      default:
        return { bg: '#f8fafc', border: '#e2e8f0', text: '#334155' };
    }
  };

  const renderSVGChart = () => {
    // Portrait format - A4 ratio (210:297)
    const svgWidth = 800;
    const svgHeight = 1131; // A4 ratio in pixels
    const padding = 40;

    return (
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="border bg-white"
      >
        {/* Background */}
        <rect width={svgWidth} height={svgHeight} fill="#ffffff" />
        
        {/* Header - Event Name */}
        <text 
          x={svgWidth / 2} 
          y={30} 
          textAnchor="middle" 
          fill="#7C3AED"
          fontWeight="bold"
          fontSize="18"
        >
          {event?.name || 'Event'}
        </text>
        
        {/* Header - Date, Venue, Chart Type */}
        <text 
          x={svgWidth / 2} 
          y={50} 
          textAnchor="middle" 
          fill="#000000"
          fontSize="14"
        >
          {event?.date && formatDateWithOrdinal(event.date)}
          {event?.date && event?.venue && ' - '}
          {event?.venue && event.venue}
          {(event?.date || event?.venue) && ' - '}
          Table Seating Chart
        </text>

        {/* Tables */}
        {tablePositions.map((tablePos, index) => {
          const { table, guests: tableGuests } = tablePos;
          const scaledX = padding + (tablePos.x * (svgWidth - 2 * padding));
          const scaledY = padding + 60 + (tablePos.y * (svgHeight - 2 * padding - 60));
          const scaledWidth = tablePos.width * (svgWidth - 2 * padding);
          const scaledHeight = tablePos.height * (svgHeight - 2 * padding - 60);

          const isRound = settings.tableShape === 'round';

          return (
            <g key={table.id}>
              {/* Table Shape */}
              {isRound ? (
                <ellipse
                  cx={scaledX + scaledWidth / 2}
                  cy={scaledY + scaledHeight / 2}
                  rx={Math.min(scaledWidth, scaledHeight) / 2}
                  ry={Math.min(scaledWidth, scaledHeight) / 2}
                  fill="#ffffff"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                />
              ) : (
                <rect
                  x={scaledX}
                  y={scaledY}
                  width={scaledWidth}
                  height={scaledHeight}
                  fill="#ffffff"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                  rx="8"
                />
              )}

              {/* Table number and capacity centered at top */}
              <text
                x={scaledX + scaledWidth / 2}
                y={scaledY + 20}
                textAnchor="middle"
                className="fill-current text-foreground"
                fontSize={settings.fontSize === 'large' ? '15' : settings.fontSize === 'medium' ? '12' : '9'}
              >
                <tspan className="font-bold">
                  {settings.showTableNumbers ? `Table ${table.table_no || table.name}` : 'Table'}
                </tspan>
                <tspan className="font-normal">
                  {` - ${table.guest_count}/${table.limit_seats}`}
                </tspan>
              </text>


              {/* Guest Names - show up to 100 guests with dash formatting */}
              {settings.includeNames && (() => {
                // Show up to 100 guests per table
                const displayedGuests = tableGuests.slice(0, 100);
                
                if (displayedGuests.length === 0) {
                  return null;
                }

                // Use fixed font size based on typography setting (in points for true-to-size)
                const guestFontSize = settings.fontSize === 'small' ? 9 : settings.fontSize === 'large' ? 12 : 10.5;
                
                // Calculate positioning - closer to table number
                const tablePadding = settings.tableShape === 'round' ? scaledWidth * 0.15 : scaledWidth * 0.1;
                const availableWidth = scaledWidth - (tablePadding * 2);
                const availableHeight = scaledHeight - (tablePadding * 2);
                
                // Start names closer to table number
                const startY = scaledY + tablePadding + guestFontSize * 1.5;
                const lineHeight = guestFontSize * 1.2; // Tighter line spacing
                
                // Display each guest individually on their own line, centered
                return displayedGuests.map((guest, guestIndex) => {
                  const nameY = startY + (guestIndex * lineHeight);
                  
                  // Check if name fits within table boundaries
                  if (settings.tableShape === 'round') {
                    const distanceFromCenter = Math.abs(nameY - (scaledY + scaledHeight / 2));
                    const maxDistanceAtY = Math.sqrt(Math.pow(scaledHeight / 2, 2) - Math.pow(distanceFromCenter, 2));
                    if (maxDistanceAtY < scaledWidth * 0.3) return null;
                  } else {
                    if (nameY > scaledY + scaledHeight - tablePadding) return null;
                  }

                  const guestColors = getColorScheme(guest, table);
                  const guestName = `${guest.first_name} ${guest.last_name || ''}`.trim();

                  return (
                    <text
                      key={`${table.id}-guest-${guestIndex}`}
                      x={scaledX + scaledWidth / 2}
                      y={nameY}
                      textAnchor="middle"
                      fontSize={guestFontSize}
                      fill={guestColors.text}
                      fontFamily="Inter, sans-serif"
                      fontWeight="500"
                    >
                      {guestName}
                    </text>
                  );
                });
              })()}

              {/* Color coding indicator */}
              {settings.colorCoding !== 'none' && (
                <rect
                  x={scaledX + scaledWidth - 10}
                  y={scaledY + 5}
                  width="8"
                  height="8"
                  fill={tableGuests.length > 0 ? getColorScheme(tableGuests[0], table).bg : '#f1f5f9'}
                  stroke={tableGuests.length > 0 ? getColorScheme(tableGuests[0], table).border : '#64748b'}
                  strokeWidth="1"
                  rx="2"
                />
              )}
            </g>
          );
        })}

        {/* Footer Stats */}
        <text 
          x={svgWidth / 2} 
          y={svgHeight - 140} 
          textAnchor="middle" 
          fill="#666666"
          fontSize="10"
        >
          Total Guests: {guests.length} - Generated on: {new Date().toLocaleDateString()}
        </text>

        {/* Wedding Waitress Logo at bottom - larger for better visibility */}
        <image
          href="/wedding-waitress-new-logo.png"
          x={svgWidth / 2 - 60}
          y={svgHeight - 130}
          width="120"
          height="120"
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Chart Preview</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {tables.length} Tables
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Utensils className="w-3 h-3 mr-1" />
              {guests.length} Guests
            </Badge>
            
            {/* Legend for RSVP color coding */}
            {settings.colorCoding === 'rsvp' && (
              <div className="ml-4 flex items-center space-x-4">
                <span className="text-xs text-muted-foreground font-medium">Legend:</span>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#dcfce7', border: '1px solid #16a34a' }}></div>
                  <span className="text-xs text-muted-foreground">Confirmed</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#fefce8', border: '1px solid #ca8a04' }}></div>
                  <span className="text-xs text-muted-foreground">Pending</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#fef2f2', border: '1px solid #dc2626' }}></div>
                  <span className="text-xs text-muted-foreground">Declined</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef}
          className="w-full aspect-[210/297] border-2 border-dashed border-muted-foreground/20 rounded-lg overflow-hidden bg-muted/5"
        >
          {tables.length > 0 ? (
            renderSVGChart()
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tables to display</p>
                <p className="text-xs">Create tables first to see the chart preview</p>
              </div>
            </div>
          )}
        </div>
        
        <canvas 
          ref={canvasRef} 
          className="hidden" 
          width={800} 
          height={1131}
        />
      </CardContent>
    </Card>
  );
};