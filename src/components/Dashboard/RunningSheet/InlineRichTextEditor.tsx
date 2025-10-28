import React, { useState, useEffect } from 'react';
import { Bold, Italic, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPickerPopover } from '@/components/ui/color-picker-popover';

interface InlineRichTextEditorProps {
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
}

export const InlineRichTextEditor: React.FC<InlineRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Event info..."
}) => {
  const [textLocal, setTextLocal] = useState('');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [color, setColor] = useState('#000000');
  const [fontSize, setFontSize] = useState('14px');

  // Initialize from value
  useEffect(() => {
    if (typeof value === 'object' && value !== null) {
      setTextLocal(value.text || '');
      setBold(value.formatting?.bold || false);
      setItalic(value.formatting?.italic || false);
      setColor(value.formatting?.color || '#000000');
      setFontSize(value.formatting?.fontSize || '14px');
    } else if (typeof value === 'string') {
      setTextLocal(value);
    }
  }, [value]);

  const handleTextChange = (newText: string) => {
    setTextLocal(newText);
    onChange({
      text: newText,
      formatting: { bold, italic, color, fontSize }
    });
  };

  const toggleBold = () => {
    const newBold = !bold;
    setBold(newBold);
    onChange({
      text: textLocal,
      formatting: { bold: newBold, italic, color, fontSize }
    });
  };

  const toggleItalic = () => {
    const newItalic = !italic;
    setItalic(newItalic);
    onChange({
      text: textLocal,
      formatting: { bold, italic: newItalic, color, fontSize }
    });
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    onChange({
      text: textLocal,
      formatting: { bold, italic, color: newColor, fontSize }
    });
  };

  const handleFontSizeChange = (newSize: string) => {
    setFontSize(newSize);
    onChange({
      text: textLocal,
      formatting: { bold, italic, color, fontSize: newSize }
    });
  };

  return (
    <div className="space-y-1">
      {/* Toolbar */}
      <div className="flex items-center gap-1 pb-1 border-b">
        <Button
          size="sm"
          variant={bold ? "default" : "ghost"}
          className="h-7 w-7 p-0"
          onClick={toggleBold}
          type="button"
        >
          <Bold className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant={italic ? "default" : "ghost"}
          className="h-7 w-7 p-0"
          onClick={toggleItalic}
          type="button"
        >
          <Italic className="w-3 h-3" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <ColorPickerPopover
          value={color}
          onChange={handleColorChange}
        />
        <Select value={fontSize} onValueChange={handleFontSizeChange}>
          <SelectTrigger className="w-20 h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12px">Small</SelectItem>
            <SelectItem value="14px">Medium</SelectItem>
            <SelectItem value="16px">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Textarea */}
      <Textarea
        value={textLocal}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[60px] resize-none"
        style={{
          fontWeight: bold ? 'bold' : 'normal',
          fontStyle: italic ? 'italic' : 'normal',
          color: color,
          fontSize: fontSize
        }}
      />
    </div>
  );
};
