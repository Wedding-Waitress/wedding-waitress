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
                <div className="border border-input rounded-md bg-background px-3 py-2">
                  <div className="text-sm font-medium text-primary mb-1">Notes for DJ-MC</div>
                  <Textarea
                    value={section.notes || ''}
                    onChange={(e) => onUpdateSection({ notes: e.target.value || null })}
                    placeholder="e.g., special instructions, timing, etc."
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
            {/* Subtitle for sections that have one (e.g., Do Not Play List) */}
            {section.section_subtitle && (
              <p className="text-sm text-muted-foreground mb-3 italic px-2">
                {section.section_subtitle}
              </p>
            )}
            
            {/* Column headers - 3 equal columns */}
            <div className="flex items-center gap-2 px-2 py-2 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <div className="w-6 shrink-0" /> {/* Drag handle space */}
              
              {/* Special header for do_not_play - two columns */}
              {section.section_type === 'do_not_play' ? (
                <>
                  <div className="flex-1 basis-1/3 min-w-0">Song Number</div>
                  <div className="flex-1 basis-2/3 min-w-0">Song Name</div>
                </>
              ) : (
                <>
                  {/* COLUMN 1: Speaker Status for speeches, Event for ceremony, Song Number for cocktail, Bridal Party Intro Order for introductions, Item for others */}
                  {section.section_type === 'speeches' ? (
                    <div className="basis-1/3 min-w-0 shrink-0">Speaker Status & Order</div>
                  ) : section.section_type === 'ceremony' ? (
                    <div className="flex-1 basis-1/3 min-w-0">Event</div>
                  ) : ['cocktail', 'dinner', 'dance', 'traditional'].includes(section.section_type) ? (
                    <div className="flex-1 basis-1/3 min-w-0">Song Number</div>
                  ) : section.section_type === 'introductions' ? (
                    <div className="flex-1 basis-1/3 min-w-0">Bridal Party Intro Order</div>
                  ) : section.section_type === 'main_event' ? (
                    <div className="flex-1 basis-1/3 min-w-0">Event</div>
                  ) : (
                    <div className="flex-1 basis-1/3 min-w-0">Item</div>
                  )}
                  
                  {/* COLUMN 2: Names/Details + Audio for introductions */}
                  {section.section_type === 'introductions' && (
                    <div className="flex-1 basis-1/3 min-w-0 flex items-center gap-2">
                      <span className="flex-1">Names / Details</span>
                      <span className="w-10 text-center shrink-0">Audio</span>
                    </div>
                  )}
                  
                  {/* COLUMN 2: Song Title (Optional) + Audio for main_event */}
                  {section.section_type === 'main_event' && (
                    <div className="flex-1 basis-1/3 min-w-0 flex items-center gap-2">
                      <span className="flex-1">Song Title (Optional)</span>
                      <span className="w-10 text-center shrink-0">Audio</span>
                    </div>
                  )}
                  
                  {/* COLUMN 2: Song Title (Optional) + Audio for ceremony */}
                  {section.section_type === 'ceremony' && (
                    <div className="flex-1 basis-1/3 min-w-0 flex items-center gap-2">
                      <span className="flex-1">Song Title (Optional)</span>
                      <span className="w-10 text-center shrink-0">Audio</span>
                    </div>
                  )}
                  
                  {section.section_type === 'traditional' && (
                    <div className="flex-1 basis-1/3 min-w-0 flex items-center gap-2">
                      <span className="flex-1">Dedication / Details</span>
                      <span className="w-10 text-center shrink-0">Audio</span>
                    </div>
                  )}
                  
                  {/* COLUMN 2: Song Title (Optional) - for cocktail, dinner, dance - 1/3 width */}
                  {(section.section_type === 'cocktail' || section.section_type === 'dinner' || section.section_type === 'dance') && (
                    <div className="flex-1 basis-1/3 min-w-0">Song Title (Optional)</div>
                  )}
                  
                  {/* COLUMN 2 & 3: Speeches - Names/Details + Allowed Time */}
                  {section.section_type === 'speeches' && (
                    <>
                      <div className="flex-1 min-w-0">Speaker Name</div>
                      <div className="w-24 shrink-0 text-center">Time Allowed</div>
                    </>
                  )}
                  
                  {/* COLUMN 3: Music with Link - 1/3 width */}
                  {['ceremony', 'cocktail', 'main_event', 'dinner', 'dance', 'traditional', 'introductions'].includes(section.section_type) && (
                    <div className="flex-1 basis-1/3 min-w-0">Music with Link</div>
                  )}
                  
                  {/* For non-music/non-speeches sections - Names/Details takes remaining space */}
                  {!['ceremony', 'cocktail', 'main_event', 'dinner', 'dance', 'traditional', 'introductions', 'speeches'].includes(section.section_type) && (
                    <div className="flex-1">Names / Details</div>
                  )}
                </>
              )}
              
              <div className="w-16 shrink-0" /> {/* Actions space */}
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
