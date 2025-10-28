import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { RunningSheetItem } from '@/types/runningSheet';
import { RunningSheetRow } from './RunningSheetRow';

interface RunningSheetTableProps {
  items: RunningSheetItem[];
  showResponsible: boolean;
  onUpdateItem: (id: string, data: Partial<RunningSheetItem>) => void;
  onDeleteItem: (id: string) => void;
  onReorder: (newOrder: RunningSheetItem[]) => void;
}

export const RunningSheetTable: React.FC<RunningSheetTableProps> = ({
  items,
  showResponsible,
  onUpdateItem,
  onDeleteItem,
  onReorder,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);

      const newOrder = arrayMove(items, oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No items yet. Add your first timeline item to get started.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item) => (
            <RunningSheetRow
              key={item.id}
              item={item}
              showResponsible={showResponsible}
              onUpdate={onUpdateItem}
              onDelete={onDeleteItem}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
