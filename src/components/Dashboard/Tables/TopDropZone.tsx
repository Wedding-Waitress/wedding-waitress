/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * The Tables page feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break drag-and-drop guest assignment
 * - Changes could break table capacity validation
 * - Changes could break real-time synchronisation
 *
 * Last locked: 2026-02-19
 */
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDragState } from './SortableTablesGrid';

interface TopDropZoneProps {
  tableId: string;
}

export const TopDropZone: React.FC<TopDropZoneProps> = ({ tableId }) => {
  const { activeGuestId } = useDragState();
  const id = `top-drop-${tableId}`;

  const {
    setNodeRef,
    isOver,
    transition,
    transform,
  } = useSortable({
    id,
    data: {
      type: 'top-drop-zone',
      tableId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Only show when a drag is active
  if (!activeGuestId) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-7 rounded-md border-2 border-dashed transition-all duration-150 flex items-center justify-center text-xs ${
        isOver
          ? 'border-[#7C3AED] bg-[#7C3AED]/15 text-[#7C3AED] shadow-[0_0_8px_rgba(124,58,237,0.4)] font-medium'
          : 'border-muted-foreground/30 text-muted-foreground/50'
      }`}
    >
      {isOver ? '→ Seat 1' : 'Drop here for Seat 1'}
    </div>
  );
};
