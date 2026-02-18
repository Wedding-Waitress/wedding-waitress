import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from "@/components/ui/badge";
import { GripVertical, Check } from "lucide-react";
import { Guest } from '@/hooks/useGuests';

interface SortableGuestItemProps {
  guest: Guest;
  isOverlay?: boolean;
  isBeingDraggedOver?: boolean;
  indicatorPosition?: 'above' | 'below' | null;
  isSelected?: boolean;
  onSelect?: (guestId: string) => void;
  showCheckbox?: boolean;
}

export const SortableGuestItem: React.FC<SortableGuestItemProps> = ({ 
  guest,
  isOverlay = false,
  isBeingDraggedOver = false,
  indicatorPosition = null,
  isSelected = false,
  onSelect,
  showCheckbox = false
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
    ...(isDragging
      ? { opacity: 0, height: 0, overflow: 'hidden' as const, padding: 0, margin: 0, border: 'none' }
      : { opacity: 1, zIndex: 'auto' as const }),
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(guest.id);
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
    <div 
      ref={setNodeRef} 
      id={guest.id}
      style={style} 
      className="relative group"
      role="listitem"
      aria-label={`${guest.first_name} ${guest.last_name || ''}, ${guest.seat_no ? `Seat ${guest.seat_no}` : 'No seat assigned'}. Drag to reorder or move to another table.`}
    >
      {/* Drop indicator ABOVE this guest */}
      {isBeingDraggedOver && indicatorPosition === 'above' && (
        <div className="absolute -top-1.5 left-0 right-0 h-2 bg-[#7C3AED] rounded-full shadow-[0_0_10px_rgba(124,58,237,0.7)] border border-[#5B21B6] z-20 pointer-events-none" />
      )}
      
      <div className="flex items-center gap-1">
        {/* Checkbox for bulk selection */}
        {showCheckbox && (
          <button
            type="button"
            onClick={handleCheckboxClick}
            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              isSelected 
                ? 'bg-primary border-primary text-primary-foreground' 
                : 'border-muted-foreground/40 hover:border-primary/60 bg-background'
            }`}
            aria-label={isSelected ? 'Deselect guest' : 'Select guest'}
          >
            {isSelected && <Check className="h-3 w-3" />}
          </button>
        )}
        
        <Badge
          variant="secondary"
          className={`flex-1 justify-between text-xs py-1 px-2 cursor-grab active:cursor-grabbing hover:bg-secondary/80 ${
            isDragging ? 'ring-2 ring-primary shadow-md' : ''
          } ${isSelected ? 'ring-2 ring-primary/50' : ''}`}
          {...attributes}
          {...listeners}
          aria-grabbed={isDragging}
          tabIndex={0}
        >
          <span className="truncate">
            {guest.first_name} {guest.last_name || ''}{guest.seat_no ? ` (Seat ${guest.seat_no})` : ''}
          </span>
          <GripVertical className="h-3 w-3 flex-shrink-0 ml-1 opacity-50" />
        </Badge>
      </div>
      
      {/* Drop indicator BELOW this guest */}
      {isBeingDraggedOver && indicatorPosition === 'below' && (
        <div className="absolute -bottom-1.5 left-0 right-0 h-2 bg-[#7C3AED] rounded-full shadow-[0_0_10px_rgba(124,58,237,0.7)] border border-[#5B21B6] z-20 pointer-events-none" />
      )}
    </div>
  );
};