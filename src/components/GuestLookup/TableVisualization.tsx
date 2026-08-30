import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, Utensils } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeRsvp } from '@/lib/rsvp';
import { getHeadParticipantName, parseHeadSeatingOrder, type HeadSeatEntry, type TablePurpose } from '@/lib/headTable';

interface TableGuest {
  id: string;
  first_name: string;
  last_name: string;
  seat_no: number | null;
  dietary: string;
  rsvp: string;
}

interface TableData {
  id: string;
  table_no: number;
  name: string;
  limit_seats: number;
  notes: string | null;
  guests: TableGuest[];
  table_purpose: TablePurpose;
  head_seating_order: HeadSeatEntry[];
  participant1_name: string | null;
  participant2_name: string | null;
}

interface TableVisualizationProps {
  tableId: string;
  tableNumber: number;
  eventId: string;
}

export const TableVisualization: React.FC<TableVisualizationProps> = ({
  tableId,
  tableNumber,
  eventId
}) => {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTableData = async () => {
      try {
        // Use public RPC function to fetch table data (bypasses RLS)
        const [{ data, error }, { data: semanticData, error: semanticError }] = await Promise.all([
          supabase.rpc('get_public_table_data', { p_table_id: tableId, p_event_id: eventId }),
          (supabase.rpc as any)('get_public_table_semantics', { p_table_id: tableId, p_event_id: eventId }),
        ]);

        if (error) throw error;
        if (semanticError) throw semanticError;

        if (!data || data.length === 0) {
          setTableData(null);
          return;
        }

        // Transform RPC response into TableData format
        const firstRow = data[0];
        const semantics = (semanticData ?? {}) as Record<string, unknown>;
        const tableInfo: TableData = {
          id: firstRow.table_id,
          table_no: firstRow.table_no,
          name: firstRow.table_name,
          limit_seats: firstRow.limit_seats,
          notes: firstRow.table_notes,
          table_purpose: semantics.table_purpose === 'head' ? 'head' : 'standard',
          head_seating_order: parseHeadSeatingOrder(semantics.head_seating_order),
          participant1_name: typeof semantics.participant1_name === 'string' ? semantics.participant1_name : null,
          participant2_name: typeof semantics.participant2_name === 'string' ? semantics.participant2_name : null,
          guests: data
            .filter((row: any) => row.guest_id) // Only include rows with guest data
            .map((row: any) => ({
              id: row.guest_id,
              first_name: row.guest_first_name,
              last_name: row.guest_last_name,
              seat_no: row.guest_seat_no,
              dietary: row.guest_dietary || '',
              rsvp: row.guest_rsvp || 'Pending'
            }))
        };

        setTableData(tableInfo);
      } catch (error) {
        console.error('Error fetching table data:', error);
        setTableData(null);
      } finally {
        setLoading(false);
      }
    };

    if (tableId && eventId) {
      fetchTableData();
    }
  }, [tableId, eventId]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tableData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Table information not available</p>
        </CardContent>
      </Card>
    );
  }

  const arrangeSeats = (guests: TableGuest[], capacity: number) => {
    const seats = Array.from({ length: capacity }, (_, i) => ({
      position: i + 1,
      guest: guests.find(g => g.seat_no === i + 1) || null
    }));
    return seats;
  };

  const seats = arrangeSeats(tableData.guests, tableData.limit_seats);
  const radius = 80; // Base radius for the table
  const guestById = new Map(tableData.guests.map((guest) => [guest.id, guest]));
  const headOccupants = tableData.head_seating_order.map((entry) => entry.kind === 'participant'
    ? getHeadParticipantName(entry, tableData.participant1_name, tableData.participant2_name)
    : `${guestById.get(entry.guest_id)?.first_name ?? 'Guest'} ${guestById.get(entry.guest_id)?.last_name ?? ''}`.trim());
  const headOccupantOffset = Math.floor((tableData.limit_seats - headOccupants.length) / 2);
  
  return (
    <Card className="w-full card-elevated">
      <CardHeader className="text-center">
        {tableData.notes && (
          <div className="flex items-center justify-center mt-1">
            <Badge variant="outline" className="text-xs">
              {tableData.notes}
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-6">
        {tableData.table_purpose === 'head' ? (
          <div data-head-table-order="left-to-right-as-viewed-by-guests" className="mx-auto mt-4 w-full max-w-3xl overflow-x-auto pb-2">
            <p className="mb-3 text-center text-xs text-muted-foreground">Left to right, as viewed by the guests.</p>
            <div className="grid min-w-[560px] items-end gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, tableData.limit_seats)}, minmax(0, 1fr))` }}>
              {Array.from({ length: tableData.limit_seats }, (_, index) => (
                <div key={index} className="text-center">
                  <div data-live-body className="mb-2 min-h-9 break-words text-xs font-semibold">{headOccupants[index - headOccupantOffset] ?? ''}</div>
                  <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs ${headOccupants[index - headOccupantOffset] ? 'border-green-500 bg-green-500/10 text-green-700' : 'border-[#C4A882] bg-[#C4A882]/10 text-[#967A59]'}`}>{index + 1}</div>
                </div>
              ))}
            </div>
            <div data-live-section-heading className="mt-2 flex h-24 min-w-[560px] items-center justify-center rounded-xl border-2 border-primary/30 bg-gradient-card text-xl font-bold text-primary">{tableData.name}</div>
          </div>
        ) : <div className="relative mx-auto w-[180px] h-[180px] md:w-[280px] md:h-[280px] mt-4">
          {/* Table Surface */}
          <div 
            className="absolute inset-0 bg-gradient-card border-2 border-primary/30 rounded-full flex items-center justify-center"
            style={{ 
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1), 0 4px 12px rgba(126, 110, 255, 0.15)' 
            }}
          >
            <div className="text-center px-2">
              {/* Line 1: "Table" - permanent label */}
              <div data-live-section-heading className="text-base md:text-xl font-bold text-primary">
                Table
              </div>
              {/* Line 2: Table number or name */}
              <div data-live-section-heading className="text-base md:text-xl font-bold text-primary leading-tight">
                {tableData.name || tableData.table_no}
              </div>
              {/* Line 3: Seated count in brackets */}
              <div data-live-body className="text-xs md:text-sm font-normal text-muted-foreground mt-1">
                ({tableData.guests.length} of {tableData.limit_seats} seated)
              </div>
            </div>
          </div>

          {/* Seats around the table */}
          {seats.map((seat, index) => {
            const angle = (index * 360) / seats.length;
            const radian = (angle - 90) * (Math.PI / 180);
            // Use percentage-based positioning (58% from center = seats positioned outside table)
            const seatDistancePercent = 58;
            const x = 50 + seatDistancePercent * Math.cos(radian);
            const y = 50 + seatDistancePercent * Math.sin(radian);
            
            return (
              <div
                key={seat.position}
                className={`absolute w-10 h-10 md:w-16 md:h-16 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-all ${
                  seat.guest 
                    ? normalizeRsvp(seat.guest.rsvp) === 'Attending'
                      ? 'bg-green-500/10 border-green-500 text-green-700'
                      : normalizeRsvp(seat.guest.rsvp) === 'Not Attending'
                      ? 'bg-red-500/10 border-red-500 text-red-700'
                      : 'bg-warning/10 border-warning text-warning-foreground'
                    : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                }`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                title={seat.guest ? `${seat.guest.first_name} ${seat.guest.last_name}` : `Seat ${seat.position}`}
              >
                {seat.guest ? (
                  <div className="text-center leading-tight">
                    <div className="text-xs font-semibold text-black">
                      {seat.guest.first_name.charAt(0)}{seat.guest.last_name.charAt(0)}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs opacity-60">{seat.position}</div>
                )}
              </div>
            );
          })}
        </div>}

        {/* Guest List */}
        <div className="mt-6 space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground mb-3">Seated Guests</h4>
          {tableData.guests.length > 0 ? (
            <div className="space-y-2">
              {tableData.guests.map((guest) => (
                <div 
                  key={guest.id} 
                  className="flex items-center justify-between p-2 bg-background-subtle rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      normalizeRsvp(guest.rsvp) === 'Attending' ? 'bg-green-500' :
                      normalizeRsvp(guest.rsvp) === 'Not Attending' ? 'bg-red-500' : 'bg-warning'
                    }`} />
                    <div>
                      <div data-live-body className="text-sm font-medium">
                        {guest.first_name} {guest.last_name}
                      </div>
                      {guest.dietary && guest.dietary !== 'NA' && (
                        <div data-live-body className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Utensils className="w-3 h-3" />
                          <span>{guest.dietary}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {guest.seat_no && (
                      <Badge variant="outline" className="text-xs">
                        Seat {guest.seat_no}
                      </Badge>
                    )}
                    <div className={`text-xs mt-1 ${
                      normalizeRsvp(guest.rsvp) === 'Attending' ? 'text-green-500' :
                      normalizeRsvp(guest.rsvp) === 'Not Attending' ? 'text-red-500' : 'text-warning'
                    }`}>
                      {normalizeRsvp(guest.rsvp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No guests seated at this table yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
