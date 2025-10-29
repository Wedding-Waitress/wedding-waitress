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
  settings: {
    all_font: string;
    all_text_size: 'small' | 'medium' | 'large';
    all_bold: boolean;
    all_italic: boolean;
    all_text_color: string;
    header_font: string;
    header_size: 'small' | 'medium' | 'large';
    header_bold: boolean;
    header_italic: boolean;
    header_color: string;
  };
  onUpdateItem: (id: string, data: Partial<RunningSheetItem>) => void;
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (id: string) => void;
  onInsertHeaderAbove: (orderIndex: number) => void;
  onReorderItems: (newOrder: RunningSheetItem[]) => void;
}

const TEXT_SIZE_MAP = {
  small: '12px',
  medium: '14px',
  large: '16px',
};

export const RunningSheetTableView: React.FC<RunningSheetTableViewProps> = ({
  items,
  showResponsible,
  settings,
  onUpdateItem,
  onDeleteItem,
  onDuplicateItem,
  onInsertHeaderAbove,
  onReorderItems,
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
            fontSize: TEXT_SIZE_MAP[settings.all_text_size],
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
                width: '20px', 
                padding: '8px', 
                textAlign: 'left',
                fontFamily: settings.header_font,
                fontSize: TEXT_SIZE_MAP[settings.header_size],
                fontWeight: settings.header_bold ? 'bold' : 'normal',
                fontStyle: settings.header_italic ? 'italic' : 'normal',
                color: '#000000',
                backgroundColor: '#F4F4F5',
                border: '1px solid #E5E5E5'
              }}></th>
              <th style={{ 
                width: '80px',
                padding: '8px',
                textAlign: 'left',
                fontFamily: settings.header_font,
                fontSize: TEXT_SIZE_MAP[settings.header_size],
                fontWeight: settings.header_bold ? 'bold' : 'normal',
                fontStyle: settings.header_italic ? 'italic' : 'normal',
                color: '#000000',
                backgroundColor: '#F4F4F5',
                border: '1px solid #E5E5E5'
              }}>Times</th>
              <th style={{ 
                padding: '8px',
                textAlign: 'left',
                fontFamily: settings.header_font,
                fontSize: TEXT_SIZE_MAP[settings.header_size],
                fontWeight: settings.header_bold ? 'bold' : 'normal',
                fontStyle: settings.header_italic ? 'italic' : 'normal',
                color: '#000000',
                backgroundColor: '#F4F4F5',
                border: '1px solid #E5E5E5'
              }}>Event Info</th>
              <th style={{ 
                width: '150px',
                padding: '8px',
                textAlign: 'left',
                fontFamily: settings.header_font,
                fontSize: TEXT_SIZE_MAP[settings.header_size],
                fontWeight: settings.header_bold ? 'bold' : 'normal',
                fontStyle: settings.header_italic ? 'italic' : 'normal',
                color: '#000000',
                backgroundColor: '#F4F4F5',
                border: '1px solid #E5E5E5'
              }}>Assigned</th>
              <th style={{ 
                width: '100px',
                padding: '8px',
                textAlign: 'center',
                fontFamily: settings.header_font,
                fontSize: TEXT_SIZE_MAP[settings.header_size],
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
              {items.map((item) => (
                <RunningSheetInlineRow
                  key={item.id}
                  item={item}
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
                />
              ))}
            </SortableContext>
          </tbody>
        </table>
      </div>
    </DndContext>
  );
};
