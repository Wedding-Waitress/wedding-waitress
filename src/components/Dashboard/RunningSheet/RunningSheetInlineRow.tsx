import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy, Heading } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RunningSheetItem } from '@/types/runningSheet';
import { InlineRichTextEditor } from './InlineRichTextEditor';
import { TimePicker } from '../TimePicker';

interface RunningSheetInlineRowProps {
  item: RunningSheetItem;
  settings: {
    all_font: string;
    all_text_size: string;
    all_bold: boolean;
    all_italic: boolean;
    all_text_color: string;
    header_font: string;
    header_size: string;
    header_bold: boolean;
    header_italic: boolean;
    header_color: string;
  };
  onUpdate: (id: string, data: Partial<RunningSheetItem>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onInsertHeaderAbove: (orderIndex: number) => void;
}

const HEADER_SIZE_MAP: Record<string, string> = {
  small: '14pt',
  medium: '16pt',
  large: '18pt',
};

const TEXT_SIZE_MAP: Record<string, string> = {
  small: '12pt',
  medium: '14pt',
  large: '16pt',
};

export const RunningSheetInlineRow: React.FC<RunningSheetInlineRowProps> = ({
  item,
  settings,
  onUpdate,
  onDelete,
  onDuplicate,
  onInsertHeaderAbove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const [responsibleLocal, setResponsibleLocal] = useState(item.responsible || '');

  useEffect(() => {
    setResponsibleLocal(item.responsible || '');
  }, [item.id, item.responsible]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleResponsibleChange = (value: string) => {
    setResponsibleLocal(value);
    onUpdate(item.id, { responsible: value });
  };

  // Section Header Row
  if (item.is_section_header) {
    return (
      <tr
        ref={setNodeRef}
        style={style}
      >
        <td style={{ padding: '8px', border: '1px solid #E5E5E5', backgroundColor: '#F4F4F5' }}>
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
        </td>
        <td colSpan={3} style={{ padding: '8px', border: '1px solid #E5E5E5', backgroundColor: '#F4F4F5' }}>
          <Input
            value={typeof item.description_rich === 'object' && item.description_rich.text 
              ? item.description_rich.text 
              : item.description_rich || ''}
            onChange={(e) => onUpdate(item.id, { 
              description_rich: { text: e.target.value, formatting: {} } 
            })}
            placeholder="Section header (e.g., Family Introductions)"
            className="bg-transparent border-none shadow-none focus-visible:ring-0"
            style={{
              fontFamily: settings.header_font,
              fontSize: HEADER_SIZE_MAP[settings.header_size] || '16pt',
              fontWeight: settings.header_bold ? 'bold' : 'normal',
              fontStyle: settings.header_italic ? 'italic' : 'normal',
              color: settings.header_color,
            }}
          />
        </td>
        <td style={{ padding: '8px', border: '1px solid #E5E5E5', backgroundColor: '#F4F4F5', textAlign: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </td>
      </tr>
    );
  }

  // Regular Row
  return (
    <tr
      ref={setNodeRef}
      style={{
        ...style,
        fontFamily: settings.all_font,
        fontSize: TEXT_SIZE_MAP[settings.all_text_size] || '14pt',
        fontWeight: settings.all_bold ? 'bold' : 'normal',
        fontStyle: settings.all_italic ? 'italic' : 'normal',
        color: settings.all_text_color,
      }}
    >
      {/* Drag Handle */}
      <td style={{ padding: '8px', verticalAlign: 'top', border: '1px solid #E5E5E5' }}>
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
      </td>

      {/* Time Picker */}
      <td style={{ padding: '8px', verticalAlign: 'top', border: '1px solid #E5E5E5' }}>
        <TimePicker
          value={item.time_text}
          onChange={(time) => onUpdate(item.id, { time_text: time })}
          placeholder="Select time"
        />
      </td>

      {/* Event Info (Rich Text) */}
      <td style={{ padding: '8px', verticalAlign: 'top', border: '1px solid #E5E5E5' }}>
        <InlineRichTextEditor
          value={item.description_rich}
          onChange={(val) => onUpdate(item.id, { description_rich: val })}
          placeholder="What's happening..."
        />
      </td>

      {/* Assigned */}
      <td style={{ padding: '8px', verticalAlign: 'top', border: '1px solid #E5E5E5' }}>
        <Input
          value={responsibleLocal}
          onChange={(e) => handleResponsibleChange(e.target.value)}
          placeholder="Person"
          className="h-9"
        />
      </td>

      {/* Actions */}
      <td style={{ padding: '8px', verticalAlign: 'top', border: '1px solid #E5E5E5', textAlign: 'center' }}>
        <div className="flex gap-1 justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(item.id)}
            className="h-8 w-8 p-0 hover:bg-accent"
            title="Duplicate row"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onInsertHeaderAbove(item.order_index)}
            className="h-8 w-8 p-0 hover:bg-accent"
            title="Insert section header above"
          >
            <Heading className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete row"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};
