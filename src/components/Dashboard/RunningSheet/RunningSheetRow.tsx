/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This Running Sheet feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break running sheet data, sharing, or PDF export
 *
 * Last locked: 2026-04-02
 */
import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Copy, Trash2, Eraser, ListPlus, Highlighter,
  EllipsisVertical, Bold, Italic, Underline, Undo2,
  HeartHandshake, UsersRound, Mic2, Music2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { RunningSheetItem } from '@/types/runningSheet';
import styles from './RunningSheetTheme.module.css';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface RunningSheetRowProps {
  item: RunningSheetItem;
  onUpdate: (itemId: string, updates: Partial<RunningSheetItem>) => void;
  onDuplicate: (item: RunningSheetItem) => void;
  onDelete: (itemId: string) => void;
  onClearText?: (itemId: string) => void;
  onInsertFromDJMC?: (itemId: string, type: 'ceremony' | 'introductions' | 'speeches', includeSongs: boolean) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  rowTextSize?: "standard" | "larger";
  disabled?: boolean;
  readOnly?: boolean;
  hasDJMCData?: boolean;
}

/** Build display text from description_rich (text + bullets + subText) */
function buildEventDisplay(rich: any): string {
  if (!rich || typeof rich === 'string') return rich || '';
  const parts: string[] = [];
  if (rich.text) parts.push(rich.text);
  if (Array.isArray(rich.bullets)) {
    rich.bullets.forEach((b: string) => parts.push(`• ${b}`));
  }
  if (rich.subText) parts.push(rich.subText);
  return parts.join('\n');
}

/** Parse edited text back into description_rich structure */
function parseEventText(text: string): any {
  // Preserve the exact order of typed paragraphs, bullet points and parenthetical notes.
  return { text };
}

/** Auto-resize textarea to fit content */
function useAutoResize(ref: React.RefObject<HTMLTextAreaElement>, value: string, rowTextSize: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const resize = () => { el.style.height = '0'; el.style.height = el.scrollHeight + 'px'; };
    resize();
    let width = el.getBoundingClientRect().width;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      const nextWidth = el.getBoundingClientRect().width;
      if (nextWidth !== width) { width = nextWidth; resize(); }
    });
    observer?.observe(el);
    return () => observer?.disconnect();
  }, [ref, value, rowTextSize]);
}

export function RunningSheetRow({ item, onUpdate, onDuplicate, onDelete, onClearText, onInsertFromDJMC, onUndo, canUndo = false, rowTextSize = "standard", disabled = false, readOnly = disabled, hasDJMCData = false }: RunningSheetRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const eventText = buildEventDisplay(item.description_rich);
  const timeRef = useRef<HTMLTextAreaElement>(null);
  const eventRef = useRef<HTMLTextAreaElement>(null);
  const whoRef = useRef<HTMLTextAreaElement>(null);

  useAutoResize(timeRef, item.time_text, rowTextSize);
  useAutoResize(eventRef, eventText, rowTextSize);
  useAutoResize(whoRef, item.responsible || '', rowTextSize);

  const isHeader = item.is_section_header;
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(item.id, { time_text: e.target.value });
  }, [item.id, onUpdate]);

  const handleEventChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(item.id, { description_rich: parseEventText(e.target.value) });
  }, [item.id, onUpdate]);

  const handleWhoChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(item.id, { responsible: e.target.value });
  }, [item.id, onUpdate]);

  const headerClasses = isHeader ? styles.redRowText : '';
  const boldClass = item.is_bold ? 'font-bold' : '';
  const italicClass = item.is_italic ? 'italic' : '';
  const underlineClass = item.is_underline ? 'underline' : '';
  const formattingClasses = `${boldClass} ${italicClass} ${underlineClass}`.trim();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 px-2 py-1.5 group rounded transition-colors ${styles.scheduleRow}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className={`w-6 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-2 ${styles.dragHandle}`}
        tabIndex={disabled ? -1 : 0}
        disabled={disabled}
        title="Drag to reorder row"
        aria-label="Drag to reorder row"
      >
        <GripVertical size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>


      {/* TIME */}
      <span className={`${styles.mobileFieldLabel} ${styles.timeLabel}`}>Time</span>
      <textarea
        ref={timeRef}
        value={item.time_text}
        onChange={handleTimeChange}
        placeholder="Time"
        aria-label="Time"
        className={`w-[15%] shrink-0 min-w-0 bg-background border border-input rounded-md px-3 py-1.5 resize-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${styles.bodyText} ${styles.timeField} ${headerClasses} ${formattingClasses}`}
        rows={1}
        disabled={disabled}
      />

      {/* EVENT */}
      <span className={`${styles.mobileFieldLabel} ${styles.eventLabel}`}>Event</span>
      <textarea
        ref={eventRef}
        value={eventText}
        onChange={handleEventChange}
        placeholder="Event"
        aria-label="Event"
        className={`flex-1 min-w-0 bg-background border border-input rounded-md px-3 py-1.5 resize-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${styles.bodyText} ${styles.eventField} ${headerClasses} ${formattingClasses}`}
        rows={1}
        disabled={disabled}
      />

      {/* WHO */}
      <span className={`${styles.mobileFieldLabel} ${styles.whoLabel}`}>Who</span>
      <textarea
        ref={whoRef}
        value={item.responsible || ''}
        onChange={handleWhoChange}
        placeholder="Who"
        aria-label="Who"
        className={`basis-1/5 min-w-0 bg-background border border-input rounded-md px-3 py-1.5 resize-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${styles.bodyText} ${styles.whoField} ${headerClasses} ${formattingClasses}`}
        rows={1}
        disabled={disabled}
      />

      {/* Row actions - 3-dot menu */}
      {!readOnly && (
        <div className={`shrink-0 mt-1 ${styles.rowActions}`}>
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Row actions" aria-label="Row actions" disabled={disabled}>
                      <EllipsisVertical size={16} strokeWidth={1.8} aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent className="ww-running-sheet-tooltip">Row actions</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end" className="w-56 ww-running-sheet-menu">
              {/* Undo */}
              <DropdownMenuItem onClick={() => onUndo?.()} disabled={!canUndo}>
                <Undo2 size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                Undo
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Highlight Row */}
              <DropdownMenuItem onClick={() => onUpdate(item.id, { is_section_header: !item.is_section_header })}>
                <Highlighter size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                {isHeader ? 'Restore Normal Text Colour' : 'Make Row Text Red'}
                {isHeader && <span className="ml-auto text-xs text-destructive">✓</span>}
              </DropdownMenuItem>

              {/* Insert from DJ-MC */}
              {hasDJMCData && onInsertFromDJMC && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ListPlus size={18} strokeWidth={1.8} className="mr-2 text-primary" aria-hidden="true" />
                    Insert from Questionnaire
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="ww-running-sheet-menu">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <HeartHandshake size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                        Ceremony
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="ww-running-sheet-menu">
                        <DropdownMenuItem onClick={() => onInsertFromDJMC(item.id, 'ceremony', true)}>
                          <Music2 size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                          Names &amp; Songs
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onInsertFromDJMC(item.id, 'ceremony', false)}>
                          <UsersRound size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                          Names Only
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <UsersRound size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                        Bridal Party Introductions
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="ww-running-sheet-menu">
                        <DropdownMenuItem onClick={() => onInsertFromDJMC(item.id, 'introductions', true)}>
                          <Music2 size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                          Names &amp; Songs
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onInsertFromDJMC(item.id, 'introductions', false)}>
                          <UsersRound size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                          Names Only
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onClick={() => onInsertFromDJMC(item.id, 'speeches', false)}>
                      <Mic2 size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                      Speeches (Names)
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Duplicate */}
              <DropdownMenuItem onClick={() => onDuplicate(item)}>
                <Copy size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                Duplicate
              </DropdownMenuItem>

              {/* Clear Text */}
              <DropdownMenuItem onClick={() => setShowClearDialog(true)}>
                <Eraser size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                Clear Text
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Bold */}
              <DropdownMenuItem onClick={() => onUpdate(item.id, { is_bold: !item.is_bold })}>
                <Bold size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                Bold
                {item.is_bold && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>

              {/* Italic */}
              <DropdownMenuItem onClick={() => onUpdate(item.id, { is_italic: !item.is_italic })}>
                <Italic size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                Italic
                {item.is_italic && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>

              {/* Underline */}
              <DropdownMenuItem onClick={() => onUpdate(item.id, { is_underline: !item.is_underline })}>
                <Underline size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                Underline
                {item.is_underline && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Delete */}
              <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                Delete
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent className={styles.dialogSurface}>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Text?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all text on this row. Once cleared, it cannot be retrieved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className={styles.destructiveAction} onClick={() => onClearText?.(item.id)}>Clear Text</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className={styles.dialogSurface}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Row?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete this row. Once deleted, it cannot be retrieved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDelete(item.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
