import React, { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Copy, Trash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RunningSheetItem } from '@/types/runningSheet';

interface RunningSheetRowProps {
  item: RunningSheetItem;
  onUpdate: (itemId: string, updates: Partial<RunningSheetItem>) => void;
  onDuplicate: (item: RunningSheetItem) => void;
  onDelete: (itemId: string) => void;
  disabled?: boolean;
}

export function RunningSheetRow({ item, onUpdate, onDuplicate, onDelete, disabled = false }: RunningSheetRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const eventText = typeof item.description_rich === 'object' && item.description_rich?.text !== undefined
    ? item.description_rich.text
    : typeof item.description_rich === 'string'
      ? item.description_rich
      : '';

  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(item.id, { time_text: e.target.value });
  }, [item.id, onUpdate]);

  const handleEventChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(item.id, { description_rich: { text: e.target.value } });
  }, [item.id, onUpdate]);

  const handleWhoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(item.id, { responsible: e.target.value });
  }, [item.id, onUpdate]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-1.5 group hover:bg-muted/30 rounded transition-colors"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="w-6 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* TIME */}
      <Input
        value={item.time_text}
        onChange={handleTimeChange}
        placeholder="Time"
        className="basis-1/5 min-w-0 h-8 text-sm"
        disabled={disabled}
      />

      {/* EVENT */}
      <Input
        value={eventText}
        onChange={handleEventChange}
        placeholder="Event"
        className="flex-1 min-w-0 h-8 text-sm"
        disabled={disabled}
      />

      {/* WHO */}
      <Input
        value={item.responsible || ''}
        onChange={handleWhoChange}
        placeholder="Who"
        className="basis-1/5 min-w-0 h-8 text-sm"
        disabled={disabled}
      />

      {/* Row actions */}
      {!disabled && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(item)} title="Duplicate">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(item.id)} title="Delete">
            <Trash className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
