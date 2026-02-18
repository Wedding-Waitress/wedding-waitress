import React, { useState, useCallback, createContext, useContext, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  UniqueIdentifier,
  CollisionDetection,
  Announcements,
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
  isOverUnassigned: boolean;
  overGuestPosition: 'above' | 'below' | null;
}

const DragStateContext = createContext<DragStateContextType>({
  activeGuestId: null,
  overGuestId: null,
  overTableId: null,
  isOverUnassigned: false,
  overGuestPosition: null,
});

export const useDragState = () => useContext(DragStateContext);

interface SortableTablesGridProps {
  children: React.ReactNode;
  tables: TableWithGuestCount[];
  guests: Guest[];
  onMoveGuest: (
    guestId: string, 
    sourceTableId: string | null, 
    destTableId: string | null, 
    guestName: string,
    insertAtIndex?: number
  ) => Promise<boolean>;
  onReorderGuests: (
    tableId: string,
    orderedGuestIds: string[]
  ) => Promise<boolean>;
  onGuestMoved?: (guestName: string, tableName: string | null, previousTableId: string | null, previousSeatNo: number | null) => void;
}

export const SortableTablesGrid: React.FC<SortableTablesGridProps> = ({
  children,
  tables,
  guests,
  onMoveGuest,
  onReorderGuests,
  onGuestMoved,
}) => {
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [overTableId, setOverTableId] = useState<string | null>(null);
  const [overGuestId, setOverGuestId] = useState<string | null>(null);
  const [isOverUnassigned, setIsOverUnassigned] = useState(false);
  const [overGuestPosition, setOverGuestPosition] = useState<'above' | 'below' | null>(null);
  const overGuestPositionRef = useRef<'above' | 'below' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const lastOverGuestRef = useRef<string | null>(null);
  const stickyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointerPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const { toast } = useToast();

  // Track real-time pointer position during active drags
  useEffect(() => {
    if (!activeGuest) return;
    const handler = (e: PointerEvent) => {
      pointerPositionRef.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener('pointermove', handler);
    return () => document.removeEventListener('pointermove', handler);
  }, [activeGuest]);

  // Accessibility announcements for screen readers
  const announcements: Announcements = {
    onDragStart({ active }) {
      const guest = active.data.current?.guest;
      return guest ? `Picked up ${guest.first_name} ${guest.last_name || ''}` : 'Picked up guest';
    },
    onDragOver({ active, over }) {
      if (!over) return 'Not over a valid drop area';
      const overData = over.data.current;
      if (overData?.type === 'table') {
        const table = tables.find(t => t.id === overData.tableId);
        return table ? `Over table ${table.name}` : 'Over a table';
      }
      if (overData?.type === 'unassigned') {
        return 'Over unassigned guests area';
      }
      if (overData?.type === 'guest') {
        const overGuest = overData.guest;
        return overGuest ? `Over ${overGuest.first_name} ${overGuest.last_name || ''}` : 'Over a guest';
      }
      return '';
    },
    onDragEnd({ active, over }) {
      const guest = active.data.current?.guest;
      if (!over) {
        return guest ? `Dropped ${guest.first_name} outside valid area` : 'Dropped outside valid area';
      }
      return guest ? `Dropped ${guest.first_name}` : 'Dropped guest';
    },
    onDragCancel() {
      return 'Drag cancelled';
    },
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Table-aware collision detection: first find which table the pointer is over,
  // then find the closest guest within ONLY that table for positional insertion.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    // Step 1: Find which containers the pointer is within
    const pointerCollisions = pointerWithin(args);

    // Step 2: Identify the table/unassigned container under the pointer
    const tableCollision = pointerCollisions.find(c => {
      const container = args.droppableContainers.find(dc => dc.id === c.id);
      const type = container?.data?.current?.type;
      return type === 'table' || type === 'unassigned';
    });

    if (tableCollision) {
      const tableContainer = args.droppableContainers.find(
        dc => dc.id === tableCollision.id
      );
      const tableData = tableContainer?.data?.current;

      if (tableData?.type === 'table') {
        const tableId = tableData.tableId;

        // Step 3: Among closestCenter results, keep only guests on THIS table
        const pointerY = pointerPositionRef.current.y;
        const pointerX = pointerPositionRef.current.x;
        const pointerRect = {
          ...args.collisionRect,
          top: pointerY,
          bottom: pointerY + 1,
          left: pointerX,
          right: pointerX + 1,
          width: 1,
          height: 1,
        };
        const allClosest = closestCenter({ ...args, collisionRect: pointerRect });
        const guestsOnThisTable = allClosest.filter(c => {
          if (c.id === args.active.id) return false;
          const dc = args.droppableContainers.find(d => d.id === c.id);
          return (
            dc?.data?.current?.type === 'guest' &&
            dc?.data?.current?.guest?.table_id === tableId
          );
        });

        if (guestsOnThisTable.length > 0) {
          return guestsOnThisTable;
        }
      }

      // No matching guests -- return the table/unassigned container
      return [tableCollision];
    }

    // Fallback
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
    const { over, activatorEvent, delta } = event;
    
    // Clear any pending sticky timeout
    if (stickyTimeoutRef.current) {
      clearTimeout(stickyTimeoutRef.current);
      stickyTimeoutRef.current = null;
    }
    
    if (!over) {
      setOverTableId(null);
      setOverGuestId(null);
      setIsOverUnassigned(false);
      setOverGuestPosition(null);
      overGuestPositionRef.current = null;
      lastOverGuestRef.current = null;
      return;
    }

    const overData = over.data.current;
    
    // Check if over unassigned drop zone
    if (overData?.type === 'unassigned') {
      setOverTableId(null);
      setOverGuestId(null);
      setIsOverUnassigned(true);
      setOverGuestPosition(null);
      overGuestPositionRef.current = null;
      lastOverGuestRef.current = null;
      return;
    }
    
    setIsOverUnassigned(false);
    
    // Check if over a table droppable
    if (overData?.type === 'table') {
      setOverTableId(overData.tableId);
      setOverGuestPosition(null);
      overGuestPositionRef.current = null;
      
      if (lastOverGuestRef.current !== null) {
        stickyTimeoutRef.current = setTimeout(() => {
          setOverGuestId(null);
          setOverGuestPosition(null);
          overGuestPositionRef.current = null;
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
      
      // Calculate pointer position relative to the hovered guest's live DOM rect
      const el = document.getElementById(String(over.id));
      const rect = el?.getBoundingClientRect();
      if (rect) {
        const pointerY = pointerPositionRef.current.y;
        const midpoint = rect.top + rect.height / 2;
        const pos = pointerY < midpoint ? 'above' : 'below';
        setOverGuestPosition(pos);
        overGuestPositionRef.current = pos;
      } else {
        setOverGuestPosition('below');
        overGuestPositionRef.current = 'below';
      }
    } else {
      setOverTableId(null);
      setOverGuestId(null);
      setOverGuestPosition(null);
      overGuestPositionRef.current = null;
      lastOverGuestRef.current = null;
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    const savedPosition = overGuestPositionRef.current;
    
    setActiveGuest(null);
    setActiveTableId(null);
    setOverTableId(null);
    setOverGuestId(null);
    setIsOverUnassigned(false);
    setOverGuestPosition(null);
    overGuestPositionRef.current = null;

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
    const previousSeatNo = draggedGuest.seat_no;

    // Determine destination table and position
    let destTableId: string | null = null;
    let insertAtIndex: number | undefined = undefined;

    // Handle drop on unassigned area
    if (overData?.type === 'unassigned') {
      destTableId = null;
      insertAtIndex = undefined;
    } else if (overData?.type === 'table') {
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
      
      if (overIndex >= 0) {
        // Use pointer position to determine above/below insertion
        if (savedPosition === 'above') {
          insertAtIndex = overIndex;
        } else {
          insertAtIndex = overIndex + 1;
        }
      } else {
        // Fallback: if overGuest not found, place at end
        insertAtIndex = destTableGuests.length;
      }
    }

    // If moving to same location (null to null), don't process
    if (sourceTableId === null && destTableId === null) return;

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
          
          // Use pointer position to determine target
          let rawTarget: number;
          if (savedPosition === 'above') {
            rawTarget = overIndex;
          } else {
            rawTarget = overIndex + 1;
          }
          
          // arrayMove removes source first, so adjust if dragging from before target
          if (oldIndex < rawTarget) {
            targetIndex = rawTarget - 1;
          } else {
            targetIndex = rawTarget;
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
  }, [guests, tables, onMoveGuest, onReorderGuests, onGuestMoved, toast]);

  // Create drag state context value
  const dragStateValue: DragStateContextType = {
    activeGuestId: activeGuest?.id || null,
    overGuestId,
    overTableId,
    isOverUnassigned,
    overGuestPosition,
  };

  // Compute predicted seat for overlay
  const predictedSeat = (() => {
    if (!activeGuest || !overTableId) return null;
    const destTableGuests = guests
      .filter(g => g.table_id === overTableId && g.id !== activeGuest.id)
      .sort((a, b) => (a.seat_no || 0) - (b.seat_no || 0));
    
    if (overGuestId) {
      const overIndex = destTableGuests.findIndex(g => g.id === overGuestId);
      const isLastGuest = overIndex === destTableGuests.length - 1;
      if (isLastGuest) return destTableGuests.length + 1;
      return (overIndex >= 0 ? overIndex : destTableGuests.length) + 1;
    }
    return destTableGuests.length + 1;
  })();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements }}
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
            {/* Show predicted seat number when over a table */}
            {overTableId && predictedSeat && (
              <div className="text-xs text-center mt-1.5 text-primary font-medium bg-background/90 rounded-full px-2 py-0.5 shadow-sm">
                → Seat #{predictedSeat}
              </div>
            )}
            {isOverUnassigned && (
              <div className="text-xs text-center mt-1.5 text-muted-foreground font-medium bg-background/90 rounded-full px-2 py-0.5 shadow-sm">
                → Unassign
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default SortableTablesGrid;
