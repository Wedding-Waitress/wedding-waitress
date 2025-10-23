import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TemplateType } from '@/hooks/useDJQuestionnaire';
import { getTemplateLabel } from './questionnaireTemplates';

interface QuestionnaireTemplateSelectorProps {
  value: TemplateType;
  onChange: (value: TemplateType) => void;
}

export const QuestionnaireTemplateSelector = ({
  value,
  onChange,
}: QuestionnaireTemplateSelectorProps) => {
  const templates: TemplateType[] = ['wedding_mr_mrs', 'wedding_mr_mr', 'wedding_mrs_mrs', 'events'];

  return (
    <Select value={value} onValueChange={(val) => onChange(val as TemplateType)}>
      <SelectTrigger className="w-[280px] bg-background">
        <SelectValue placeholder="Select template..." />
      </SelectTrigger>
      <SelectContent className="bg-background z-50">
        {templates.map((template) => (
          <SelectItem key={template} value={template}>
            {getTemplateLabel(template)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
