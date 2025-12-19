import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableGuestItem } from './SortableGuestItem';
import { useDragState } from './SortableTablesGrid';
import { Guest } from '@/hooks/useGuests';

interface TableGuestListProps {
  tableId: string;
  guests: Guest[];
  isOver?: boolean;
}

export const TableGuestList: React.FC<TableGuestListProps> = ({
  tableId,
  guests,
  isOver = false
}) => {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: `table-${tableId}`,
    data: {
      type: 'table',
      tableId,
    }
  });

  // Get drag state from context
  const { activeGuestId, overGuestId } = useDragState();

  const showDropIndicator = isOver || isDroppableOver;
  const guestIds = guests.map(g => g.id);
  const isDragging = activeGuestId !== null;

  return (
    <div ref={setNodeRef} className="min-h-[40px]">
      <SortableContext items={guestIds} strategy={verticalListSortingStrategy}>
        <div className={`space-y-1 transition-all duration-200 ${isDragging ? 'py-1' : ''}`}>
          {guests.length > 0 ? (
            guests.map((guest, index) => (
              <SortableGuestItem 
                key={guest.id} 
                guest={guest} 
                isBeingDraggedOver={overGuestId === guest.id && activeGuestId !== guest.id}
                isLastInList={index === guests.length - 1}
              />
            ))
          ) : (
            <div 
              className={`text-muted-foreground italic text-xs p-2 border-2 border-dashed rounded-md text-center transition-all duration-200 ${
                showDropIndicator 
                  ? 'border-primary bg-primary/10 text-primary py-4' 
                  : 'border-muted'
              }`}
            >
              {showDropIndicator ? 'Drop guest here' : 'No guests assigned'}
            </div>
          )}
        </div>
      </SortableContext>
      
      {/* Drop indicator at the bottom when guests exist and hovering over table (not a specific guest) - solid dark purple with glow */}
      {guests.length > 0 && showDropIndicator && !overGuestId && (
        <div className="h-2.5 bg-[#7C3AED] rounded-full mt-2 shadow-[0_0_10px_rgba(124,58,237,0.7)] border-2 border-[#5B21B6]" />
      )}
    </div>
  );
};
