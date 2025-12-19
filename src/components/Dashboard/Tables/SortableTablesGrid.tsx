import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  UniqueIdentifier,
  CollisionDetection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { SortableGuestItem } from './SortableGuestItem';
import { Guest } from '@/hooks/useGuests';
import { TableWithGuestCount } from '@/hooks/useTables';
import { useToast } from '@/hooks/use-toast';

interface SortableTablesGridProps {
  children: React.ReactNode;
  tables: TableWithGuestCount[];
  guests: Guest[];
  onMoveGuest: (
    guestId: string, 
    sourceTableId: string | null, 
    destTableId: string, 
    guestName: string,
    insertAtIndex?: number
  ) => Promise<boolean>;
  onReorderGuests: (
    tableId: string,
    orderedGuestIds: string[]
  ) => Promise<boolean>;
}

export const SortableTablesGrid: React.FC<SortableTablesGridProps> = ({
  children,
  tables,
  guests,
  onMoveGuest,
  onReorderGuests,
}) => {
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [overTableId, setOverTableId] = useState<string | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Custom collision detection for cross-container sorting
  const collisionDetection: CollisionDetection = useCallback((args) => {
    // First, check for intersections with the closest center
    const closestCenterCollisions = closestCenter(args);
    
    // Then check pointer collision for table droppables
    const pointerCollisions = pointerWithin(args);
    
    // Combine results, prioritizing guest collisions for sorting
    if (closestCenterCollisions.length > 0) {
      return closestCenterCollisions;
    }
    
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    
    return rectIntersection(args);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const guestData = active.data.current;
    
    if (guestData?.type === 'guest') {
      setActiveGuest(guestData.guest);
      setActiveTableId(guestData.guest.table_id);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    if (!over) {
      setOverTableId(null);
      return;
    }

    const overData = over.data.current;
    
    // Check if over a table droppable
    if (overData?.type === 'table') {
      setOverTableId(overData.tableId);
    } else if (overData?.type === 'guest') {
      // Over a guest - find which table that guest belongs to
      setOverTableId(overData.guest.table_id);
    } else {
      setOverTableId(null);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveGuest(null);
    setActiveTableId(null);
    setOverTableId(null);

    if (!over || !active) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || activeData.type !== 'guest') return;

    const draggedGuest = activeData.guest as Guest;
    const sourceTableId = draggedGuest.table_id;

    // Determine destination table and position
    let destTableId: string | null = null;
    let insertAtIndex: number | undefined = undefined;

    if (overData?.type === 'table') {
      // Dropped directly on a table container
      destTableId = overData.tableId;
      // Insert at end
      const destTableGuests = guests.filter(g => g.table_id === destTableId);
      insertAtIndex = destTableGuests.length;
    } else if (overData?.type === 'guest') {
      // Dropped on another guest - insert at that position
      const overGuest = overData.guest as Guest;
      destTableId = overGuest.table_id;
      
      // Get all guests in the destination table sorted by seat_no
      const destTableGuests = guests
        .filter(g => g.table_id === destTableId)
        .sort((a, b) => {
          const aHasSeat = a.seat_no !== null && a.seat_no !== undefined;
          const bHasSeat = b.seat_no !== null && b.seat_no !== undefined;
          if (aHasSeat && bHasSeat) return (a.seat_no || 0) - (b.seat_no || 0);
          if (aHasSeat && !bHasSeat) return -1;
          if (!aHasSeat && bHasSeat) return 1;
          return 0;
        });
      
      // Find the index of the guest we're dropping on
      const overIndex = destTableGuests.findIndex(g => g.id === overGuest.id);
      insertAtIndex = overIndex >= 0 ? overIndex : destTableGuests.length;
    }

    if (!destTableId) return;

    // Same table reordering
    if (sourceTableId === destTableId) {
      const tableGuests = guests
        .filter(g => g.table_id === sourceTableId)
        .sort((a, b) => {
          const aHasSeat = a.seat_no !== null && a.seat_no !== undefined;
          const bHasSeat = b.seat_no !== null && b.seat_no !== undefined;
          if (aHasSeat && bHasSeat) return (a.seat_no || 0) - (b.seat_no || 0);
          if (aHasSeat && !bHasSeat) return -1;
          if (!aHasSeat && bHasSeat) return 1;
          return 0;
        });
      
      const oldIndex = tableGuests.findIndex(g => g.id === draggedGuest.id);
      const newIndex = insertAtIndex !== undefined ? insertAtIndex : tableGuests.length - 1;
      
      if (oldIndex === newIndex) return; // No change
      
      // Reorder the guests
      const reorderedGuests = arrayMove(tableGuests, oldIndex, newIndex);
      const orderedGuestIds = reorderedGuests.map(g => g.id);
      
      await onReorderGuests(sourceTableId, orderedGuestIds);
    } else {
      // Cross-table move
      const guestName = `${draggedGuest.first_name} ${draggedGuest.last_name || ''}`.trim();
      await onMoveGuest(draggedGuest.id, sourceTableId, destTableId, guestName, insertAtIndex);
    }
  }, [guests, onMoveGuest, onReorderGuests]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Pass overTableId to children via context or props if needed */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            isOverTable: overTableId,
          });
        }
        return child;
      })}
      
      <DragOverlay>
        {activeGuest ? (
          <div className="w-48">
            <SortableGuestItem guest={activeGuest} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default SortableTablesGrid;
