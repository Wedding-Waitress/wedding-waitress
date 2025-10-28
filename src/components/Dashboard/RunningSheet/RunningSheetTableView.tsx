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
  onUpdateItem: (id: string, data: Partial<RunningSheetItem>) => void;
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (id: string) => void;
  onInsertHeaderAbove: (orderIndex: number) => void;
  onReorderItems: (newOrder: RunningSheetItem[]) => void;
}

export const RunningSheetTableView: React.FC<RunningSheetTableViewProps> = ({
  items,
  showResponsible,
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
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-[#F4F4F5] z-10 shadow-sm">
            <tr className="border-b-2 border-border">
              <th className="p-2 w-[30px]"></th>
              <th className="p-2 w-[100px] text-center text-sm font-semibold">Times</th>
              <th className="p-2 text-left text-sm font-semibold">Event Info</th>
              {showResponsible && (
                <th className="p-2 w-[150px] text-left text-sm font-semibold">Assigned</th>
              )}
              <th className="p-2 w-[120px] text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <RunningSheetInlineRow
                  key={item.id}
                  item={item}
                  showResponsible={showResponsible}
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
