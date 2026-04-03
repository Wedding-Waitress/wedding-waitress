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
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
import { ChevronDown, ChevronRight, Plus, MoreVertical, RotateCcw, MessageSquare, Copy, Trash, Download, Eraser } from 'lucide-react';
import { DJMCSection, DJMCItem } from '@/types/djMCQuestionnaire';
import { DJMCSectionRow } from './DJMCSectionRow';
import { Badge } from '@/components/ui/badge';

const MUSIC_SECTION_TYPES = ['ceremony', 'cocktail', 'introductions', 'main_event', 'dinner', 'dance', 'traditional', 'do_not_play'];

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
  onDownloadSectionPDF?: () => void;
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
  onDownloadSectionPDF,
  disabled = false,
}: DJMCQuestionnaireSectionProps) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [localLabel, setLocalLabel] = useState(section.section_label);
  const [showNotes, setShowNotes] = useState(!!section.notes);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearSectionDialog, setShowClearSectionDialog] = useState(false);
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

  // Calculate song count for music sections (only count rows with actual content)
  const songCount = useMemo(() => {
    if (!MUSIC_SECTION_TYPES.includes(section.section_type)) return 0;
    
    // Do Not Play List uses song names (value_text), not music URLs
    if (section.section_type === 'do_not_play') {
      return section.items.filter(item => 
        item.value_text && item.value_text.trim() !== ''
      ).length;
    }
    
    // All other music sections count music URLs
    return section.items.filter(item => 
      item.music_url && item.music_url.trim() !== ''
    ).length;
  }, [section.items, section.section_type]);

  // Calculate speaker count for speeches section (only count rows with content)
  const speakerCount = useMemo(() => {
    if (section.section_type !== 'speeches') return 0;
    
    // Count rows where user has entered an actual speaker name in the "SPEAKER NAME" column
    return section.items.filter(item => 
      item.value_text && item.value_text.trim() !== ''
    ).length;
  }, [section.items, section.section_type]);

  // Calculate total time for speeches section
  const totalSpeechTime = useMemo(() => {
    if (section.section_type !== 'speeches') return 0;
    
    return section.items.reduce((total, item) => {
      if (!item.duration) return total;
      
      // Parse the duration string to extract minutes
      // Handles formats like "5 min", "5", "10 min", etc.
      const match = item.duration.match(/(\d+)/);
      if (match) {
        return total + parseInt(match[1], 10);
      }
      return total;
    }, 0);
  }, [section.items, section.section_type]);

  const isMusicSection = MUSIC_SECTION_TYPES.includes(section.section_type);
  const isSpeechesSection = section.section_type === 'speeches';

  return (
    <>
      <Card className="border-border shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
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
                  <div className="flex items-center gap-3">
                    <h3
                      onClick={handleLabelClick}
                      className="text-lg font-bold text-primary cursor-text hover:bg-muted/50 px-2 py-1 rounded transition-colors"
                    >
                      {section.section_label}
                    </h3>
                    {isMusicSection && (
                      <Badge 
                        variant="outline" 
                        className="bg-background text-primary border border-primary px-3 py-1 text-xs font-medium"
                      >
                        Total Song Count: {songCount}
                      </Badge>
                    )}
                    {isSpeechesSection && (
                      <>
                        <Badge 
                          variant="outline" 
                          className="bg-background text-primary border border-primary px-3 py-1 text-xs font-medium"
                        >
                          Total Speakers: {speakerCount}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="bg-background text-primary border border-primary px-3 py-1 text-xs font-medium"
                        >
                          Total Time Allocated for Speeches: {totalSpeechTime} min
                        </Badge>
                      </>
                    )}
                  </div>
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
                    <DropdownMenuItem onClick={() => setShowClearSectionDialog(true)}>
                      <Eraser className="h-4 w-4 mr-2" />
                      Clear Section
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

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onDownloadSectionPDF?.()}
                  title="Download Section PDF"
                >
                  <Download className="h-4 w-4 text-muted-foreground" />
                </Button>
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
            <div className="flex items-center gap-2 px-1 py-2 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <div className="w-6 shrink-0" /> {/* Drag handle space */}
              
              {/* Special header for do_not_play - two columns */}
              {section.section_type === 'do_not_play' ? (
                <>
                  <div className="flex-1 basis-1/3 min-w-0 text-center">Song Number</div>
                  <div className="flex-1 basis-2/3 min-w-0 text-center">Song Name</div>
                </>
              ) : (
                <>
                  {/* COLUMN 1: Speaker Status for speeches, Event for ceremony, Song Number for cocktail, Bridal Party Intro Order for introductions, Item for others */}
                  {section.section_type === 'speeches' ? (
                    <div className="basis-[31%] min-w-0 shrink-0 text-center">Speaker Status & Order</div>
                  ) : section.section_type === 'ceremony' ? (
                    <div className="flex-1 basis-1/4 min-w-0 text-center">Event</div>
                  ) : ['cocktail', 'dinner', 'dance'].includes(section.section_type) ? (
                    <div className="flex-1 basis-1/3 min-w-0 text-center">Song Number</div>
                  ) : section.section_type === 'traditional' ? (
                    <div className="flex-1 basis-1/4 min-w-0 text-center">Song Number</div>
                  ) : section.section_type === 'introductions' ? (
                    <div className="flex-1 basis-1/4 min-w-0 text-center">Bridal Party Intro Order</div>
                  ) : section.section_type === 'main_event' ? (
                    <div className="flex-1 basis-1/3 min-w-0 text-center">Event</div>
                  ) : (
                    <div className="flex-1 basis-1/3 min-w-0 text-center">Item</div>
                  )}
                  
                   {/* COLUMNS 2, 3 for introductions: Names + Audio | Song Title & Artist */}
                   {section.section_type === 'introductions' && (
                     <>
                       <div className="flex-1 basis-1/4 min-w-0 flex items-center gap-2">
                         <div className="flex-1 min-w-0 text-center">(names & order)</div>
                         <div className="w-10 shrink-0 flex flex-col items-center leading-none text-center">
                           <span className="text-[9px] text-muted-foreground">Pronunciation</span>
                           <span>Audio</span>
                         </div>
                       </div>
                       <div className="flex-1 basis-1/4 min-w-0 text-center">Song Title & Artist</div>
                     </>
                   )}
                  
                  {/* COLUMN 2: Song Title & Artist (Optional) + Audio for main_event */}
                  {section.section_type === 'main_event' && (
                    <>
                      <div className="flex-1 basis-1/3 min-w-0 text-center">Song Title & Artist</div>
                      <div className="w-10 shrink-0 flex flex-col items-center leading-none text-center">
                        <span className="text-[9px] text-muted-foreground">Pronunciation</span>
                        <span>Audio</span>
                      </div>
                    </>
                  )}
                  
                   {/* COLUMNS 2, 3 for ceremony: Names / Info + Audio | Song Title & Artist */}
                   {section.section_type === 'ceremony' && (
                     <>
                       <div className="flex-1 basis-1/4 min-w-0 flex items-center gap-2">
                         <div className="flex-1 min-w-0 text-center">Names / Info</div>
                         <div className="w-10 shrink-0 flex flex-col items-center leading-none text-center">
                           <span className="text-[9px] text-muted-foreground">Pronunciation</span>
                           <span>Audio</span>
                         </div>
                       </div>
                       <div className="flex-1 basis-1/4 min-w-0 text-center">Song Title & Artist</div>
                     </>
                   )}
                  
                  {/* COLUMNS 2, 3, 4 for traditional: Dedication / Details | Song Title & Artist + Audio | Music with Link */}
                  {section.section_type === 'traditional' && (
                    <>
                      <div className="flex-1 basis-1/4 min-w-0 text-center">Dedication / Details</div>
                      <div className="flex-1 basis-1/4 min-w-0 text-center">Song Title & Artist</div>
                      <div className="w-10 shrink-0 flex flex-col items-center leading-none text-center">
                        <span className="text-[9px] text-muted-foreground">Pronunciation</span>
                        <span>Audio</span>
                      </div>
                    </>
                  )}
                  
                  {/* COLUMN 2: Song Title & Artist (Optional) - for cocktail, dinner, dance - 1/3 width */}
                  {(section.section_type === 'cocktail' || section.section_type === 'dinner' || section.section_type === 'dance') && (
                    <div className="flex-1 basis-1/3 min-w-0 text-center">Song Title & Artist</div>
                  )}
                  
                  {/* COLUMN 2, 3 & 4: Speeches - Speaker Name + Pronunciation Audio + Time Allowed */}
                  {section.section_type === 'speeches' && (
                    <>
                      <div className="flex-1 min-w-0 text-center">Speaker Name</div>
                      <div className="w-10 shrink-0 flex flex-col items-center leading-none text-center">
                        <span className="text-[9px] text-muted-foreground">Pronunciation</span>
                        <span>Audio</span>
                      </div>
                      <div className="w-24 shrink-0 flex flex-col items-center leading-none text-center">
                        <span>Time</span>
                        <span>Allowed</span>
                      </div>
                    </>
                  )}
                  
                  {/* COLUMN 3/4: Music with Link - 1/3 width (1/4 for introductions, ceremony, traditional) */}
                  {['cocktail', 'main_event', 'dinner', 'dance'].includes(section.section_type) && (
                    <div className="flex-1 basis-1/3 min-w-0 text-center">Music with Link</div>
                  )}
                  {(section.section_type === 'introductions' || section.section_type === 'ceremony' || section.section_type === 'traditional') && (
                    <div className="flex-1 basis-1/4 min-w-0 text-center">Music with Link</div>
                  )}
                  
                  {/* For non-music/non-speeches sections - Names/Details takes remaining space */}
                  {!['ceremony', 'cocktail', 'main_event', 'dinner', 'dance', 'traditional', 'introductions', 'speeches'].includes(section.section_type) && (
                    <div className="flex-1 text-center">Names / Details</div>
                  )}
                </>
              )}
              
              <div className="w-7 shrink-0" /> {/* Actions space - matches row's 28px action button */}
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
                      onClearText={() => onUpdateItem(item.id, { value_text: null, song_title_artist: null, music_url: null, duration: null, pronunciation_audio_url: null })}
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
              This will delete this entire section and all its rows. Once deleted, it cannot be retrieved.
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

      {/* Clear Section confirmation dialog */}
      <AlertDialog open={showClearSectionDialog} onOpenChange={setShowClearSectionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all text in every row of this section. The rows will remain but all content will be erased. Once cleared, it cannot be retrieved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                section.items.forEach(item => {
                  onUpdateItem(item.id, { value_text: null, song_title_artist: null, music_url: null, duration: null, pronunciation_audio_url: null });
                });
                setShowClearSectionDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
