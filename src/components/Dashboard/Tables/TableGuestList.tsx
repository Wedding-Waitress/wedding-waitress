import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableGuestItem } from './SortableGuestItem';
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

  const showDropIndicator = isOver || isDroppableOver;
  const guestIds = guests.map(g => g.id);

  return (
    <div ref={setNodeRef} className="min-h-[40px]">
      <SortableContext items={guestIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {guests.length > 0 ? (
            guests.map((guest) => (
              <SortableGuestItem key={guest.id} guest={guest} />
            ))
          ) : (
            <div 
              className={`text-muted-foreground italic text-xs p-2 border-2 border-dashed rounded-md text-center transition-colors ${
                showDropIndicator 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-muted'
              }`}
            >
              {showDropIndicator ? 'Drop guest here' : 'No guests assigned'}
            </div>
          )}
        </div>
      </SortableContext>
      
      {/* Drop indicator at the bottom when guests exist */}
      {guests.length > 0 && showDropIndicator && (
        <div className="h-0.5 bg-primary rounded-full mt-1 animate-pulse" />
      )}
    </div>
  );
};
