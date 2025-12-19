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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
      {/* Drop indicator BEFORE this guest - solid dark purple with glow */}
      {isBeingDraggedOver && !showIndicatorAfter && (
        <div className="h-2.5 bg-[#7C3AED] rounded-full mb-1.5 shadow-[0_0_10px_rgba(124,58,237,0.7)] border-2 border-[#5B21B6]" />
      )}
      
      <Badge
        variant="secondary"
        className={`w-full justify-between text-xs py-1 px-2 cursor-grab active:cursor-grabbing hover:bg-secondary/80 transition-all duration-200 ${
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
      
      {/* Drop indicator AFTER this guest (for last guest in list) */}
      {isBeingDraggedOver && showIndicatorAfter && (
        <div className="h-2.5 bg-[#7C3AED] rounded-full mt-1.5 shadow-[0_0_10px_rgba(124,58,237,0.7)] border-2 border-[#5B21B6]" />
      )}
    </div>
  );
};
