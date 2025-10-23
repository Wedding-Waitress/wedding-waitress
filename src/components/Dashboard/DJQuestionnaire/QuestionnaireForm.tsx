import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Plus, ExternalLink } from 'lucide-react';
import { validateMusicURL, getPlatformName, ensureAbsoluteUrl } from '@/lib/urlValidation';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DJQuestionnaireWithData } from '@/types/djQuestionnaire';
import { useDJQuestionnaire } from '@/hooks/useDJQuestionnaire';
import { EditableSectionHeader } from './EditableSectionHeader';
import { RecommendationsNotice } from './RecommendationsNotice';
import { FormRow } from './FormRow';

interface QuestionnaireFormProps {
  questionnaire: DJQuestionnaireWithData;
}

export const QuestionnaireForm = ({ questionnaire }: QuestionnaireFormProps) => {
  const { 
    saveAnswer, 
    updateSectionLabel,
    addItemAbove,
    addItemBelow,
    deleteItem,
    reorderItems 
  } = useDJQuestionnaire(questionnaire.event_id);
  
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    questionnaire.sections.forEach(section => {
      section.items.forEach(item => {
        if (item.answer) {
          initial[item.id] = item.answer.value;
        }
      });
    });
    return initial;
  });

  const handleChange = async (itemId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [itemId]: value }));
    await saveAnswer(itemId, value);
  };

  const handleDragEnd = (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      reorderItems(active.id as string, over.id as string, sectionId);
    }
  };

  return (
    <div id="questionnaire-form" className="space-y-8">
      {questionnaire.sections.map((section, sIdx) => {
        const hasRecommendations = section.recommendations?.default_rows?.length > 0;
        const maxRows = section.items[0]?.meta?.maxRows;
        const canAddMore = !maxRows || section.items.length < maxRows;

        return (
          <div key={section.id} className="space-y-4">
            <EditableSectionHeader
              label={section.label}
              onSave={(newLabel) => updateSectionLabel(section.id, newLabel)}
            />

            {section.instructions && (
              <p className="text-sm text-muted-foreground italic">
                {section.instructions}
              </p>
            )}

            {hasRecommendations && (
              <RecommendationsNotice recommendations={section.recommendations} />
            )}

            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(event, section.id)}
            >
              <SortableContext
                items={section.items.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {section.items.map((item) => {
                    const minRows = item.meta?.minRows || 0;
                    const canDelete = section.items.length > minRows;
                    const answerValue = answers[item.id];
                    const showLinkPreview = item.type === 'song_row' && answerValue?.link;

                    return (
                      <div key={item.id} className="space-y-2">
                        <FormRow
                          item={item}
                          value={answerValue}
                          onChange={(value) => handleChange(item.id, value)}
                          onAddAbove={() => addItemAbove(item.id, section.id)}
                          onAddBelow={() => addItemBelow(item.id, section.id)}
                          onDelete={() => deleteItem(item.id, section.id)}
                          canDelete={canDelete}
                        />
                        {showLinkPreview && (
                          <div className="ml-12 text-xs text-muted-foreground print:hidden">
                            <a
                              href={ensureAbsoluteUrl(answerValue.link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 song-link"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {getPlatformName(validateMusicURL(answerValue.link).platform)}
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {canAddMore && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const lastItem = section.items[section.items.length - 1];
                  if (lastItem) {
                    await addItemBelow(lastItem.id, section.id);
                  }
                }}
                className="w-full border-[#6D28D9] text-[#6D28D9] hover:bg-[#6D28D9]/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
            )}

            {sIdx < questionnaire.sections.length - 1 && (
              <Separator className="mt-6" />
            )}
          </div>
        );
      })}
    </div>
  );
};
