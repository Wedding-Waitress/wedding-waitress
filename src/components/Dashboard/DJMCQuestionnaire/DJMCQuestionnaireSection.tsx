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
import { ChevronDown, ChevronRight, Plus, MoreVertical, RotateCcw, MessageSquare, Copy, Trash } from 'lucide-react';
import { DJMCSection, DJMCItem } from '@/types/djMCQuestionnaire';
import { DJMCSectionRow } from './DJMCSectionRow';

interface DJMCQuestionnaireSectionProps {
  section: DJMCSection;
  onUpdateSection: (updates: Partial<DJMCSection>) => void;
  onUpdateItem: (itemId: string, updates: Partial<DJMCItem>) => void;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void;
  onDuplicateItem: (item: DJMCItem) => void;
  onReorderItems: (items: DJMCItem[]) => void;
  onResetToDefault: () => void;
  onDuplicateSection: () => void;
  onDeleteSection: () => void;
  disabled?: boolean;
}

export function DJMCQuestionnaireSection({
  section,
  onUpdateSection,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onDuplicateItem,
  onReorderItems,
  onResetToDefault,
  onDuplicateSection,
  onDeleteSection,
  disabled = false,
}: DJMCQuestionnaireSectionProps) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [localLabel, setLocalLabel] = useState(section.section_label);
  const [showNotes, setShowNotes] = useState(!!section.notes);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = section.items.findIndex(i => i.id === active.id);
    const newIndex = section.items.findIndex(i => i.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(section.items, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        order_index: idx,
      }));
      onReorderItems(newItems);
    }
  }, [section.items, onReorderItems]);

  const handleLabelClick = useCallback(() => {
    if (!disabled) {
      setEditingLabel(true);
    }
  }, [disabled]);

  const handleLabelBlur = useCallback(() => {
    setEditingLabel(false);
    if (localLabel !== section.section_label) {
      onUpdateSection({ section_label: localLabel });
    }
  }, [localLabel, section.section_label, onUpdateSection]);

  const handleLabelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLabelBlur();
    } else if (e.key === 'Escape') {
      setLocalLabel(section.section_label);
      setEditingLabel(false);
    }
  }, [handleLabelBlur, section.section_label]);

  useEffect(() => {
    if (editingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [editingLabel]);

  useEffect(() => {
    setLocalLabel(section.section_label);
  }, [section.section_label]);

  const toggleCollapse = useCallback(() => {
    onUpdateSection({ is_collapsed: !section.is_collapsed });
  }, [section.is_collapsed, onUpdateSection]);

  return (
    <>
      <Card className="shadow-sm border-border">
        <Collapsible open={!section.is_collapsed} onOpenChange={(open) => onUpdateSection({ is_collapsed: !open })}>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    {section.is_collapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
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
                    onClick={handleLabelClick}
                    className="text-lg font-bold text-primary cursor-text hover:bg-muted/50 px-2 py-1 rounded transition-colors"
                  >
                    {section.section_label}
                  </h3>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowNotes(!showNotes)}
                  title="Notes for DJ"
                >
                  <MessageSquare className={`h-4 w-4 ${section.notes ? 'text-primary' : 'text-muted-foreground'}`} />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onDuplicateSection}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Section
                    </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowResetDialog(true)}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Default
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Section
                  </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Notes field */}
            {showNotes && (
              <div className="mt-3">
                <Textarea
                  value={section.notes || ''}
                  onChange={(e) => onUpdateSection({ notes: e.target.value || null })}
                  placeholder="Notes for DJ/MC (e.g., special instructions, timing, etc.)"
                  className="text-sm resize-none"
                  rows={2}
                  disabled={disabled}
                />
              </div>
            )}
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0 px-2 pb-3">
              {/* Column headers */}
              <div className="flex items-center gap-2 px-2 py-2 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <div className="w-6" /> {/* Drag handle space */}
                <div className="flex-1">Item</div>
                
                {/* Names/Details header for ceremony and introductions */}
                {(section.section_type === 'ceremony' || section.section_type === 'introductions') && (
                  <div className="flex-1">Names / Details</div>
                )}
                
                {/* Audio header for ceremony and introductions */}
                {(section.section_type === 'ceremony' || section.section_type === 'introductions') && (
                  <div className="w-20 text-center">Audio</div>
                )}
                
                {/* Music with Link header for music sections */}
                {['ceremony', 'cocktail', 'main_event', 'dinner', 'dance', 'traditional', 'introductions'].includes(section.section_type) && (
                  <div className="flex-1">Music with Link</div>
                )}
                
                {/* Names/Details header for non-music sections (excluding ceremony/introductions) */}
                {!['ceremony', 'cocktail', 'main_event', 'dinner', 'dance', 'traditional', 'introductions'].includes(section.section_type) && (
                  <div className="flex-1">Names / Details</div>
                )}
                
                <div className="w-16" /> {/* Actions space */}
              </div>

              {/* Items */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={section.items.map(i => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {section.items.map((item) => (
                    <DJMCSectionRow
                      key={item.id}
                      item={item}
                      sectionType={section.section_type}
                      onUpdate={(updates) => onUpdateItem(item.id, updates)}
                      onDelete={() => onDeleteItem(item.id)}
                      onDuplicate={() => onDuplicateItem(item)}
                      disabled={disabled}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Add row button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-muted-foreground hover:text-primary"
                onClick={onAddItem}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Reset confirmation dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Section to Default?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the section title and all rows to the original template.
              All your current entries will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onResetToDefault();
                setShowResetDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{section.section_label}" and all its rows.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteSection();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
