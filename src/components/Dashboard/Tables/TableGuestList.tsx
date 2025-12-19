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
        <div className="space-y-2">
          {guests.length > 0 ? (
            guests.map((guest, index) => (
              <SortableGuestItem 
                key={guest.id} 
                guest={guest} 
                isBeingDraggedOver={overGuestId === guest.id && activeGuestId !== guest.id}
                isLastInList={index === guests.length - 1}
                showIndicatorAfter={index === guests.length - 1 && overGuestId === guest.id && activeGuestId !== guest.id}
              />
            ))
          ) : (
            <div 
              className={`text-muted-foreground italic text-xs p-3 border-2 border-dashed rounded-md text-center transition-colors duration-150 ${
                showDropIndicator 
                  ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED] shadow-[0_0_8px_rgba(124,58,237,0.4)]' 
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
