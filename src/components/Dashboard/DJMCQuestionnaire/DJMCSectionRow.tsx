/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This DJ-MC Questionnaire feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break questionnaire data, sharing, or PDF export
 *
 * Last locked: 2026-02-19
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  GripVertical, Copy, Eraser, Highlighter, MoreVertical,
  Bold, Italic, Underline, Trash,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DJMCItem, SectionType } from '@/types/djMCQuestionnaire';
import { DJMCMusicUrlField } from './DJMCMusicUrlField';
import { DJMCPronunciationRecorder } from './DJMCPronunciationRecorder';

interface DJMCSectionRowProps {
  item: DJMCItem;
  sectionType: SectionType;
  onUpdate: (updates: Partial<DJMCItem>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClearText?: () => void;
  disabled?: boolean;
}

export function DJMCSectionRow({
  item,
  sectionType,
  onUpdate,
  onDelete,
  onDuplicate,
  onClearText,
  disabled = false,
}: DJMCSectionRowProps) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingValue, setEditingValue] = useState(false);
  const [editingSongTitleArtist, setEditingSongTitleArtist] = useState(false);
  const [localLabel, setLocalLabel] = useState(item.row_label);
  const [localValue, setLocalValue] = useState(item.value_text || '');
  const [localSongTitleArtist, setLocalSongTitleArtist] = useState(item.song_title_artist || '');
  const labelInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);
  const songTitleArtistInputRef = useRef<HTMLInputElement>(null);

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
  const showMusicUrl = ['ceremony', 'cocktail', 'main_event', 'dinner', 'dance', 'traditional', 'introductions'].includes(sectionType);
  const showPronunciation = sectionType === 'introductions' || sectionType === 'ceremony' || sectionType === 'main_event' || sectionType === 'traditional';
  const showBothValueAndMusicUrl = sectionType === 'ceremony' || sectionType === 'introductions' || sectionType === 'main_event' || sectionType === 'traditional';

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

  useEffect(() => {
    if (editingSongTitleArtist && songTitleArtistInputRef.current) {
      songTitleArtistInputRef.current.focus();
      songTitleArtistInputRef.current.select();
    }
  }, [editingSongTitleArtist]);

  // Sync local state with props
  useEffect(() => {
    setLocalLabel(item.row_label);
  }, [item.row_label]);

  useEffect(() => {
    setLocalValue(item.value_text || '');
  }, [item.value_text]);

  useEffect(() => {
    setLocalSongTitleArtist(item.song_title_artist || '');
  }, [item.song_title_artist]);

  // Parse label for display (some labels have parenthetical text)
  const labelMatch = item.row_label.match(/^([^(]+)(?:\s*\(([^)]+)\))?$/);
  const displayLabel = labelMatch ? labelMatch[1].trim() : item.row_label;
  const parentheticalText = labelMatch ? labelMatch[2] : null;

  // Build formatting classes based on item flags (matching Running Sheet: highlight = bold + red text)
  const headerClasses = item.is_section_header ? 'font-bold text-destructive' : '';
  const formatClasses = [
    headerClasses,
    item.is_bold ? 'font-bold' : '',
    item.is_italic ? 'italic' : '',
    item.is_underline ? 'underline' : '',
  ].filter(Boolean).join(' ');

  // Special two-column layout for do_not_play section
  if (sectionType === 'do_not_play') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 py-2 px-1 rounded-md hover:bg-purple-200 group ${highlightClass}`}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Column 1: Song Number (1/3 width) - displays row_label */}
        <div className="flex-1 basis-1/3 min-w-0">
          {editingLabel ? (
            <Input
              ref={labelInputRef}
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              onBlur={handleLabelBlur}
              onKeyDown={handleLabelKeyDown}
              placeholder="Song 1"
              className="h-8 text-sm"
            />
          ) : (
            <div
              onClick={handleLabelClick}
              className={`px-2 py-1 text-sm font-medium rounded bg-muted cursor-text truncate ${formatClasses}`}
            >
              {item.row_label || 'Song 1'}
            </div>
          )}
        </div>

        {/* Column 2: Song Name (2/3 width) - editable value_text */}
        <div className="flex-1 basis-2/3 min-w-0">
          {editingValue ? (
            <Input
              ref={valueInputRef}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={handleValueBlur}
              onKeyDown={handleValueKeyDown}
              placeholder="Enter song name..."
              className="h-8 text-sm"
            />
          ) : (
            <div
              onClick={handleValueClick}
              className={`px-3 py-1.5 text-sm rounded bg-muted border border-input cursor-text min-h-[32px] flex items-center ${formatClasses}`}
>
              {item.value_text || <span className="text-muted-foreground">Enter song name...</span>}
            </div>
          )}
        </div>

        {/* Row actions - 3-dot menu */}
        {!disabled && (
          <div className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => onUpdate({ is_section_header: !item.is_section_header })}>
                  <Highlighter className="h-4 w-4 mr-2" />
                  Highlight Row
                  {item.is_section_header && <span className="ml-auto text-xs text-destructive">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowClearDialog(true)}>
                  <Eraser className="h-4 w-4 mr-2" />
                  Clear Text
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onUpdate({ is_bold: !item.is_bold })}>
                  <Bold className="h-4 w-4 mr-2" />
                  Bold
                  {item.is_bold && <span className="ml-auto text-xs">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdate({ is_italic: !item.is_italic })}>
                  <Italic className="h-4 w-4 mr-2" />
                  Italic
                  {item.is_italic && <span className="ml-auto text-xs">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdate({ is_underline: !item.is_underline })}>
                  <Underline className="h-4 w-4 mr-2" />
                  Underline
                  {item.is_underline && <span className="ml-auto text-xs">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Text?</AlertDialogTitle>
              <AlertDialogDescription>This will clear all text on this row. Once cleared, it cannot be retrieved.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onClearText?.()}>Clear Text</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Row?</AlertDialogTitle>
              <AlertDialogDescription>This will delete this row. Once deleted, it cannot be retrieved.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Standard layout for all other sections
  return (
    <div
      ref={setNodeRef}
      style={style}
        className={`flex items-center gap-2 py-2 px-1 rounded-md hover:bg-purple-200 group ${highlightClass}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* COLUMN 1: Speaker Status for speeches (narrower to align Speaker Name with other sections) */}
      {sectionType === 'speeches' ? (
        <div className="basis-[31%] min-w-0 shrink-0">
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
              className={`px-2 py-1 text-sm font-medium rounded bg-muted cursor-text truncate ${formatClasses}`}
            >
              {displayLabel}
              {parentheticalText && (
                <span className="text-muted-foreground font-normal"> ({parentheticalText})</span>
              )}
            </div>
          )}
        </div>
      ) : sectionType === 'introductions' || sectionType === 'ceremony' || sectionType === 'traditional' ? (
        // Special 1/4 width for introductions, ceremony, and traditional (4-column layout)
        <div className="flex-1 basis-1/4 min-w-0">
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
              className={`px-2 py-1 text-sm font-medium rounded bg-muted cursor-text truncate ${formatClasses}`}
            >
              {displayLabel}
              {parentheticalText && (
                <span className="text-muted-foreground font-normal"> ({parentheticalText})</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 basis-1/3 min-w-0">
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
              className={`px-2 py-1 text-sm font-medium rounded bg-muted cursor-text truncate ${formatClasses}`}
            >
              {displayLabel}
              {parentheticalText && (
                <span className="text-muted-foreground font-normal"> ({parentheticalText})</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* COLUMN 2 for speeches: Names of Speaker - flexible width */}
      {sectionType === 'speeches' && (
        <div className="flex-1 min-w-0">
          {editingValue ? (
            <Input
              ref={valueInputRef}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={handleValueBlur}
              onKeyDown={handleValueKeyDown}
              placeholder="Enter speaker's name..."
              className="h-8 text-sm"
            />
          ) : (
            <div
              onClick={handleValueClick}
              className={`px-3 py-1.5 text-sm rounded bg-muted border border-input cursor-text min-h-[32px] flex items-center truncate ${formatClasses}`}
            >
              {item.value_text || <span className="text-muted-foreground">Click to add speaker name...</span>}
            </div>
          )}
        </div>
      )}

      {/* COLUMN 2: Names + Audio - for introductions and ceremony (1/4 width) */}
      {(sectionType === 'introductions' || sectionType === 'ceremony') && (
        <div className="flex-1 basis-1/4 min-w-0 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            {editingValue ? (
              <Input
                ref={valueInputRef}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleValueBlur}
                onKeyDown={handleValueKeyDown}
                placeholder="Enter names..."
                className="h-8 text-sm"
              />
            ) : (
              <div
                onClick={handleValueClick}
              className={`px-3 py-1.5 text-sm rounded bg-muted border border-input cursor-text min-h-[32px] flex items-center truncate ${formatClasses}`}
            >
              {item.value_text || <span className="text-muted-foreground">Click to add names...</span>}
              </div>
            )}
          </div>
          <div className="w-10 shrink-0 flex justify-center">
            <DJMCPronunciationRecorder
              audioUrl={item.pronunciation_audio_url}
              onChange={(url) => onUpdate({ pronunciation_audio_url: url })}
            />
          </div>
        </div>
      )}

      {/* COLUMN 3: Song Title & Artist - for introductions and ceremony (1/4 width) */}
      {(sectionType === 'introductions' || sectionType === 'ceremony') && (
        <div className="flex-1 basis-1/4 min-w-0">
          {editingSongTitleArtist ? (
            <Input
              ref={songTitleArtistInputRef}
              value={localSongTitleArtist}
              onChange={(e) => setLocalSongTitleArtist(e.target.value)}
              onBlur={() => {
                setEditingSongTitleArtist(false);
                if (localSongTitleArtist !== (item.song_title_artist || '')) {
                  onUpdate({ song_title_artist: localSongTitleArtist || null });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setEditingSongTitleArtist(false);
                  if (localSongTitleArtist !== (item.song_title_artist || '')) {
                    onUpdate({ song_title_artist: localSongTitleArtist || null });
                  }
                } else if (e.key === 'Escape') {
                  setLocalSongTitleArtist(item.song_title_artist || '');
                  setEditingSongTitleArtist(false);
                }
              }}
              placeholder="Auto-fills from music link..."
              className="h-8 text-sm"
            />
          ) : (
            <div
              onClick={() => !disabled && setEditingSongTitleArtist(true)}
              className={`px-3 py-1.5 text-sm rounded bg-muted border border-input cursor-text min-h-[32px] flex items-center truncate ${formatClasses}`}
            >
              {localSongTitleArtist || <span className="text-muted-foreground">Auto-fills from music link...</span>}
            </div>
          )}
        </div>
      )}

      {/* COLUMN 2: Names/Details + Audio - 1/3 width (combined) - for non-speeches, non-introductions, non-ceremony, non-traditional */}
      {sectionType !== 'speeches' && sectionType !== 'introductions' && sectionType !== 'ceremony' && sectionType !== 'traditional' && (
        <div className="flex-1 basis-1/3 min-w-0 flex items-center gap-2">
          {/* Value/Details Input */}
          <div className="flex-1 min-w-0">
            {showBothValueAndMusicUrl ? (
            // Ceremony, Main Event, Traditional: Dedication / Name and Details
            editingValue ? (
              <Input
                ref={valueInputRef}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleValueBlur}
                onKeyDown={handleValueKeyDown}
                placeholder="Enter dedication or details..."
                className="h-8 text-sm"
              />
            ) : (
              <div
                onClick={handleValueClick}
              className={`px-3 py-1.5 text-sm rounded bg-muted border border-input cursor-text min-h-[32px] flex items-center truncate ${formatClasses}`}
            >
              {item.value_text || <span className="text-muted-foreground">Click to add...</span>}
            </div>
          )
        ) : (
            // Other sections: Names / Details (also clickable text area)
            editingValue ? (
              <Input
                ref={valueInputRef}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleValueBlur}
                onKeyDown={handleValueKeyDown}
                placeholder="Enter names or details..."
                className="h-8 text-sm"
              />
            ) : (
              <div
                onClick={handleValueClick}
                className={`px-3 py-1.5 text-sm rounded bg-muted border border-input cursor-text min-h-[32px] flex items-center truncate ${formatClasses}`}
              >
                {item.value_text || <span className="text-muted-foreground">Click to add...</span>}
              </div>
            )
          )}
        </div>

        {/* Audio button - within column 2 */}
        {showPronunciation && (
          <div className="w-10 shrink-0 flex justify-center">
            <DJMCPronunciationRecorder
              audioUrl={item.pronunciation_audio_url}
              onChange={(url) => onUpdate({ pronunciation_audio_url: url })}
            />
          </div>
        )}
        </div>
      )}

      {/* COLUMN 2: Dedication / Details - for traditional (1/4 width, no audio) */}
      {sectionType === 'traditional' && (
        <div className="flex-1 basis-1/4 min-w-0">
          {editingValue ? (
            <Input
              ref={valueInputRef}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={handleValueBlur}
              onKeyDown={handleValueKeyDown}
              placeholder="Enter dedication or details..."
              className="h-8 text-sm"
            />
          ) : (
            <div
              onClick={handleValueClick}
              className={`px-3 py-1.5 text-sm rounded bg-muted border border-input cursor-text min-h-[32px] flex items-center truncate ${formatClasses}`}
            >
              {item.value_text || <span className="text-muted-foreground">Click to add...</span>}
            </div>
          )}
        </div>
      )}

      {/* COLUMN 3: Song Title & Artist + Audio - for traditional (1/4 width) */}
      {sectionType === 'traditional' && (
        <div className="flex-1 basis-1/4 min-w-0 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            {editingSongTitleArtist ? (
              <Input
                ref={songTitleArtistInputRef}
                value={localSongTitleArtist}
                onChange={(e) => setLocalSongTitleArtist(e.target.value)}
                onBlur={() => {
                  setEditingSongTitleArtist(false);
                  if (localSongTitleArtist !== (item.song_title_artist || '')) {
                    onUpdate({ song_title_artist: localSongTitleArtist || null });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setEditingSongTitleArtist(false);
                    if (localSongTitleArtist !== (item.song_title_artist || '')) {
                      onUpdate({ song_title_artist: localSongTitleArtist || null });
                    }
                  } else if (e.key === 'Escape') {
                    setLocalSongTitleArtist(item.song_title_artist || '');
                    setEditingSongTitleArtist(false);
                  }
                }}
                placeholder="Auto-fills from music link..."
                className="h-8 text-sm"
              />
            ) : (
              <div
                onClick={() => !disabled && setEditingSongTitleArtist(true)}
              className={`px-3 py-1.5 text-sm rounded bg-muted border border-input cursor-text min-h-[32px] flex items-center truncate ${formatClasses}`}
            >
              {localSongTitleArtist || <span className="text-muted-foreground">Auto-fills from music link...</span>}
            </div>
          )}
        </div>
        <div className="w-10 shrink-0 flex justify-center">
            <DJMCPronunciationRecorder
              audioUrl={item.pronunciation_audio_url}
              onChange={(url) => onUpdate({ pronunciation_audio_url: url })}
            />
          </div>
        </div>
      )}

      {/* COLUMN 4: Music with Link - 1/4 width for introductions, ceremony, traditional */}
      {(sectionType === 'introductions' || sectionType === 'ceremony' || sectionType === 'traditional') && (
        <div className="flex-1 basis-1/4 min-w-0">
          <DJMCMusicUrlField
            value={item.music_url || ''}
            onChange={(url) => onUpdate({ music_url: url })}
            onMetadataFetched={(metadata) => {
              const formattedTitle = metadata.artist !== 'Unknown Artist'
                ? `${metadata.title} – ${metadata.artist}`
                : metadata.title;
              setLocalSongTitleArtist(formattedTitle);
              onUpdate({ song_title_artist: formattedTitle });
            }}
          />
        </div>
      )}

      {/* COLUMN 3: Music with Link - 1/3 width for non-introductions, non-ceremony, non-traditional */}
      {showMusicUrl && sectionType !== 'introductions' && sectionType !== 'ceremony' && sectionType !== 'traditional' && (
        <div className="flex-1 basis-1/3 min-w-0">
          <DJMCMusicUrlField
            value={item.music_url || ''}
            onChange={(url) => onUpdate({ music_url: url })}
            onMetadataFetched={(metadata) => {
              // Only auto-fill if the value_text field is empty
              if (!item.value_text || item.value_text.trim() === '') {
                const formattedTitle = metadata.artist !== 'Unknown Artist'
                  ? `${metadata.title} – ${metadata.artist}`
                  : metadata.title;
                onUpdate({ value_text: formattedTitle });
                setLocalValue(formattedTitle);
              }
            }}
          />
        </div>
      )}

      {/* Pronunciation Audio - for speeches only */}
      {sectionType === 'speeches' && (
        <div className="w-10 shrink-0 flex justify-center">
          <DJMCPronunciationRecorder
            audioUrl={item.pronunciation_audio_url}
            onChange={(url) => onUpdate({ pronunciation_audio_url: url })}
          />
        </div>
      )}

      {/* Duration field - for speeches only */}
      {sectionType === 'speeches' && (
        <div className="w-24 shrink-0">
          <Input
            value={item.duration || ''}
            onChange={(e) => onUpdate({ duration: e.target.value })}
            placeholder="e.g., 5 min"
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* Row actions - 3-dot menu */}
      {!disabled && (
        <div className="shrink-0 mt-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => onUpdate({ is_section_header: !item.is_section_header })}>
                <Highlighter className="h-4 w-4 mr-2" />
                Highlight Row
                {item.is_section_header && <span className="ml-auto text-xs text-destructive">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowClearDialog(true)}>
                <Eraser className="h-4 w-4 mr-2" />
                Clear Text
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUpdate({ is_bold: !item.is_bold })}>
                <Bold className="h-4 w-4 mr-2" />
                Bold
                {item.is_bold && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdate({ is_italic: !item.is_italic })}>
                <Italic className="h-4 w-4 mr-2" />
                Italic
                {item.is_italic && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdate({ is_underline: !item.is_underline })}>
                <Underline className="h-4 w-4 mr-2" />
                Underline
                {item.is_underline && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Text?</AlertDialogTitle>
            <AlertDialogDescription>This will clear all text on this row. Once cleared, it cannot be retrieved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onClearText?.()}>Clear Text</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Row?</AlertDialogTitle>
            <AlertDialogDescription>This will delete this row. Once deleted, it cannot be retrieved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
