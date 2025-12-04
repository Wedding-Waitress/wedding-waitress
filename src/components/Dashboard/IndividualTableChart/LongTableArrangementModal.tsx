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
  useDroppable,
  useDraggable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
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
}> = ({ id, title, children, className }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-h-[200px] p-3 rounded-lg border-2 border-dashed transition-colors',
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

// Draggable guest card component
const DraggableGuestCard: React.FC<{
  guest: Guest;
  position: number;
  side: SeatSide;
}> = ({ guest, position, side }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${side}-${guest.id}` });

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
        'flex items-center gap-2 p-2 bg-white rounded-md border shadow-sm cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 shadow-lg'
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
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;
    
    // Parse active item
    const [activeSide, activeGuestId] = activeIdStr.split('-');
    const activeGuest = arrangement.find(a => a.guest.id === activeGuestId);
    
    if (!activeGuest) return;

    // Check if dropped on a zone (side) or another guest
    const targetSide = (['A', 'B', 'T', 'E'].includes(overIdStr) 
      ? overIdStr 
      : overIdStr.split('-')[0]) as SeatSide;

    // Create new arrangement
    setArrangement(prev => {
      const newArr = prev.filter(a => a.guest.id !== activeGuestId);
      
      // Get existing items in target side
      const targetItems = newArr.filter(a => a.side === targetSide);
      
      // Find insertion position
      let insertPosition = targetItems.length + 1;
      
      if (overIdStr !== targetSide) {
        // Dropped on a guest, find their position
        const [, overGuestId] = overIdStr.split('-');
        const overGuest = newArr.find(a => a.guest.id === overGuestId);
        if (overGuest && overGuest.side === targetSide) {
          insertPosition = overGuest.position;
        }
      }

      // Update positions for items after insert point
      const updatedArr = newArr.map(item => {
        if (item.side === targetSide && item.position >= insertPosition) {
          return { ...item, position: item.position + 1 };
        }
        return item;
      });

      // Add the moved guest
      updatedArr.push({
        guest: activeGuest.guest,
        side: targetSide,
        position: insertPosition
      });

      // Renumber positions within each side
      const sides: SeatSide[] = ['T', 'A', 'B', 'E'];
      sides.forEach(side => {
        const sideItems = updatedArr.filter(a => a.side === side);
        sideItems.sort((a, b) => a.position - b.position);
        sideItems.forEach((item, idx) => {
          item.position = idx + 1;
        });
      });

      return updatedArr;
    });
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
    const [, guestId] = activeId.split('-');
    return arrangement.find(a => a.guest.id === guestId);
  }, [activeId, arrangement]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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
          onDragEnd={handleDragEnd}
        >
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Top End */}
              <DroppableZone id="T" title="Top End (Optional)" className="bg-amber-50">
                <SortableContext 
                  items={guestsBySide.T.map(a => `T-${a.guest.id}`)} 
                  strategy={verticalListSortingStrategy}
                >
                  {guestsBySide.T.map((item, idx) => (
                    <DraggableGuestCard 
                      key={item.guest.id} 
                      guest={item.guest} 
                      position={idx + 1}
                      side="T"
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
                  <SortableContext 
                    items={guestsBySide.A.map(a => `A-${a.guest.id}`)} 
                    strategy={verticalListSortingStrategy}
                  >
                    {guestsBySide.A.map((item, idx) => (
                      <DraggableGuestCard 
                        key={item.guest.id} 
                        guest={item.guest} 
                        position={idx + 1}
                        side="A"
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
                  <SortableContext 
                    items={guestsBySide.B.map(a => `B-${a.guest.id}`)} 
                    strategy={verticalListSortingStrategy}
                  >
                    {guestsBySide.B.map((item, idx) => (
                      <DraggableGuestCard 
                        key={item.guest.id} 
                        guest={item.guest} 
                        position={idx + 1}
                        side="B"
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
              <DroppableZone id="E" title="Bottom End (Optional)" className="bg-amber-50">
                <SortableContext 
                  items={guestsBySide.E.map(a => `E-${a.guest.id}`)} 
                  strategy={verticalListSortingStrategy}
                >
                  {guestsBySide.E.map((item, idx) => (
                    <DraggableGuestCard 
                      key={item.guest.id} 
                      guest={item.guest} 
                      position={idx + 1}
                      side="E"
                    />
                  ))}
                </SortableContext>
                {guestsBySide.E.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Drop guests here for the bottom end of the table
                  </p>
                )}
              </DroppableZone>
            </div>
          </ScrollArea>

          <DragOverlay>
            {activeItem && (
              <DragOverlayCard guest={activeItem.guest} position={activeItem.position} />
            )}
          </DragOverlay>
        </DndContext>

        <DialogFooter className="flex gap-2 pt-4 border-t">
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
