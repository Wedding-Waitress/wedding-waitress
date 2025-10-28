import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Palette } from 'lucide-react';

interface FormattingState {
  bold: boolean;
  italic: boolean;
  red: boolean;
}

interface FormattingToolbarProps {
  formatting: FormattingState;
  onToggle: (format: 'bold' | 'italic' | 'red') => void;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  formatting,
  onToggle,
}) => {
  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        type="button"
        variant={formatting.bold ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onToggle('bold')}
        className="h-8 w-8 p-0"
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant={formatting.italic ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onToggle('italic')}
        className="h-8 w-8 p-0"
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant={formatting.red ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onToggle('red')}
        className="h-8 w-8 p-0"
        title="Red emphasis"
      >
        <Palette className="w-4 h-4" style={{ color: formatting.red ? '#D92D20' : undefined }} />
      </Button>
    </div>
  );
};

interface RichTextEditorProps {
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  hideToolbar?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "What's happening...",
  hideToolbar = false,
}) => {
  const [text, setText] = useState('');
  const [formatting, setFormatting] = useState<{
    bold: boolean;
    italic: boolean;
    red: boolean;
  }>({
    bold: false,
    italic: false,
    red: false,
  });

  useEffect(() => {
    // Parse initial value
    if (value && typeof value === 'object' && value.text) {
      setText(value.text);
      setFormatting(value.formatting || { bold: false, italic: false, red: false });
    } else if (typeof value === 'string') {
      setText(value);
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    onChange({
      text: newText,
      formatting: formatting,
    });
  };

  const toggleFormat = (format: 'bold' | 'italic' | 'red') => {
    const newFormatting = {
      ...formatting,
      [format]: !formatting[format],
    };
    setFormatting(newFormatting);
    onChange({
      text: text,
      formatting: newFormatting,
    });
  };

  const getTextClassName = () => {
    let className = '';
    if (formatting.bold) className += ' font-bold';
    if (formatting.italic) className += ' italic';
    if (formatting.red) className += ' text-[#D92D20]';
    return className;
  };

  return (
    <div className="flex gap-2">
      {!hideToolbar && (
        <div className="border-r pr-2">
          <FormattingToolbar
            formatting={formatting}
            onToggle={toggleFormat}
          />
        </div>
      )}
      <div className="flex-1">
        <Textarea
          value={text}
          onChange={handleTextChange}
          placeholder={placeholder}
          className={`min-h-[80px] resize-y${getTextClassName()}`}
          rows={3}
        />
      </div>
    </div>
  );
};
