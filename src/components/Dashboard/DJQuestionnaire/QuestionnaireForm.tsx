import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import { DJQuestionnaireWithData, DJItem } from '@/types/djQuestionnaire';
import { useDJQuestionnaire } from '@/hooks/useDJQuestionnaire';

interface QuestionnaireFormProps {
  questionnaire: DJQuestionnaireWithData;
}

export const QuestionnaireForm = ({ questionnaire }: QuestionnaireFormProps) => {
  const { saveAnswer } = useDJQuestionnaire(questionnaire.event_id);
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
    // Auto-save with debounce
    await saveAnswer(itemId, value);
  };

  const renderInput = (item: DJItem) => {
    const value = answers[item.id] || '';

    switch (item.type) {
      case 'toggle':
        return (
          <Switch
            checked={value === true}
            onCheckedChange={(checked) => handleChange(item.id, checked)}
          />
        );

      case 'longtext':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleChange(item.id, e.target.value)}
            placeholder={item.help_text || ''}
            className="min-h-[100px]"
          />
        );

      case 'list':
        const listValues = Array.isArray(value) ? value : [];
        const maxRows = item.meta?.maxRows || 10;
        
        return (
          <div className="space-y-2">
            {listValues.map((listItem: string, idx: number) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={listItem}
                  onChange={(e) => {
                    const newList = [...listValues];
                    newList[idx] = e.target.value;
                    handleChange(item.id, newList);
                  }}
                  placeholder={`Item ${idx + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newList = listValues.filter((_, i) => i !== idx);
                    handleChange(item.id, newList);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {listValues.length < maxRows && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  handleChange(item.id, [...listValues, '']);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            )}
          </div>
        );

      case 'time':
        return (
          <Input
            type="time"
            value={value}
            onChange={(e) => handleChange(item.id, e.target.value)}
          />
        );

      case 'phone':
        return (
          <Input
            type="tel"
            value={value}
            onChange={(e) => handleChange(item.id, e.target.value)}
            placeholder={item.help_text || ''}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => handleChange(item.id, e.target.value)}
            placeholder={item.help_text || ''}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleChange(item.id, e.target.value)}
            placeholder={item.help_text || ''}
          />
        );
    }
  };

  return (
    <div className="space-y-8">
      {questionnaire.sections.map((section, sIdx) => (
        <div key={section.id} className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{section.label}</h3>
            {section.instructions && (
              <p className="text-sm text-muted-foreground mt-1">{section.instructions}</p>
            )}
          </div>

          <div className="space-y-4">
            {section.items.map((item) => (
              <div key={item.id} className="space-y-2">
                <Label htmlFor={item.id} className="flex items-center gap-1">
                  {item.prompt}
                  {item.required && <span className="text-destructive">*</span>}
                </Label>
                {item.help_text && item.type !== 'longtext' && (
                  <p className="text-xs text-muted-foreground">{item.help_text}</p>
                )}
                {renderInput(item)}
              </div>
            ))}
          </div>

          {sIdx < questionnaire.sections.length - 1 && <Separator className="mt-6" />}
        </div>
      ))}
    </div>
  );
};
