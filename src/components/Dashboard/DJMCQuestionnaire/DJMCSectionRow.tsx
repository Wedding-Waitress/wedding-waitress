import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Copy } from 'lucide-react';
import { DJMCItem, SectionType } from '@/types/djMCQuestionnaire';
import { DJMCMusicUrlField } from './DJMCMusicUrlField';
import { DJMCPronunciationRecorder } from './DJMCPronunciationRecorder';

interface DJMCSectionRowProps {
  item: DJMCItem;
  sectionType: SectionType;
  onUpdate: (updates: Partial<DJMCItem>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  disabled?: boolean;
}

export function DJMCSectionRow({
  item,
  sectionType,
  onUpdate,
  onDelete,
  onDuplicate,
  disabled = false,
}: DJMCSectionRowProps) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [editingValue, setEditingValue] = useState(false);
  const [localLabel, setLocalLabel] = useState(item.row_label);
  const [localValue, setLocalValue] = useState(item.value_text || '');
  const labelInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Determine what fields to show based on section type
  const showMusicUrl = ['ceremony', 'cocktail', 'main_event', 'dinner', 'dance', 'traditional'].includes(sectionType);
  const showPronunciation = sectionType === 'introductions';

  // Handle label editing
  const handleLabelClick = useCallback(() => {
    if (!disabled) {
      setEditingLabel(true);
    }
  }, [disabled]);

  const handleLabelBlur = useCallback(() => {
    setEditingLabel(false);
    if (localLabel !== item.row_label) {
      onUpdate({ row_label: localLabel });
    }
  }, [localLabel, item.row_label, onUpdate]);

  const handleLabelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLabelBlur();
    } else if (e.key === 'Escape') {
      setLocalLabel(item.row_label);
      setEditingLabel(false);
    }
  }, [handleLabelBlur, item.row_label]);

  // Handle value editing
  const handleValueClick = useCallback(() => {
    if (!disabled) {
      setEditingValue(true);
    }
  }, [disabled]);

  const handleValueBlur = useCallback(() => {
    setEditingValue(false);
    if (localValue !== (item.value_text || '')) {
      onUpdate({ value_text: localValue || null });
    }
  }, [localValue, item.value_text, onUpdate]);

  const handleValueKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValueBlur();
    } else if (e.key === 'Escape') {
      setLocalValue(item.value_text || '');
      setEditingValue(false);
    }
  }, [handleValueBlur, item.value_text]);

  // Focus inputs when editing starts
  useEffect(() => {
    if (editingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [editingLabel]);

  useEffect(() => {
    if (editingValue && valueInputRef.current) {
      valueInputRef.current.focus();
      valueInputRef.current.select();
    }
  }, [editingValue]);

  // Sync local state with props
  useEffect(() => {
    setLocalLabel(item.row_label);
  }, [item.row_label]);

  useEffect(() => {
    setLocalValue(item.value_text || '');
  }, [item.value_text]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 py-2 px-2 border-b border-border/50 hover:bg-muted/30 transition-colors"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Left column - Label */}
      <div className="flex-1 min-w-0">
        {editingLabel ? (
          <Input
            ref={labelInputRef}
            value={localLabel}
            onChange={(e) => setLocalLabel(e.target.value)}
            onBlur={handleLabelBlur}
            onKeyDown={handleLabelKeyDown}
            className="h-8 text-sm"
          />
        ) : (
          <div
            onClick={handleLabelClick}
            className="cursor-text px-3 py-1.5 text-sm rounded hover:bg-muted/50 truncate"
          >
            {(() => {
              // Parse label to separate main text from parenthetical text
              const match = item.row_label.match(/^(.+?)(\s*\(.+\))$/);
              if (match) {
                // If trailing parentheses is "(Optional)", render it bold like the rest
                const isOptional = match[2].trim().toLowerCase() === '(optional)';
                return (
                  <>
                    <span className="font-semibold text-foreground">{match[1]}</span>
                    <span className={isOptional ? "font-semibold text-foreground" : "font-normal text-muted-foreground"}>{match[2]}</span>
                  </>
                );
              }
              return <span className="font-semibold text-foreground">{item.row_label}</span>;
            })()}
          </div>
        )}
      </div>

      {/* Right column - Value or Music URL */}
      <div className="flex-1 min-w-0">
        {showMusicUrl ? (
          <DJMCMusicUrlField
            value={item.music_url}
            onChange={(url) => onUpdate({ music_url: url })}
            disabled={disabled}
          />
        ) : editingValue ? (
          <Input
            ref={valueInputRef}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleValueBlur}
            onKeyDown={handleValueKeyDown}
            className="h-8 text-sm"
            placeholder={(item as any).placeholder || "Enter name or details..."}
          />
        ) : (
          <div
            onClick={handleValueClick}
            className="cursor-text px-3 py-1.5 text-sm rounded hover:bg-muted/50 truncate text-muted-foreground"
          >
            {item.value_text || (item as any).placeholder || 'Click to add...'}
          </div>
        )}
      </div>

      {/* Pronunciation recorder (for introductions section) */}
      {showPronunciation && (
        <DJMCPronunciationRecorder
          audioUrl={item.pronunciation_audio_url}
          onChange={(url) => onUpdate({ pronunciation_audio_url: url })}
          disabled={disabled}
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onDuplicate}
          disabled={disabled}
          title="Duplicate row"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onDelete}
          disabled={disabled}
          title="Delete row"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
