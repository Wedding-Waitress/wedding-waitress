import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Plus, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDJMCQuestionnaire } from '@/hooks/useDJMCQuestionnaire';
import { SongRowEditor } from './SongRowEditor';
import { NameRowEditor } from './NameRowEditor';
import { SpeechRowEditor } from './SpeechRowEditor';
import { DoNotPlayRowEditor } from './DoNotPlayRowEditor';
import type { DJMCQuestionnaireWithData, DJMCSection, DJMCItem, ItemData } from '@/types/djmcQuestionnaire';

interface DJMCQuestionnaireFormProps {
  questionnaire: DJMCQuestionnaireWithData;
  onRefresh: () => void;
}

interface SortableItemProps {
  item: DJMCItem;
  sectionType: string;
  index: number;
  onSave: (data: ItemData) => void;
  onDelete: () => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ item, sectionType, index, onSave, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderEditor = () => {
    switch (sectionType) {
      case 'ceremony_music':
      case 'main_event_songs':
      case 'background_music':
      case 'background___dinner_music':
      case 'dance_music':
      case 'cultural_music':
      case 'traditional___multicultural_music':
        return (
          <SongRowEditor
            data={item.data}
            sectionType={sectionType}
            index={index}
            onSave={onSave}
            onDelete={onDelete}
          />
        );
      case 'bridal_party':
      case 'bridal_party_introductions':
        return (
          <NameRowEditor
            data={item.data}
            index={index}
            pronunciationAudioUrl={item.pronunciation_audio_url}
            itemId={item.id}
            onSave={onSave}
            onDelete={onDelete}
          />
        );
      case 'speeches':
        return (
          <SpeechRowEditor
            data={item.data}
            index={index}
            onSave={onSave}
            onDelete={onDelete}
          />
        );
      case 'do_not_play':
      case 'do_not_play_list':
        return (
          <DoNotPlayRowEditor
            data={item.data}
            index={index}
            onSave={onSave}
            onDelete={onDelete}
          />
        );
      default:
        return (
          <SongRowEditor
            data={item.data}
            sectionType={sectionType}
            index={index}
            onSave={onSave}
            onDelete={onDelete}
          />
        );
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 group">
      <div
        {...attributes}
        {...listeners}
        className="mt-3 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        {renderEditor()}
      </div>
    </div>
  );
};

export const DJMCQuestionnaireForm: React.FC<DJMCQuestionnaireFormProps> = ({
  questionnaire,
  onRefresh,
}) => {
  const { saveItem, deleteItem, reorderItems } = useDJMCQuestionnaire(questionnaire.event_id);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent, section: DJMCSection & { items: DJMCItem[] }) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = section.items.findIndex(i => i.id === active.id);
      const newIndex = section.items.findIndex(i => i.id === over.id);

      const newOrder = arrayMove(section.items, oldIndex, newIndex);
      await reorderItems(section.id, newOrder.map(i => i.id));
      onRefresh();
    }
  };

  const handleAddRow = async (sectionId: string, sectionType: string) => {
    const defaultData: ItemData = getDefaultData(sectionType);
    await saveItem(sectionId, null, defaultData, getItemType(sectionType));
    onRefresh();
  };

  const handleSaveItem = async (sectionId: string, itemId: string, data: ItemData, sectionType: string) => {
    await saveItem(sectionId, itemId, data, getItemType(sectionType));
    // Don't refresh to avoid flicker - optimistic update
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem(itemId);
    onRefresh();
  };

  const getDefaultData = (sectionType: string): ItemData => {
    switch (sectionType) {
      case 'bridal_party':
      case 'bridal_party_introductions':
        return { role: '', names: '', pronunciation: '' };
      case 'speeches':
        return { order: 0, name: '', role: '', notes: '' };
      case 'do_not_play':
      case 'do_not_play_list':
        return { song_or_genre: '', notes: '' };
      default:
        return { song_title: '', artist: '', link: '' };
    }
  };

  const getItemType = (sectionType: string): string => {
    switch (sectionType) {
      case 'bridal_party':
      case 'bridal_party_introductions':
        return 'name';
      case 'speeches':
        return 'speech';
      case 'do_not_play':
      case 'do_not_play_list':
        return 'do_not_play';
      default:
        return 'song';
    }
  };

  const getSectionType = (label: string): string => {
    return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
  };

  return (
    <div className="space-y-6 print:space-y-4" id="questionnaire-form">
      {questionnaire.sections.map((section) => {
        const sectionType = getSectionType(section.label);

        return (
          <Card key={section.id} className="ww-box print:break-inside-avoid">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-[#7248e6]">
                {section.label}
              </CardTitle>
              {section.instructions && (
                <p className="text-sm text-muted-foreground">{section.instructions}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, section)}
              >
                <SortableContext
                  items={section.items.map(i => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {section.items.map((item, index) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      sectionType={sectionType}
                      index={index}
                      onSave={(data) => handleSaveItem(section.id, item.id, data, sectionType)}
                      onDelete={() => handleDeleteItem(item.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Add Row Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4 border-dashed"
                onClick={() => handleAddRow(section.id, sectionType)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
