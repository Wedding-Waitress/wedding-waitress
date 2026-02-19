import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Copy, Trash, Eraser, ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RunningSheetItem } from '@/types/runningSheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';

interface RunningSheetRowProps {
  item: RunningSheetItem;
  onUpdate: (itemId: string, updates: Partial<RunningSheetItem>) => void;
  onDuplicate: (item: RunningSheetItem) => void;
  onDelete: (itemId: string) => void;
  onClearText?: (itemId: string) => void;
  onInsertFromDJMC?: (itemId: string, type: 'ceremony' | 'introductions' | 'speeches', includeSongs: boolean) => void;
  disabled?: boolean;
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
  const lines = text.split('\n');
  const mainLines: string[] = [];
  const bullets: string[] = [];
  let subText = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      bullets.push(trimmed.replace(/^[•\-]\s*/, ''));
    } else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      subText = trimmed;
    } else {
      mainLines.push(line);
    }
  }

  const result: any = { text: mainLines.join('\n') };
  if (bullets.length > 0) result.bullets = bullets;
  if (subText) result.subText = subText;
  return result;
}

/** Auto-resize textarea to fit content */
function useAutoResize(ref: React.RefObject<HTMLTextAreaElement>, value: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0';
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}

export function RunningSheetRow({ item, onUpdate, onDuplicate, onDelete, onClearText, onInsertFromDJMC, disabled = false, hasDJMCData = false }: RunningSheetRowProps) {
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

  const eventText = buildEventDisplay(item.description_rich);
  const timeRef = useRef<HTMLTextAreaElement>(null);
  const eventRef = useRef<HTMLTextAreaElement>(null);
  const whoRef = useRef<HTMLTextAreaElement>(null);

  useAutoResize(timeRef, item.time_text);
  useAutoResize(eventRef, eventText);
  useAutoResize(whoRef, item.responsible || '');

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

  const headerClasses = isHeader ? 'font-bold text-destructive' : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 px-2 py-1.5 group hover:bg-purple-200 rounded transition-colors"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="w-6 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-2"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* TIME */}
      <textarea
        ref={timeRef}
        value={item.time_text}
        onChange={handleTimeChange}
        placeholder="Time"
        className={`basis-1/5 min-w-0 text-sm bg-background border border-input rounded-md px-3 py-1.5 resize-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${headerClasses}`}
        rows={1}
        disabled={disabled}
      />

      {/* EVENT */}
      <textarea
        ref={eventRef}
        value={eventText}
        onChange={handleEventChange}
        placeholder="Event"
        className={`flex-1 min-w-0 text-sm bg-background border border-input rounded-md px-3 py-1.5 resize-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${headerClasses}`}
        rows={1}
        disabled={disabled}
      />

      {/* WHO */}
      <textarea
        ref={whoRef}
        value={item.responsible || ''}
        onChange={handleWhoChange}
        placeholder="Who"
        className="basis-1/5 min-w-0 text-sm bg-background border border-input rounded-md px-3 py-1.5 resize-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        rows={1}
        disabled={disabled}
      />

      {/* Row actions */}
      {!disabled && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
          {/* Insert from DJ-MC */}
          {hasDJMCData && onInsertFromDJMC && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Insert from DJ-MC">
                  <ListPlus className="h-3.5 w-3.5 text-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Ceremony</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onInsertFromDJMC(item.id, 'ceremony', true)}>
                      Names & Songs
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onInsertFromDJMC(item.id, 'ceremony', false)}>
                      Names Only
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Bridal Party Introductions</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onInsertFromDJMC(item.id, 'introductions', true)}>
                      Names & Songs
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onInsertFromDJMC(item.id, 'introductions', false)}>
                      Names Only
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={() => onInsertFromDJMC(item.id, 'speeches', false)}>
                  Speeches (Names)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(item)} title="Duplicate">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowClearDialog(true)} title="Clear Text">
            <Eraser className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setShowDeleteDialog(true)} title="Delete">
            <Trash className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Text?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all text on this row. Once cleared, it cannot be retrieved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onClearText?.(item.id)}>Clear Text</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
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
