import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, Utensils } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
        const { data, error } = await supabase.rpc('get_public_table_data', {
          p_table_id: tableId,
          p_event_id: eventId
        });

        if (error) throw error;

        if (!data || data.length === 0) {
          setTableData(null);
          return;
        }

        // Transform RPC response into TableData format
        const firstRow = data[0];
        const tableInfo: TableData = {
          id: firstRow.table_id,
          table_no: firstRow.table_no,
          name: firstRow.table_name,
          limit_seats: firstRow.limit_seats,
          notes: firstRow.table_notes,
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
  
  return (
    <Card className="w-full card-elevated">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 flex-wrap text-base font-bold">
          <span>Table {tableData.table_no}</span>
        </CardTitle>
        {tableData.notes && (
          <div className="flex items-center justify-center mt-1">
            <Badge variant="outline" className="text-xs">
              {tableData.notes}
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Round Table Visualization */}
        <div className="relative mx-auto w-[180px] h-[180px] md:w-[280px] md:h-[280px] mt-4">
          {/* Table Surface */}
          <div 
            className="absolute inset-0 bg-gradient-card border-2 border-primary/30 rounded-full flex items-center justify-center"
            style={{ 
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1), 0 4px 12px rgba(126, 110, 255, 0.15)' 
            }}
          >
            <div className="text-center px-2">
              <div className="text-xs md:text-sm font-semibold text-primary leading-tight">
                {tableData.name || `Table ${tableData.table_no}`}
              </div>
              <div className="text-xs md:text-xs font-normal text-muted-foreground mt-1">
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
                    ? seat.guest.rsvp === 'Confirmed'
                      ? 'bg-success/10 border-success text-success-foreground'
                      : seat.guest.rsvp === 'Declined'
                      ? 'bg-destructive/10 border-destructive text-destructive-foreground'
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
        </div>

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
                      guest.rsvp === 'Confirmed' ? 'bg-success' :
                      guest.rsvp === 'Declined' ? 'bg-destructive' : 'bg-warning'
                    }`} />
                    <div>
                      <div className="text-sm font-medium">
                        {guest.first_name} {guest.last_name}
                      </div>
                      {guest.dietary && guest.dietary !== 'NA' && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
                      guest.rsvp === 'Confirmed' ? 'text-success' :
                      guest.rsvp === 'Declined' ? 'text-destructive' : 'text-warning'
                    }`}>
                      {guest.rsvp || 'Pending'}
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