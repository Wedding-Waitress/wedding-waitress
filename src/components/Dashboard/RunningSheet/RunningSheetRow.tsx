import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RunningSheetItem } from '@/types/runningSheet';
import { RichTextEditor, FormattingToolbar } from './RichTextEditor';
import { TimePicker } from '../TimePicker';

interface RunningSheetRowProps {
  item: RunningSheetItem;
  showResponsible: boolean;
  onUpdate: (id: string, data: Partial<RunningSheetItem>) => void;
  onDelete: (id: string) => void;
}

export const RunningSheetRow: React.FC<RunningSheetRowProps> = ({
  item,
  showResponsible,
  onUpdate,
  onDelete,
}) => {
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

  const getFormatting = (descriptionRich: any) => {
    if (typeof descriptionRich === 'object' && descriptionRich.formatting) {
      return descriptionRich.formatting;
    }
    return { bold: false, italic: false, red: false };
  };

  const handleFormatToggle = (format: 'bold' | 'italic' | 'red') => {
    const currentFormatting = getFormatting(item.description_rich);
    const newFormatting = {
      ...currentFormatting,
      [format]: !currentFormatting[format],
    };
    const text = typeof item.description_rich === 'object' && item.description_rich.text
      ? item.description_rich.text
      : item.description_rich || '';
    onUpdate(item.id, {
      description_rich: {
        text,
        formatting: newFormatting,
      },
    });
  };

  if (item.is_section_header) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="grid grid-cols-[auto_1fr_auto] gap-4 items-center p-4 bg-[#F4F4F5] rounded-lg border border-border mb-2"
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
        <Input
          value={typeof item.description_rich === 'object' && item.description_rich.text 
            ? item.description_rich.text 
            : item.description_rich || ''}
          onChange={(e) => onUpdate(item.id, { 
            description_rich: { text: e.target.value, formatting: {} } 
          })}
          placeholder="Section header (e.g., Family Introductions)"
          className="font-bold text-base bg-transparent border-none shadow-none focus-visible:ring-0"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(item.id)}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-1 md:grid-cols-[auto_100px_1fr_200px_auto] gap-4 items-start p-4 bg-card rounded-lg border border-border mb-2 hover:border-primary/50 transition-colors"
    >
      {/* Drag Handle + Formatting Toolbar */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
        <FormattingToolbar
          formatting={getFormatting(item.description_rich)}
          onToggle={handleFormatToggle}
        />
      </div>

      {/* Time */}
      <div className="space-y-1">
        <TimePicker
          value={item.time_text}
          onChange={(time) => onUpdate(item.id, { time_text: time })}
          placeholder="Select time"
        />
        {!item.time_text && (
          <p className="text-xs text-destructive">Select time</p>
        )}
      </div>

      {/* Description */}
      <div>
        <RichTextEditor
          value={item.description_rich}
          onChange={(value) => onUpdate(item.id, { description_rich: value })}
          placeholder="What's happening..."
          hideToolbar={true}
        />
      </div>

      {/* Responsible (conditional) */}
      {showResponsible && (
        <Input
          value={item.responsible || ''}
          onChange={(e) => onUpdate(item.id, { responsible: e.target.value })}
          placeholder="Responsible person"
        />
      )}

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(item.id)}
        className="h-8 w-8 p-0 mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};
