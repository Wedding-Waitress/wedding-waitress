import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { RunningSheetItem } from '@/types/runningSheet';
import { RunningSheetInlineRow } from './RunningSheetInlineRow';

interface RunningSheetTableViewProps {
  items: RunningSheetItem[];
  showResponsible: boolean;
  lastCreatedItemId?: string | null;
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
  onUpdateItem: (id: string, data: Partial<RunningSheetItem>) => void;
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (id: string) => void;
  onInsertHeaderAbove: (orderIndex: number) => void;
  onReorderItems: (newOrder: RunningSheetItem[]) => void;
  onFocusRow?: (id: string | null) => void;
}

const TEXT_SIZE_MAP: Record<string, string> = {
  small: '12pt',
  medium: '14pt',
  large: '16pt',
};

export const RunningSheetTableView: React.FC<RunningSheetTableViewProps> = ({
  items,
  showResponsible,
  lastCreatedItemId,
  settings,
  onUpdateItem,
  onDeleteItem,
  onDuplicateItem,
  onInsertHeaderAbove,
  onReorderItems,
  onFocusRow,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order_index: index,
      }));

      onReorderItems(reorderedItems);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="overflow-auto max-h-[calc(297mm-80mm)]">
        <table 
          className="w-full"
          style={{
            fontFamily: settings.all_font,
            fontSize: TEXT_SIZE_MAP[settings.all_text_size] || '14pt',
            fontWeight: settings.all_bold ? 'bold' : 'normal',
            fontStyle: settings.all_italic ? 'italic' : 'normal',
            color: settings.all_text_color,
            borderCollapse: 'collapse',
            border: '1px solid #E5E5E5'
          }}
        >
          <thead className="sticky top-0 bg-[#F4F4F5] z-10">
            <tr>
              <th style={{ 
                width: '40px', 
                padding: '8px', 
                textAlign: 'left',
                verticalAlign: 'middle',
                fontFamily: settings.header_font,
                fontSize: TEXT_SIZE_MAP[settings.header_size] || '16pt',
                fontWeight: settings.header_bold ? 'bold' : 'normal',
                fontStyle: settings.header_italic ? 'italic' : 'normal',
                color: '#000000',
                backgroundColor: '#F4F4F5',
                border: '1px solid #E5E5E5'
              }}></th>
              <th style={{ 
                width: '15%',
                padding: '8px',
                textAlign: 'left',
                verticalAlign: 'middle',
                fontFamily: settings.header_font,
                fontSize: TEXT_SIZE_MAP[settings.header_size] || '16pt',
                fontWeight: settings.header_bold ? 'bold' : 'normal',
                fontStyle: settings.header_italic ? 'italic' : 'normal',
                color: '#000000',
                backgroundColor: '#F4F4F5',
                border: '1px solid #E5E5E5'
              }}>Times</th>
              <th style={{ 
                width: '55%',
                padding: '8px',
                textAlign: 'left',
                verticalAlign: 'middle',
                fontFamily: settings.header_font,
                fontSize: TEXT_SIZE_MAP[settings.header_size] || '16pt',
                fontWeight: settings.header_bold ? 'bold' : 'normal',
                fontStyle: settings.header_italic ? 'italic' : 'normal',
                color: '#000000',
                backgroundColor: '#F4F4F5',
                border: '1px solid #E5E5E5'
              }}>Event Info</th>
              <th style={{ 
                width: '20%',
                padding: '8px',
                textAlign: 'left',
                verticalAlign: 'middle',
                fontFamily: settings.header_font,
                fontSize: TEXT_SIZE_MAP[settings.header_size] || '16pt',
                fontWeight: settings.header_bold ? 'bold' : 'normal',
                fontStyle: settings.header_italic ? 'italic' : 'normal',
                color: '#000000',
                backgroundColor: '#F4F4F5',
                border: '1px solid #E5E5E5'
              }}>Assigned</th>
              <th style={{ 
                width: '10%',
                padding: '8px',
                textAlign: 'center',
                verticalAlign: 'middle',
                fontFamily: settings.header_font,
                fontSize: TEXT_SIZE_MAP[settings.header_size] || '16pt',
                fontWeight: settings.header_bold ? 'bold' : 'normal',
                fontStyle: settings.header_italic ? 'italic' : 'normal',
                color: '#000000',
                backgroundColor: '#F4F4F5',
                border: '1px solid #E5E5E5'
              }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item, index) => (
                <RunningSheetInlineRow
                  key={item.id}
                  item={item}
                  rowIndex={index}
                  isLastCreated={item.id === lastCreatedItemId}
                  settings={{
                    all_font: settings.all_font,
                    all_text_size: settings.all_text_size,
                    all_bold: settings.all_bold,
                    all_italic: settings.all_italic,
                    all_text_color: settings.all_text_color,
                    header_font: settings.header_font,
                    header_size: settings.header_size,
                    header_bold: settings.header_bold,
                    header_italic: settings.header_italic,
                    header_color: settings.header_color,
                  }}
                  onUpdate={onUpdateItem}
                  onDelete={onDeleteItem}
                  onDuplicate={onDuplicateItem}
                  onInsertHeaderAbove={onInsertHeaderAbove}
                  onFocus={onFocusRow}
                />
              ))}
            </SortableContext>
          </tbody>
        </table>
      </div>
    </DndContext>
  );
};
