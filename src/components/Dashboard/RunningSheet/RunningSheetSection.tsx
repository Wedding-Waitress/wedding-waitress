import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ChevronDown, ChevronUp, Plus, EllipsisVertical, RotateCcw, MessageSquareText,
  LoaderCircle, Undo2, Trash2, Eraser, ListChecks, NotebookPen, Clock3, ListTodo, UsersRound,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RunningSheetItem } from '@/types/runningSheet';
import { RunningSheetRow } from './RunningSheetRow';
import styles from './RunningSheetTheme.module.css';

interface RunningSheetSectionProps {
  rowTextSize?: "standard" | "larger";
  onRowTextSizeChange?: (size: "standard" | "larger") => void;
  label: string;
  onLabelChange: (label: string) => void;
  notes: string | null;
  onNotesChange: (notes: string | null) => void;
  items: RunningSheetItem[];
  onUpdateItem: (itemId: string, updates: Partial<RunningSheetItem>) => void;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void | Promise<void>;
  onRestoreItems: (items: RunningSheetItem[]) => Promise<RunningSheetItem[] | null>;
  onDuplicateItem: (item: RunningSheetItem) => void;
  onReorderItems: (items: RunningSheetItem[]) => void;
  onResetToDefault: () => void;
  onDownloadSectionPDF?: () => void;
  onInsertFromDJMC?: (itemId: string, type: 'ceremony' | 'introductions' | 'speeches', includeSongs: boolean) => void;
  hasDJMCData?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  allowReset?: boolean;
}

export function RunningSheetSection({
  rowTextSize = "standard",
  onRowTextSizeChange,
  label,
  onLabelChange,
  notes,
  onNotesChange,
  items,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onRestoreItems,
  onDuplicateItem,
  onReorderItems,
  onResetToDefault,
  onDownloadSectionPDF,
  onInsertFromDJMC,
  hasDJMCData = false,
  disabled: externallyDisabled = false,
  readOnly = externallyDisabled,
  allowReset = true,
}: RunningSheetSectionProps) {
  const [busy, setBusy] = useState<false | "saving" | "restoring">(false);
  const busyRef = useRef(false);
  const disabled = readOnly || externallyDisabled || !!busy;
  const [undoError, setUndoError] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [localLabel, setLocalLabel] = useState(label);
  const [showNotes, setShowNotes] = useState(!!notes);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [undoStack, setUndoStack] = useState<({ itemId: string; snapshot: Partial<RunningSheetItem> } | { rows: RunningSheetItem[] })[]>([]);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateWithUndo = useCallback((itemId: string, updates: Partial<RunningSheetItem>) => {
    const currentItem = items.find(i => i.id === itemId);
    if (currentItem) {
      const snapshot: Partial<RunningSheetItem> = {};
      for (const key of Object.keys(updates) as (keyof RunningSheetItem)[]) {
        (snapshot as any)[key] = (currentItem as any)[key];
      }
      setUndoStack(prev => [...prev.slice(-19), { itemId, snapshot }]);
    }
    onUpdateItem(itemId, updates);
  }, [items, onUpdateItem]);

  const rememberRows = (rows: RunningSheetItem[]) => {
    if (rows.length) setUndoStack(prev => [...prev.slice(-19), { rows: structuredClone(rows) }]);
  };

  const handleUndo = async () => {
    if (disabled || busyRef.current) return;
    const last = [...undoStack].reverse().find(entry => 'rows' in entry || items.some(item => item.id === entry.itemId));
    if (!last) return;
    busyRef.current = true;
    setBusy("restoring");
    setUndoError(false);
    try {
      if ('rows' in last) {
        const restored = await onRestoreItems(last.rows);
        if (!restored) { setUndoError(true); return; }
        // Shared-link restoration may assign new row IDs. Keep earlier Undo entries usable.
        const ids = new Map(last.rows.map((row, index) => [row.id, restored[index].id]));
        setUndoStack(prev => prev.slice(0, prev.indexOf(last)).map(entry => 'rows' in entry
          ? { rows: entry.rows.map(row => ({ ...row, id: ids.get(row.id) || row.id })) }
          : { ...entry, itemId: ids.get(entry.itemId) || entry.itemId }));
      } else {
        const current = items.find(item => item.id === last.itemId)!;
        const restored = await onRestoreItems([{ ...current, ...last.snapshot }]);
        if (!restored) { setUndoError(true); return; }
        setUndoStack(prev => prev.slice(0, prev.indexOf(last)));
      }
    } catch { setUndoError(true); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const deleteRows = async (rows: RunningSheetItem[]) => {
    if (disabled || busyRef.current) return;
    rememberRows(rows);
    busyRef.current = true;
    setBusy("saving");
    try { await Promise.all(rows.map(item => onDeleteItem(item.id))); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (disabled || !over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({ ...item, order_index: idx }));
      onReorderItems(newItems);
    }
  }, [items, disabled, onReorderItems]);

  const handleLabelBlur = useCallback(() => {
    setEditingLabel(false);
    if (localLabel !== label) onLabelChange(localLabel);
  }, [localLabel, label, onLabelChange]);

  const handleLabelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLabelBlur();
    else if (e.key === 'Escape') { setLocalLabel(label); setEditingLabel(false); }
  }, [handleLabelBlur, label]);

  useEffect(() => {
    if (editingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [editingLabel]);

  useEffect(() => { setLocalLabel(label); }, [label]);

  return (
    <>
      {busy && <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-[#967a59] bg-[#fff4e5] px-5 py-3 text-[#2f1b14] shadow-lg">
        <LoaderCircle size={20} className="animate-spin" aria-hidden="true"/>
        {busy === 'restoring' ? 'Restoring run sheet… Please keep this page open.' : 'Saving changes… Please wait.'}
      </div>}
      <Card data-row-text-size={rowTextSize} className={`${styles.glassCard} ${styles.scheduleCard}`}>
        <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
          <CardHeader className="py-3 px-4">
            <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title={isCollapsed ? 'Expand section' : 'Collapse section'}
                    aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                  >
                    {isCollapsed
                      ? <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
                      : <ChevronUp size={16} strokeWidth={1.8} aria-hidden="true" />}
                  </Button>
                </CollapsibleTrigger>

                <ListChecks size={20} strokeWidth={1.8} className="text-primary shrink-0" aria-hidden="true" />

                {editingLabel ? (
                  <Input
                    ref={labelInputRef}
                    value={localLabel}
                    onChange={(e) => setLocalLabel(e.target.value)}
                    onBlur={handleLabelBlur}
                    onKeyDown={handleLabelKeyDown}
                    className={`h-8 flex-1 ${styles.sectionHeading}`}
                  />
                ) : (
                  <h3
                    onClick={() => !disabled && setEditingLabel(true)}
                    className={`text-primary cursor-text hover:bg-muted/50 px-2 py-1 rounded transition-colors ${styles.sectionHeading}`}
                  >
                    {label}
                  </h3>
                )}
              </div>

              {!readOnly && (
                <p className="order-3 w-full md:order-none md:w-auto md:flex-1 md:min-w-0 mx-auto px-4 text-center text-sm leading-relaxed text-[#6f5342] print:hidden">
                  <span className="block"><strong>Tip:</strong> We have included a sample wedding run sheet to get you started.</span><span className="block">Keep it as it is, edit any field, or remove rows and add your own to suit your celebration.</span>
                </p>
              )}

              <TooltipProvider>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {onRowTextSizeChange && <Select value={rowTextSize}
                  onValueChange={value => onRowTextSizeChange(value as "standard" | "larger")}>
                  <SelectTrigger aria-label="Row Text Size" className="w-auto gap-2 border-primary focus:ring-primary print:hidden">
                    <span>Row Text Size</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50 ww-running-sheet-menu">
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="larger">Larger</SelectItem>
                  </SelectContent>
                </Select>}
                {!readOnly && <Button variant="ghost" size="sm" className="h-8 gap-1.5 print:hidden"
                  onClick={handleUndo} disabled={disabled || undoStack.length === 0}
                  title="Undo the last row edit, clear, or deletion while this page is open">
                  {busy === 'restoring' ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true"/> : <Undo2 size={18} strokeWidth={1.8} aria-hidden="true"/>}
                  {busy === 'restoring' ? 'Restoring…' : 'Undo'}
                </Button>}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowNotes(!showNotes)} title="Notes" aria-label="Toggle notes">
                      <MessageSquareText size={16} strokeWidth={1.8} className={notes ? 'text-primary' : 'text-muted-foreground'} aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="ww-running-sheet-tooltip">Notes</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="More actions" aria-label="More actions" disabled={disabled}>
                          <EllipsisVertical size={16} strokeWidth={1.8} aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent className="ww-running-sheet-tooltip">More actions</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="ww-running-sheet-menu">
                    <DropdownMenuItem onClick={() => setShowClearDialog(true)}>
                      <Eraser size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                      Clear All Fields
                    </DropdownMenuItem>
                    {allowReset && <DropdownMenuItem onClick={() => setShowResetDialog(true)}>
                      <RotateCcw size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                      Reset to Default
                    </DropdownMenuItem>}
                    <DropdownMenuItem onClick={() => setShowDeleteAllDialog(true)} className="text-destructive">
                      <Trash2 size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                      Delete All Rows
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

              </div>
              </TooltipProvider>
            </div>



            {undoError && <p role="alert" className="text-destructive text-sm">Undo could not be saved. Please try Undo again.</p>}
            {showNotes && (
              <div className="mt-3">
                <div className={`rounded-md px-3 py-2 ${styles.notesEditor}`}>
                  <div className={`mb-1 flex items-center gap-2 ${styles.notesHeading} ${styles.controlLabel}`}>
                    <NotebookPen size={17} strokeWidth={1.8} aria-hidden="true" />
                    Notes
                  </div>

                  <Textarea
                    value={notes || ''}
                    onChange={(e) => onNotesChange(e.target.value || null)}
                    placeholder="e.g., special instructions, timing notes, etc."
                    className={`resize-y min-h-[40px] ${styles.bodyText} ${styles.notesTextarea}`}
                    rows={2}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0 px-2 pb-3">
              {/* Tablet-only horizontal scroll wrapper preserves desktop layout */}
              <div className={`max-lg:overflow-x-auto max-lg:[-webkit-overflow-scrolling:touch] lg:overflow-visible ${styles.tableViewport}`}>
                <div className={`max-lg:min-w-[1024px] ${styles.tableCanvas}`}>
                  {/* Column headers */}
                  <div className={`flex items-center gap-2 px-2 py-2 border-b border-border text-muted-foreground uppercase tracking-wide ${styles.columnHeader}`}>
                    <div className="w-6 shrink-0" />
                    <div className="basis-1/5 min-w-0 flex items-center gap-1.5">
                      <Clock3 size={16} strokeWidth={1.8} aria-hidden="true" />
                      Time
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <ListTodo size={16} strokeWidth={1.8} aria-hidden="true" />
                      Event
                    </div>
                    <div className="basis-1/5 min-w-0 flex items-center gap-1.5">
                      <UsersRound size={16} strokeWidth={1.8} aria-hidden="true" />
                      Who
                    </div>

                    <div className="w-16 shrink-0" />
                  </div>

                  {/* Rows */}
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      {items.map(item => (
                        <RunningSheetRow
                          rowTextSize={rowTextSize}
                          key={item.id}
                          item={item}
                          onUpdate={handleUpdateWithUndo}
                          onDuplicate={onDuplicateItem}
                          onDelete={(id) => { const row = items.find(item => item.id === id); if (row) void deleteRows([row]); }}
                          onClearText={(itemId) => handleUpdateWithUndo(itemId, { time_text: '', description_rich: { text: '' }, responsible: '' })}
                          onInsertFromDJMC={onInsertFromDJMC}
                          onUndo={handleUndo}
                          canUndo={undoStack.length > 0}
                          hasDJMCData={hasDJMCData}
                          disabled={disabled}
                          readOnly={readOnly}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>

                  {/* Add Row */}
                  {!readOnly && (
                    <div className="mt-3 flex justify-center">
                      <Button variant="outline" size="sm" onClick={onAddItem} disabled={disabled} className={`gap-1.5 ${styles.greenAction}`} aria-label="Add bottom row">
                        <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
                        Add Bottom Row

                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Clear All Fields Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent className={styles.dialogSurface}>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Fields?</AlertDialogTitle>
            <AlertDialogDescription>
              This will erase the text in every row but keep the rows. Use Undo to restore them while this page is open.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className={styles.destructiveAction} onClick={() => {
              rememberRows(items);
              items.forEach(item => onUpdateItem(item.id, { time_text: '', description_rich: { text: '' }, responsible: '' }));
              setShowClearDialog(false);
            }}>
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className={styles.dialogSurface}>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Default?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current rows with the default template. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className={styles.destructiveAction} onClick={() => { setUndoStack([]); onResetToDefault(); setShowResetDialog(false); }}>
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Delete All Rows Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent className={styles.dialogSurface}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Rows?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all the rows. Use Undo to restore them while this page is open.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                void deleteRows(items);
                setShowDeleteAllDialog(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
