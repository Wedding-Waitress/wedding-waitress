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

  // Generate table positions based on layout algorithm
  const tablePositions: TablePosition[] = React.useMemo(() => {
    if (!tables.length) return [];
    
    const positions = generateTableLayout(tables, settings.layout);
    
    return positions.map(pos => ({
      ...pos,
      guests: guests.filter(guest => guest.table_id === pos.table.id)
    }));
  }, [tables, guests, settings.layout]);

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
    const svgWidth = 800;
    const svgHeight = 600;
    const padding = 40;

    return (
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="border rounded-lg bg-white"
      >
        {/* Background */}
        <rect width={svgWidth} height={svgHeight} fill="#ffffff" />
        
        {/* Title */}
        {settings.title && (
          <text 
            x={svgWidth / 2} 
            y={30} 
            textAnchor="middle" 
            className="fill-current text-foreground font-bold"
            fontSize={settings.fontSize === 'large' ? '20' : settings.fontSize === 'medium' ? '16' : '14'}
          >
            {settings.title}
          </text>
        )}
        
        {/* Subtitle */}
        {settings.subtitle && (
          <text 
            x={svgWidth / 2} 
            y={settings.title ? 50 : 30} 
            textAnchor="middle" 
            className="fill-current text-muted-foreground"
            fontSize={settings.fontSize === 'large' ? '14' : settings.fontSize === 'medium' ? '12' : '10'}
          >
            {settings.subtitle}
          </text>
        )}

        {/* Tables */}
        {tablePositions.map((tablePos, index) => {
          const { table, guests: tableGuests } = tablePos;
          const scaledX = padding + (tablePos.x * (svgWidth - 2 * padding));
          const scaledY = padding + 60 + (tablePos.y * (svgHeight - 2 * padding - 60));
          const scaledWidth = tablePos.width * (svgWidth - 2 * padding);
          const scaledHeight = tablePos.height * (svgHeight - 2 * padding - 60);

          const isRound = settings.tableShape === 'round' || 
                         (settings.tableShape === 'mixed' && index % 2 === 0);

          return (
            <g key={table.id}>
              {/* Table Shape */}
              {isRound ? (
                <ellipse
                  cx={scaledX + scaledWidth / 2}
                  cy={scaledY + scaledHeight / 2}
                  rx={scaledWidth / 2}
                  ry={scaledHeight / 2}
                  fill="#f8fafc"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                />
              ) : (
                <rect
                  x={scaledX}
                  y={scaledY}
                  width={scaledWidth}
                  height={scaledHeight}
                  fill="#f8fafc"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                  rx="8"
                />
              )}

              {/* Table Number/Name */}
              {settings.showTableNumbers && (
                <text
                  x={scaledX + scaledWidth / 2}
                  y={scaledY + scaledHeight / 2 - 10}
                  textAnchor="middle"
                  className="fill-current text-foreground font-semibold"
                  fontSize={settings.fontSize === 'large' ? '14' : settings.fontSize === 'medium' ? '12' : '10'}
                >
                  {table.table_no ? `Table ${table.table_no}` : table.name}
                </text>
              )}

              {/* Capacity */}
              {settings.showCapacity && (
                <text
                  x={scaledX + scaledWidth / 2}
                  y={scaledY + scaledHeight / 2 + 10}
                  textAnchor="middle"
                  className="fill-current text-muted-foreground"
                  fontSize={settings.fontSize === 'large' ? '12' : settings.fontSize === 'medium' ? '10' : '8'}
                >
                  {table.guest_count}/{table.limit_seats}
                </text>
              )}

              {/* Guest Names (if enabled and space allows) */}
              {settings.includeNames && tableGuests.length > 0 && scaledHeight > 60 && (
                <g>
                  {tableGuests.slice(0, 4).map((guest, guestIndex) => {
                    const colors = getColorScheme(guest, table);
                    const guestY = scaledY + scaledHeight / 2 + 25 + (guestIndex * 12);
                    
                    return (
                      <text
                        key={guest.id}
                        x={scaledX + scaledWidth / 2}
                        y={guestY}
                        textAnchor="middle"
                        fill={colors.text}
                        fontSize={settings.fontSize === 'large' ? '10' : settings.fontSize === 'medium' ? '8' : '7'}
                      >
                        {`${guest.first_name} ${guest.last_name || ''}`.trim()}
                      </text>
                    );
                  })}
                  {tableGuests.length > 4 && (
                    <text
                      x={scaledX + scaledWidth / 2}
                      y={scaledY + scaledHeight / 2 + 25 + (4 * 12)}
                      textAnchor="middle"
                      className="fill-current text-muted-foreground"
                      fontSize={settings.fontSize === 'large' ? '9' : settings.fontSize === 'medium' ? '7' : '6'}
                    >
                      +{tableGuests.length - 4} more
                    </text>
                  )}
                </g>
              )}

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

        {/* Legend */}
        {settings.colorCoding !== 'none' && (
          <g>
            <rect x={svgWidth - 150} y={svgHeight - 80} width="140" height="70" fill="#f8fafc" stroke="#e2e8f0" rx="4" />
            <text x={svgWidth - 145} y={svgHeight - 65} className="fill-current text-foreground font-medium" fontSize="10">
              Legend
            </text>
            {settings.colorCoding === 'rsvp' && (
              <>
                <rect x={svgWidth - 145} y={svgHeight - 55} width="8" height="8" fill="#dcfce7" stroke="#16a34a" />
                <text x={svgWidth - 135} y={svgHeight - 47} className="fill-current text-foreground" fontSize="8">Confirmed</text>
                <rect x={svgWidth - 145} y={svgHeight - 40} width="8" height="8" fill="#fefce8" stroke="#ca8a04" />
                <text x={svgWidth - 135} y={svgHeight - 32} className="fill-current text-foreground" fontSize="8">Pending</text>
                <rect x={svgWidth - 145} y={svgHeight - 25} width="8" height="8" fill="#fef2f2" stroke="#dc2626" />
                <text x={svgWidth - 135} y={svgHeight - 17} className="fill-current text-foreground" fontSize="8">Declined</text>
              </>
            )}
          </g>
        )}
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef}
          className="w-full aspect-[4/3] border-2 border-dashed border-muted-foreground/20 rounded-lg overflow-hidden bg-muted/5"
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
          height={600}
        />
      </CardContent>
    </Card>
  );
};