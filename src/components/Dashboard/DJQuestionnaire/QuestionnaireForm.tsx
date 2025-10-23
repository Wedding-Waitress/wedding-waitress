import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TemplateType } from '@/hooks/useDJQuestionnaire';
import { QUESTIONNAIRE_TEMPLATES, QuestionnaireQuestion } from './questionnaireTemplates';

interface QuestionnaireFormProps {
  templateType: TemplateType;
  initialValues?: Record<string, any>;
  onSave: (values: Record<string, any>) => void;
}

export const QuestionnaireForm = ({
  templateType,
  initialValues = {},
  onSave,
}: QuestionnaireFormProps) => {
  const { register, watch, reset } = useForm({
    defaultValues: initialValues,
  });

  const questions = QUESTIONNAIRE_TEMPLATES[templateType];
  const formValues = watch();

  // Auto-save on change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave(formValues);
    }, 1000);

    return () => clearTimeout(timer);
  }, [formValues, onSave]);

  // Reset form when template changes
  useEffect(() => {
    reset(initialValues);
  }, [templateType, initialValues, reset]);

  const renderQuestion = (question: QuestionnaireQuestion) => {
    const commonProps = {
      id: question.id,
      placeholder: question.placeholder,
      ...register(question.id),
    };

    switch (question.type) {
      case 'textarea':
        return <Textarea {...commonProps} className="min-h-[100px]" />;
      case 'time':
        return <Input {...commonProps} type="time" />;
      case 'text':
      default:
        return <Input {...commonProps} type="text" />;
    }
  };

  return (
    <div className="space-y-6">
      {questions.map((question) => (
        <div key={question.id} className="space-y-2">
          <Label htmlFor={question.id}>
            {question.label}
            {question.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {renderQuestion(question)}
        </div>
      ))}
    </div>
  );
};
