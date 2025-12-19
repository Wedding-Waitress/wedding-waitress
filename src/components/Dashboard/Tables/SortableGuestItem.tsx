import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";
import { Guest } from '@/hooks/useGuests';

interface SortableGuestItemProps {
  guest: Guest;
  isOverlay?: boolean;
  isBeingDraggedOver?: boolean;
  isLastInList?: boolean;
  showIndicatorAfter?: boolean;
}

export const SortableGuestItem: React.FC<SortableGuestItemProps> = ({ 
  guest,
  isOverlay = false,
  isBeingDraggedOver = false,
  isLastInList = false,
  showIndicatorAfter = false
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: guest.id,
    data: {
      type: 'guest',
      guest,
    }
  });

  // Only apply transition when actively dragging, not during drag-over
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : undefined,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  // For the drag overlay, we don't need the sortable hooks
  if (isOverlay) {
    return (
      <Badge
        variant="secondary"
        className="w-full justify-between text-xs py-1.5 px-2 cursor-grabbing bg-primary/20 border-primary shadow-lg scale-105"
      >
        <span className="truncate">
          {guest.first_name} {guest.last_name || ''}{guest.seat_no ? ` (Seat ${guest.seat_no})` : ''}
        </span>
        <GripVertical className="h-3 w-3 flex-shrink-0 ml-1 opacity-70" />
      </Badge>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drop indicator BEFORE this guest - absolute positioned to prevent layout shift */}
      {isBeingDraggedOver && !showIndicatorAfter && (
        <div className="absolute -top-1.5 left-0 right-0 h-2 bg-[#7C3AED] rounded-full shadow-[0_0_10px_rgba(124,58,237,0.7)] border border-[#5B21B6] z-20 pointer-events-none" />
      )}
      
      <Badge
        variant="secondary"
        className={`w-full justify-between text-xs py-1 px-2 cursor-grab active:cursor-grabbing hover:bg-secondary/80 ${
          isDragging ? 'ring-2 ring-primary shadow-md' : ''
        }`}
        {...attributes}
        {...listeners}
      >
        <span className="truncate">
          {guest.first_name} {guest.last_name || ''}{guest.seat_no ? ` (Seat ${guest.seat_no})` : ''}
        </span>
        <GripVertical className="h-3 w-3 flex-shrink-0 ml-1 opacity-50" />
      </Badge>
      
      {/* Drop indicator AFTER this guest (for last guest in list) - absolute positioned */}
      {isBeingDraggedOver && showIndicatorAfter && (
        <div className="absolute -bottom-1.5 left-0 right-0 h-2 bg-[#7C3AED] rounded-full shadow-[0_0_10px_rgba(124,58,237,0.7)] border border-[#5B21B6] z-20 pointer-events-none" />
      )}
    </div>
  );
};