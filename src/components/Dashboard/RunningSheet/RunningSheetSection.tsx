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
import { ChevronDown, ChevronRight, Plus, MoreVertical, RotateCcw, MessageSquare, Trash, Download, Eraser } from 'lucide-react';
import { RunningSheetItem } from '@/types/runningSheet';
import { RunningSheetRow } from './RunningSheetRow';

interface RunningSheetSectionProps {
  label: string;
  onLabelChange: (label: string) => void;
  notes: string | null;
  onNotesChange: (notes: string | null) => void;
  items: RunningSheetItem[];
  onUpdateItem: (itemId: string, updates: Partial<RunningSheetItem>) => void;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void;
  onDuplicateItem: (item: RunningSheetItem) => void;
  onReorderItems: (items: RunningSheetItem[]) => void;
  onResetToDefault: () => void;
  onDownloadSectionPDF?: () => void;
  onInsertFromDJMC?: (itemId: string, type: 'ceremony' | 'introductions' | 'speeches', includeSongs: boolean) => void;
  hasDJMCData?: boolean;
  disabled?: boolean;
}

export function RunningSheetSection({
  label,
  onLabelChange,
  notes,
  onNotesChange,
  items,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onDuplicateItem,
  onReorderItems,
  onResetToDefault,
  onDownloadSectionPDF,
  onInsertFromDJMC,
  hasDJMCData = false,
  disabled = false,
}: RunningSheetSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [localLabel, setLocalLabel] = useState(label);
  const [showNotes, setShowNotes] = useState(!!notes);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [undoStack, setUndoStack] = useState<{ itemId: string; snapshot: Partial<RunningSheetItem> }[]>([]);
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

  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      onUpdateItem(last.itemId, last.snapshot);
      return prev.slice(0, -1);
    });
  }, [onUpdateItem]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({ ...item, order_index: idx }));
      onReorderItems(newItems);
    }
  }, [items, onReorderItems]);

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
      <Card className="border-0 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
        <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>

                {editingLabel ? (
                  <Input
                    ref={labelInputRef}
                    value={localLabel}
                    onChange={(e) => setLocalLabel(e.target.value)}
                    onBlur={handleLabelBlur}
                    onKeyDown={handleLabelKeyDown}
                    className="h-8 text-lg font-bold flex-1"
                  />
                ) : (
                  <h3
                    onClick={() => !disabled && setEditingLabel(true)}
                    className="text-lg font-bold text-primary cursor-text hover:bg-muted/50 px-2 py-1 rounded transition-colors"
                  >
                    {label}
                  </h3>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowNotes(!showNotes)} title="Notes">
                  <MessageSquare className={`h-4 w-4 ${notes ? 'text-primary' : 'text-muted-foreground'}`} />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowClearDialog(true)}>
                      <Eraser className="h-4 w-4 mr-2" />
                      Clear All Fields
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowResetDialog(true)}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Default
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowDeleteAllDialog(true)} className="text-destructive">
                      <Trash className="h-4 w-4 mr-2" />
                      Delete All Rows
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

              </div>
            </div>

            {showNotes && (
              <div className="mt-3">
                <div className="border border-input rounded-md bg-background px-3 py-2">
                  <div className="text-sm font-medium text-primary mb-1">Notes</div>
                  <Textarea
                    value={notes || ''}
                    onChange={(e) => onNotesChange(e.target.value || null)}
                    placeholder="e.g., special instructions, timing notes, etc."
                    className="text-sm resize-y border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px]"
                    rows={2}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0 px-2 pb-3">
              {/* Column headers */}
              <div className="flex items-center gap-2 px-2 py-2 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <div className="w-6 shrink-0" />
                <div className="basis-1/5 min-w-0">Time</div>
                <div className="flex-1 min-w-0">Event</div>
                <div className="basis-1/5 min-w-0">Who</div>
                <div className="w-16 shrink-0" />
              </div>

              {/* Rows */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  {items.map(item => (
                    <RunningSheetRow
                      key={item.id}
                      item={item}
                      onUpdate={handleUpdateWithUndo}
                      onDuplicate={onDuplicateItem}
                      onDelete={onDeleteItem}
                      onClearText={(itemId) => handleUpdateWithUndo(itemId, { time_text: '', description_rich: { text: '' }, responsible: '' })}
                      onInsertFromDJMC={onInsertFromDJMC}
                      onUndo={handleUndo}
                      canUndo={undoStack.length > 0}
                      hasDJMCData={hasDJMCData}
                      disabled={disabled}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Add Row */}
              {!disabled && (
                <div className="mt-3 flex justify-center">
                  <Button variant="outline" size="sm" onClick={onAddItem} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Row
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Clear All Fields Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Fields?</AlertDialogTitle>
            <AlertDialogDescription>
              This will erase the text in every row but keep the rows. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Default?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current rows with the default template. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onResetToDefault(); setShowResetDialog(false); }}>
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Delete All Rows Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Rows?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all the rows. Start fresh and manually add rows as you desire. Once deleted, they cannot be retrieved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                items.forEach(item => onDeleteItem(item.id));
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
