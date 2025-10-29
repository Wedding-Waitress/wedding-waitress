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
  rowIndex: number;
  isLastCreated?: boolean;
  isInGroup?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
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
  onFocus?: (id: string | null) => void;
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
  rowIndex,
  isLastCreated,
  isInGroup = false,
  isFirstInGroup = false,
  isLastInGroup = false,
  settings,
  onUpdate,
  onDelete,
  onDuplicate,
  onInsertHeaderAbove,
  onFocus,
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
  const [isDeleting, setIsDeleting] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setResponsibleLocal(item.responsible || '');
  }, [item.id, item.responsible]);

  // Focus Event Info cell when newly created
  useEffect(() => {
    if (isLastCreated && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLastCreated]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDeleting ? 'opacity 0.3s ease-out' : transition,
    opacity: isDragging ? 0.5 : isDeleting ? 0 : 1,
  };

  const handleResponsibleChange = (value: string) => {
    setResponsibleLocal(value);
    onUpdate(item.id, { responsible: value });
  };

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => onDelete(item.id), 300); // Wait for fade-out
  };

  // Section Header Row
  if (item.is_section_header) {
    const headerPadding = isFirstInGroup ? '12px 8px 8px 8px' : '8px';
    
    return (
      <tr
        ref={setNodeRef}
        style={style}
        className="section-header"
      >
        <td style={{ padding: headerPadding, border: '0.5px solid #EAEAEA', backgroundColor: '#F4F4F5' }}>
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
        </td>
        <td colSpan={3} style={{
          padding: headerPadding, 
          border: '0.5px solid #EAEAEA', 
          backgroundColor: '#F4F4F5',
          borderLeft: `2px solid ${settings.header_color}`,
          position: 'relative'
        }}>
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
      </tr>
    );
  }

  // Regular Row
  const backgroundColor = isInGroup 
    ? '#FBFAFF'
    : (rowIndex % 2 === 0 ? '#FFFFFF' : '#FCFCFD');

  const cellPadding = isLastInGroup 
    ? '6px 8px 14px 8px'
    : '6px 8px';

  const indentPadding = isInGroup 
    ? '6px 8px 6px 20px'
    : cellPadding;

  const [hoveredRow, setHoveredRow] = useState(false);

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
        backgroundColor: hoveredRow ? '#F8F4FF' : backgroundColor,
        transition: 'background-color 0.15s ease',
      }}
      onFocus={() => onFocus?.(item.id)}
      onBlur={() => onFocus?.(null)}
      onMouseEnter={() => setHoveredRow(true)}
      onMouseLeave={() => setHoveredRow(false)}
      tabIndex={0}
      className={`running-sheet-row ${isInGroup ? 'in-group' : ''}`}
    >
      {/* Drag Handle */}
      <td style={{ padding: cellPadding, verticalAlign: 'top', border: '0.5px solid #EAEAEA', backgroundColor: hoveredRow ? '#F8F4FF' : backgroundColor }}>
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
      </td>

      {/* Time Picker */}
      <td 
        style={{ 
          padding: indentPadding, 
          verticalAlign: 'top', 
          border: '0.5px solid #EAEAEA', 
          backgroundColor: hoveredRow ? '#F8F4FF' : backgroundColor,
          transition: 'box-shadow 0.15s ease',
        }}
        className="running-sheet-cell group"
        onMouseEnter={(e) => {
          if (!hoveredRow) return;
          e.currentTarget.style.boxShadow = '0 0 0 1px #C3B0F9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 1px #6D28D9';
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <TimePicker
          value={item.time_text}
          onChange={(time) => onUpdate(item.id, { time_text: time })}
          placeholder="Select time"
        />
      </td>

      {/* Event Info (Rich Text) */}
      <td 
        style={{ 
          padding: indentPadding, 
          verticalAlign: 'top', 
          border: '0.5px solid #EAEAEA', 
          backgroundColor: hoveredRow ? '#F8F4FF' : backgroundColor,
          transition: 'box-shadow 0.15s ease',
        }}
        className="running-sheet-cell group"
        onMouseEnter={(e) => {
          if (!hoveredRow) return;
          e.currentTarget.style.boxShadow = '0 0 0 1px #C3B0F9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 1px #6D28D9';
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <InlineRichTextEditor
          ref={textareaRef}
          value={item.description_rich}
          onChange={(val) => onUpdate(item.id, { description_rich: val })}
          placeholder="What's happening..."
        />
      </td>

      {/* Assigned */}
      <td 
        style={{ 
          padding: indentPadding, 
          verticalAlign: 'top', 
          border: '0.5px solid #EAEAEA', 
          backgroundColor: hoveredRow ? '#F8F4FF' : backgroundColor,
          transition: 'box-shadow 0.15s ease',
        }}
        className="running-sheet-cell group"
        onMouseEnter={(e) => {
          if (!hoveredRow) return;
          e.currentTarget.style.boxShadow = '0 0 0 1px #C3B0F9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 1px #6D28D9';
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Input
          value={responsibleLocal}
          onChange={(e) => handleResponsibleChange(e.target.value)}
          placeholder="Person"
          className="h-9"
        />
      </td>
    </tr>
  );
};
