import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, RotateCcw, Save, Users } from 'lucide-react';
import { Guest } from '@/hooks/useGuests';
import { SeatSide, ArrangedGuest } from '@/hooks/useLongTableArrangement';
import { cn } from '@/lib/utils';

interface LongTableArrangementModalProps {
  isOpen: boolean;
  onClose: () => void;
  guests: Guest[];
  initialArrangement: ArrangedGuest[];
  onSave: (arrangement: ArrangedGuest[]) => Promise<boolean>;
  onReset: () => Promise<boolean>;
  tableName: string;
}

// Droppable zone component
const DroppableZone: React.FC<{
  id: SeatSide;
  title: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}> = ({ id, title, children, className, compact }) => {
  const { setNodeRef, isOver } = useDroppable({ 
    id,
    data: { type: 'zone', side: id }
  });
  
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 p-3 rounded-lg border-2 border-dashed transition-colors',
        compact ? 'min-h-[80px]' : 'min-h-[200px]',
        isOver ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 bg-muted/30',
        className
      )}
    >
      <h4 className="font-semibold text-sm mb-2 text-center">{title}</h4>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
};

// Sortable guest card component - uses STABLE guest ID only
const SortableGuestCard: React.FC<{
  guest: Guest;
  position: number;
}> = ({ guest, position }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: guest.id }); // Use stable guest ID

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get dietary icon
  const getDietaryIcon = (dietary: string | null) => {
    if (!dietary || dietary === 'NA') return null;
    const lower = dietary.toLowerCase();
    if (lower.includes('vegan')) return '🌱';
    if (lower.includes('vegetarian') || lower.includes('veg')) return '🥬';
    if (lower.includes('gluten')) return '🌾';
    if (lower.includes('nut')) return '🥜';
    if (lower.includes('seafood') || lower.includes('fish')) return '🐟';
    if (lower.includes('allergy') || lower.includes('allergic')) return '🚫';
    return '🍽️';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-2 p-2 bg-white rounded-md border shadow-sm cursor-grab active:cursor-grabbing touch-none',
        isDragging && 'opacity-50 shadow-lg z-50'
      )}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Badge variant="outline" className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center p-0 text-xs">
        {position}
      </Badge>
      <span className="text-sm font-medium truncate flex-1">
        {guest.first_name} {guest.last_name}
      </span>
      {guest.dietary && guest.dietary !== 'NA' && (
        <span className="text-sm" title={guest.dietary}>
          {getDietaryIcon(guest.dietary)}
        </span>
      )}
    </div>
  );
};

// Overlay card for dragging
const DragOverlayCard: React.FC<{ guest: Guest; position: number }> = ({ guest, position }) => {
  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded-md border-2 border-primary shadow-lg cursor-grabbing">
      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Badge variant="default" className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center p-0 text-xs">
        {position}
      </Badge>
      <span className="text-sm font-medium truncate">
        {guest.first_name} {guest.last_name}
      </span>
    </div>
  );
};

export const LongTableArrangementModal: React.FC<LongTableArrangementModalProps> = ({
  isOpen,
  onClose,
  guests,
  initialArrangement,
  onSave,
  onReset,
  tableName
}) => {
  const [arrangement, setArrangement] = useState<ArrangedGuest[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    if (isOpen) {
      setArrangement(initialArrangement);
    }
  }, [isOpen, initialArrangement]);

  // Group guests by side
  const guestsBySide = useMemo(() => {
    const grouped: Record<SeatSide, ArrangedGuest[]> = {
      'T': [],
      'A': [],
      'B': [],
      'E': []
    };
    arrangement.forEach(item => {
      grouped[item.side].push(item);
    });
    // Sort by position within each side
    Object.keys(grouped).forEach(side => {
      grouped[side as SeatSide].sort((a, b) => a.position - b.position);
    });
    return grouped;
  }, [arrangement]);

  // Helper to find which side a guest is currently in
  const findGuestSide = (guestId: string): SeatSide | null => {
    const item = arrangement.find(a => a.guest.id === guestId);
    return item ? item.side : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle moving items between containers during drag
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeGuestId = active.id as string;
    const overId = over.id as string;

    // Get the source side from arrangement state
    const activeSide = findGuestSide(activeGuestId);
    if (!activeSide) return;
    
    // Determine the target side
    let overSide: SeatSide;
    if (['A', 'B', 'T', 'E'].includes(overId)) {
      // Dropped on a zone directly
      overSide = overId as SeatSide;
    } else {
      // Dropped on another guest - find their side
      const overGuestSide = findGuestSide(overId);
      if (!overGuestSide) return;
      overSide = overGuestSide;
    }

    // If same container, don't do anything here (handled by handleDragEnd)
    if (activeSide === overSide) return;

    // Move item to new container
    setArrangement(prev => {
      const activeItem = prev.find(a => a.guest.id === activeGuestId);
      if (!activeItem) return prev;

      // Remove from old container
      const withoutActive = prev.filter(a => a.guest.id !== activeGuestId);
      
      // Find insertion index in target container
      const targetItems = withoutActive.filter(a => a.side === overSide);
      let insertIndex = targetItems.length;

      // If dropped on a guest, insert at their position
      if (!['A', 'B', 'T', 'E'].includes(overId)) {
        const overItemIndex = targetItems.findIndex(a => a.guest.id === overId);
        if (overItemIndex !== -1) {
          insertIndex = overItemIndex;
        }
      }

      // Create new arrangement
      const newArrangement = [...withoutActive];

      // Add the moved guest to the new side
      newArrangement.push({
        guest: activeItem.guest,
        side: overSide,
        position: insertIndex + 1
      });

      // Renumber all positions within each side
      const sides: SeatSide[] = ['T', 'A', 'B', 'E'];
      sides.forEach(side => {
        const sideItems = newArrangement.filter(a => a.side === side);
        sideItems.sort((a, b) => a.position - b.position);
        sideItems.forEach((item, idx) => {
          item.position = idx + 1;
        });
      });

      return newArrangement;
    });
  };

  // Handle reordering within the same container
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeGuestId = active.id as string;
    const overId = over.id as string;

    // Skip if dropped on a zone directly
    if (['A', 'B', 'T', 'E'].includes(overId)) return;

    const activeSide = findGuestSide(activeGuestId);
    const overSide = findGuestSide(overId);

    // Only handle reordering within same container
    if (activeSide && overSide && activeSide === overSide && activeGuestId !== overId) {
      setArrangement(prev => {
        const sideItems = prev.filter(a => a.side === activeSide);
        const otherItems = prev.filter(a => a.side !== activeSide);
        
        const activeIndex = sideItems.findIndex(a => a.guest.id === activeGuestId);
        const overIndex = sideItems.findIndex(a => a.guest.id === overId);
        
        if (activeIndex !== -1 && overIndex !== -1) {
          const reordered = arrayMove(sideItems, activeIndex, overIndex);
          // Update positions
          reordered.forEach((item, idx) => {
            item.position = idx + 1;
          });
          return [...otherItems, ...reordered];
        }
        
        return prev;
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(arrangement);
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    await onReset();
    // Recalculate default arrangement
    const defaultArr: ArrangedGuest[] = [];
    guests.sort((a, b) => (a.seat_no || 0) - (b.seat_no || 0)).forEach((guest, index) => {
      const side: SeatSide = index % 2 === 0 ? 'A' : 'B';
      const position = Math.floor(index / 2) + 1;
      defaultArr.push({ guest, side, position });
    });
    setArrangement(defaultArr);
    setIsSaving(false);
  };

  // Get active item for overlay
  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return arrangement.find(a => a.guest.id === activeId);
  }, [activeId, arrangement]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Arrange Seats - {tableName}
          </DialogTitle>
          <DialogDescription>
            Drag and drop guests between sides to customize the seating arrangement.
            Side A is on the left, Side B is on the right. Top and End positions are at the table ends.
          </DialogDescription>
        </DialogHeader>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <ScrollArea className="flex-1 min-h-0 pr-4">
            <div className="space-y-4">
              {/* Top End */}
              <DroppableZone id="T" title="Top End (Optional)" className="bg-amber-50" compact>
                <SortableContext items={guestsBySide.T.map(item => item.guest.id)} strategy={verticalListSortingStrategy}>
                  {guestsBySide.T.map((item, idx) => (
                    <SortableGuestCard 
                      key={item.guest.id}
                      guest={item.guest} 
                      position={idx + 1}
                    />
                  ))}
                </SortableContext>
                {guestsBySide.T.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Drop guests here for the top end of the table
                  </p>
                )}
              </DroppableZone>

              {/* Main Sides */}
              <div className="flex gap-4">
                {/* Side A */}
                <DroppableZone id="A" title="Side A (Left)">
                  <SortableContext items={guestsBySide.A.map(item => item.guest.id)} strategy={verticalListSortingStrategy}>
                    {guestsBySide.A.map((item, idx) => (
                      <SortableGuestCard 
                        key={item.guest.id}
                        guest={item.guest} 
                        position={idx + 1}
                      />
                    ))}
                  </SortableContext>
                  {guestsBySide.A.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Drop guests here
                    </p>
                  )}
                </DroppableZone>

                {/* Side B */}
                <DroppableZone id="B" title="Side B (Right)">
                  <SortableContext items={guestsBySide.B.map(item => item.guest.id)} strategy={verticalListSortingStrategy}>
                    {guestsBySide.B.map((item, idx) => (
                      <SortableGuestCard 
                        key={item.guest.id}
                        guest={item.guest} 
                        position={idx + 1}
                      />
                    ))}
                  </SortableContext>
                  {guestsBySide.B.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Drop guests here
                    </p>
                  )}
                </DroppableZone>
              </div>

              {/* Bottom End */}
              <DroppableZone id="E" title="Bottom End (Optional)" className="bg-amber-50" compact>
                <SortableContext items={guestsBySide.E.map(item => item.guest.id)} strategy={verticalListSortingStrategy}>
                  {guestsBySide.E.map((item, idx) => (
                    <SortableGuestCard 
                      key={item.guest.id}
                      guest={item.guest} 
                      position={idx + 1}
                    />
                  ))}
                </SortableContext>
                {guestsBySide.E.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Drop guests here for the bottom end of the table
                  </p>
                )}
              </DroppableZone>
              
              {/* Spacer to ensure bottom content isn't cut off */}
              <div className="h-4" />
            </div>
          </ScrollArea>

          <DragOverlay>
            {activeItem && (
              <DragOverlayCard guest={activeItem.guest} position={activeItem.position} />
            )}
          </DragOverlay>
        </DndContext>

        <DialogFooter className="flex gap-2 pt-4 mt-2 border-t flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Arrangement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};