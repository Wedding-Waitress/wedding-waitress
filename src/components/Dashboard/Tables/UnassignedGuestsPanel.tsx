import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { SortableGuestItem } from './SortableGuestItem';
import { useDragState } from './SortableTablesGrid';
import { Guest } from '@/hooks/useGuests';

interface UnassignedGuestsPanelProps {
  guests: Guest[];
}

export const UnassignedGuestsPanel: React.FC<UnassignedGuestsPanelProps> = ({ guests }) => {
  const unassignedGuests = guests.filter(g => g.table_id === null);
  
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned-drop-zone',
    data: {
      type: 'unassigned',
    }
  });

  const { activeGuestId, overGuestId, overGuestPosition } = useDragState();
  const guestIds = unassignedGuests.map(g => g.id);
  const isDragging = activeGuestId !== null;

  // Sort guests alphabetically by first name, then last name
  const sortedGuests = [...unassignedGuests].sort((a, b) => {
    const nameA = `${a.first_name} ${a.last_name || ''}`.toLowerCase();
    const nameB = `${b.first_name} ${b.last_name || ''}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <Card className={`ww-box transition-all duration-200 ${
      isOver ? 'border-2 border-primary bg-primary/5 shadow-lg' : 'border border-border'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Unassigned Guests
          </CardTitle>
          <Badge variant="secondary" className="font-bold">
            {unassignedGuests.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={setNodeRef} 
          className="min-h-[100px] max-h-[300px] overflow-y-auto"
          role="list"
          aria-label="Unassigned guests"
        >
          <SortableContext items={guestIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sortedGuests.length > 0 ? (
                sortedGuests.map((guest, index) => (
                  <SortableGuestItem 
                    key={guest.id} 
                    guest={guest}
                    isBeingDraggedOver={overGuestId === guest.id && activeGuestId !== guest.id}
                    indicatorPosition={overGuestId === guest.id && activeGuestId !== guest.id ? overGuestPosition : null}
                  />
                ))
              ) : (
                <div 
                  className={`text-muted-foreground italic text-sm p-4 border-2 border-dashed rounded-lg text-center transition-colors duration-150 ${
                    isOver 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-muted'
                  }`}
                >
                  {isOver ? 'Drop guest here to unassign' : 'All guests are assigned to tables'}
                </div>
              )}
            </div>
          </SortableContext>
          
          {/* Drop indicator at the bottom when guests exist and hovering over panel */}
          {sortedGuests.length > 0 && isOver && !overGuestId && (
            <div className="h-2 bg-primary rounded-full mt-2 shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
