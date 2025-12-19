import React, { useState, useCallback, createContext, useContext, useRef } from 'react';
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

// Context to share drag state with children
interface DragStateContextType {
  activeGuestId: string | null;
  overGuestId: string | null;
  overTableId: string | null;
}

const DragStateContext = createContext<DragStateContextType>({
  activeGuestId: null,
  overGuestId: null,
  overTableId: null,
});

export const useDragState = () => useContext(DragStateContext);

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
  const [overGuestId, setOverGuestId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const lastOverGuestRef = useRef<string | null>(null);
  const stickyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  // Custom collision detection - prioritize guest collisions for stable targeting
  const collisionDetection: CollisionDetection = useCallback((args) => {
    // First, check for closest center collisions
    const closestCenterCollisions = closestCenter(args);
    
    // Filter to only guest collisions (prioritize guests over tables)
    const guestCollisions = closestCenterCollisions.filter(collision => {
      const container = args.droppableContainers.find(c => c.id === collision.id);
      return container?.data?.current?.type === 'guest';
    });
    
    // Prioritize guest collisions if any exist
    if (guestCollisions.length > 0) {
      return guestCollisions;
    }
    
    // Fall back to pointer detection for tables
    const pointerCollisions = pointerWithin(args);
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
    
    // Clear any pending sticky timeout
    if (stickyTimeoutRef.current) {
      clearTimeout(stickyTimeoutRef.current);
      stickyTimeoutRef.current = null;
    }
    
    if (!over) {
      setOverTableId(null);
      setOverGuestId(null);
      lastOverGuestRef.current = null;
      return;
    }

    const overData = over.data.current;
    
    // Check if over a table droppable
    if (overData?.type === 'table') {
      setOverTableId(overData.tableId);
      
      // Add "stickiness" - don't immediately clear overGuestId if we just came from a guest
      // This prevents jitter when near the boundary
      if (lastOverGuestRef.current !== null) {
        // Give a brief delay before clearing, to stabilize the indicator
        stickyTimeoutRef.current = setTimeout(() => {
          setOverGuestId(null);
          lastOverGuestRef.current = null;
        }, 80);
      } else {
        setOverGuestId(null);
      }
    } else if (overData?.type === 'guest') {
      // Over a guest - track both the guest and the table
      const overGuest = overData.guest as Guest;
      setOverTableId(overGuest.table_id);
      setOverGuestId(overGuest.id);
      lastOverGuestRef.current = overGuest.id;
    } else {
      setOverTableId(null);
      setOverGuestId(null);
      lastOverGuestRef.current = null;
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveGuest(null);
    setActiveTableId(null);
    setOverTableId(null);
    setOverGuestId(null);

    if (!over || !active) return;

    // Prevent concurrent drag operations
    if (processingRef.current) {
      toast({
        title: "Please wait",
        description: "Previous operation is still processing",
      });
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    // Early validation - don't lock processing for invalid drags
    if (!activeData || activeData.type !== 'guest') return;

    processingRef.current = true;
    setIsProcessing(true);

    try {

    const draggedGuest = activeData.guest as Guest;
    const sourceTableId = draggedGuest.table_id;

    // Determine destination table and position
    let destTableId: string | null = null;
    let insertAtIndex: number | undefined = undefined;

    if (overData?.type === 'table') {
      // Dropped directly on a table container
      destTableId = overData.tableId;
      // Insert at end - exclude dragged guest for consistent counting
      const destTableGuests = guests.filter(g => g.table_id === destTableId && g.id !== draggedGuest.id);
      insertAtIndex = destTableGuests.length;
    } else if (overData?.type === 'guest') {
      // Dropped on another guest - insert at that position
      const overGuest = overData.guest as Guest;
      destTableId = overGuest.table_id;
      
      // CRITICAL: Exclude the dragged guest from destTableGuests to match useRealtimeGuests calculation
      const destTableGuests = guests
        .filter(g => g.table_id === destTableId && g.id !== draggedGuest.id)
        .sort((a, b) => {
          const aHasSeat = a.seat_no !== null && a.seat_no !== undefined;
          const bHasSeat = b.seat_no !== null && b.seat_no !== undefined;
          if (aHasSeat && bHasSeat) return (a.seat_no || 0) - (b.seat_no || 0);
          if (aHasSeat && !bHasSeat) return -1;
          if (!aHasSeat && bHasSeat) return 1;
          return 0;
        });
      
      // Find the index of the guest we're dropping on (in the filtered list)
      const overIndex = destTableGuests.findIndex(g => g.id === overGuest.id);
      
      // If dropping on the LAST guest in the filtered list, place AFTER them
      const isLastGuest = overIndex === destTableGuests.length - 1;
      
      if (isLastGuest) {
        // Place after the last guest (at the end)
        insertAtIndex = destTableGuests.length;
      } else if (overIndex >= 0) {
        // Place before the target guest
        insertAtIndex = overIndex;
      } else {
        // Fallback: if overGuest not found (it's the dragged guest), place at end
        insertAtIndex = destTableGuests.length;
      }
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
        
        // Calculate target index based on where we're dropping
        let targetIndex: number;
        
        if (overData?.type === 'guest') {
          const overGuest = overData.guest as Guest;
          const overIndex = tableGuests.findIndex(g => g.id === overGuest.id);
          const isLastGuest = overIndex === tableGuests.length - 1;
          
          if (isLastGuest) {
            // Dropping on last guest - place at end (indicator shows AFTER)
            targetIndex = tableGuests.length - 1;
          } else {
            // Dropping on a non-last guest - indicator shows BEFORE them
            // If dragging from BEFORE the target, subtract 1 because 
            // arrayMove removes source first, shifting target down
            if (oldIndex < overIndex) {
              targetIndex = overIndex - 1;
            } else {
              targetIndex = overIndex;
            }
          }
        } else {
          // Dropped on table container - place at end
          targetIndex = tableGuests.length - 1;
        }
        
        if (oldIndex === targetIndex) return; // No change
        
        // Reorder the guests
        const reorderedGuests = arrayMove(tableGuests, oldIndex, targetIndex);
        const orderedGuestIds = reorderedGuests.map(g => g.id);
        
        await onReorderGuests(sourceTableId, orderedGuestIds);
      } else {
        // Cross-table move
        const guestName = `${draggedGuest.first_name} ${draggedGuest.last_name || ''}`.trim();
        await onMoveGuest(draggedGuest.id, sourceTableId, destTableId, guestName, insertAtIndex);
      }
    } catch (error) {
      console.error('Error during drag operation:', error);
      toast({
        title: "Error",
        description: "Failed to move guest. Please try again.",
        variant: "destructive",
      });
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [guests, onMoveGuest, onReorderGuests, toast]);

  // Create drag state context value
  const dragStateValue: DragStateContextType = {
    activeGuestId: activeGuest?.id || null,
    overGuestId,
    overTableId,
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <DragStateContext.Provider value={dragStateValue}>
        {/* Pass overTableId to children via context or props if needed */}
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
              isOverTable: overTableId,
            });
          }
          return child;
        })}
      </DragStateContext.Provider>
      
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
