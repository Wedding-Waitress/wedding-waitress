import { columnsFor, cellValue, type DJMCColumn } from '@/lib/djmcCustomColumns';
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
import {
  ChevronDown, ChevronUp, Plus, EllipsisVertical, RotateCcw, MessageSquareText,
  Copy, Trash2, Download, Eraser, NotebookPen, ListMusic, Mic2,
  HeartHandshake, Martini, UsersRound, Disc3, UtensilsCrossed, AudioLines,
  Globe2, Ban, type LucideIcon,
} from 'lucide-react';
import { DJMCSection, DJMCItem } from '@/types/djMCQuestionnaire';
import { DJMCSectionRow } from './DJMCSectionRow';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { deleteDJMCPronunciation } from '@/lib/djmcPronunciationStorage';
import theme from './DJMCQuestionnaireTheme.module.css';

const MUSIC_SECTION_TYPES = ['ceremony', 'cocktail', 'introductions', 'main_event', 'dinner', 'dance', 'traditional', 'do_not_play'];

const SECTION_ICONS: Record<string, LucideIcon> = {
  ceremony: HeartHandshake,
  cocktail: Martini,
  introductions: UsersRound,
  speeches: Mic2,
  main_event: Disc3,
  dinner: UtensilsCrossed,
  dance: AudioLines,
  traditional: Globe2,
  do_not_play: Ban,
};

interface DJMCQuestionnaireSectionProps {
  section: DJMCSection;
  eventId: string;
  shareToken?: string;
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
  onRunUndoable?: (action: () => unknown | Promise<unknown>, recordings?: boolean) => Promise<unknown>;
  disabled?: boolean;
}

export function DJMCQuestionnaireSection({
  section,
  eventId,
  shareToken,
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
  onRunUndoable = async action => action(),
  disabled = false,
}: DJMCQuestionnaireSectionProps) {
  const [editingColumns, setEditingColumns] = useState(false);
  const [draftColumns, setDraftColumns] = useState<DJMCColumn[]>([]);
  const [editingLabel, setEditingLabel] = useState(false);
  const [localLabel, setLocalLabel] = useState(section.section_label);
  const [showNotes, setShowNotes] = useState(!!section.notes);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearSectionDialog, setShowClearSectionDialog] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const removeItemRecording = useCallback(async (item: DJMCItem) => {
    const storedReference = item.pronunciation_audio_path || item.pronunciation_audio_url;
    if (!storedReference) return;
    await deleteDJMCPronunciation(storedReference, {
      eventId,
      itemId: item.id,
      shareToken,
    });
  }, [eventId, shareToken]);

  const reportRecordingCleanupFailure = useCallback((error: unknown) => {
    console.error('Could not remove DJ/MC pronunciation recording:', error);
    toast({
      className: 'ww-djmc-toast',
      title: 'Recording cleanup failed',
      description: 'Nothing was deleted. Please try again.',
      variant: 'destructive',
    });
  }, [toast]);

  const clearItem = useCallback(async (item: DJMCItem) => {
    try {
      await onRunUndoable(async () => {
      await removeItemRecording(item);
      onUpdateItem(item.id, {
        ...(item.custom_values ? {custom_values:{}} : {}),
        value_text: null,
        song_title_artist: null,
        music_url: null,
        duration: null,
        pronunciation_audio_url: null,
        pronunciation_audio_path: null,
      });
      }, true);
    } catch (error) {
      reportRecordingCleanupFailure(error);
    }
  }, [onUpdateItem, removeItemRecording, reportRecordingCleanupFailure, onRunUndoable]);

  const deleteItem = useCallback(async (item: DJMCItem) => {
    try {
      await onRunUndoable(async () => {
      await removeItemRecording(item);
      await onDeleteItem(item.id);
      }, true);
    } catch (error) {
      reportRecordingCleanupFailure(error);
    }
  }, [onDeleteItem, removeItemRecording, reportRecordingCleanupFailure, onRunUndoable]);

  const removeSectionRecordings = useCallback(async () => {
    for (const item of section.items) await removeItemRecording(item);
  }, [removeItemRecording, section.items]);

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
  const SectionIcon = SECTION_ICONS[section.section_type];

  return (
    <>
      <Card className={`${theme.sectionCard} max-lg:overflow-hidden`} data-section-type={section.section_type}>
        <Collapsible open={!section.is_collapsed} onOpenChange={(open) => onUpdateSection({ is_collapsed: !open })}>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
              <div className="flex items-center gap-2 flex-1">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title={section.is_collapsed ? 'Expand section' : 'Collapse section'}
                    aria-label={section.is_collapsed ? 'Expand section' : 'Collapse section'}
                  >
                    {section.is_collapsed ? (
                      <ChevronDown size={16} strokeWidth={1.8} />
                    ) : (
                      <ChevronUp size={16} strokeWidth={1.8} />
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
                    className={`h-8 flex-1 ${theme.sectionHeading}`}
                  />
                ) : (
                  <div className="flex items-center gap-3 max-lg:flex-wrap">
                    <h3
                      onClick={handleLabelClick}
                      className={`text-primary cursor-text hover:bg-muted/50 px-2 py-1 rounded transition-colors inline-flex items-center gap-2 ${theme.sectionHeading}`}
                    >
                      {SectionIcon && (
                        <SectionIcon size={19} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      )}
                      {section.section_label}
                    </h3>
                    {isMusicSection && (
                      <Badge 
                        variant="outline" 
                        className="bg-background text-primary border border-primary px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5"
                      >
                        <ListMusic size={14} strokeWidth={1.8} aria-hidden="true" />
                        Total Song Count: {songCount}
                      </Badge>
                    )}
                    {isSpeechesSection && (
                      <>
                        <Badge 
                          variant="outline" 
                          className="bg-background text-primary border border-primary px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5"
                        >
                          <Mic2 size={14} strokeWidth={1.8} aria-hidden="true" />
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

              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <Button variant="ghost" size="sm" disabled={disabled} onClick={onDuplicateSection}>Duplicate Section</Button>
                <Button variant="ghost" size="sm" disabled={disabled} onClick={()=>setEditingLabel(true)}>Rename Section</Button>
                <Button variant="ghost" size="sm" disabled={disabled || !("custom_columns" in section)} title={"custom_columns" in section ? "Edit column headings and count" : "Available after the database update"} onClick={()=>{setDraftColumns(columnsFor(section));setEditingColumns(true);}}>Edit Columns</Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onDownloadSectionPDF?.()}
                  title="Download Section PDF"
                  aria-label="Download Section PDF"
                >
                  <Download size={16} strokeWidth={1.8} className="text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowNotes(!showNotes)}
                  title="Notes for DJ/MC"
                  aria-label="Notes for DJ/MC"
                >
                  <MessageSquareText size={16} strokeWidth={1.8} className={section.notes ? 'text-primary' : 'text-muted-foreground'} />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="More actions" aria-label="More section actions" disabled={disabled}>
                      <EllipsisVertical size={16} strokeWidth={1.8} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="ww-djmc-portal">
                    <DropdownMenuItem onClick={onDuplicateSection}>
                      <Copy size={18} strokeWidth={1.8} className="mr-2" />
                      Duplicate Section
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowClearSectionDialog(true)}>
                      <Eraser size={18} strokeWidth={1.8} className="mr-2" />
                      Clear Section
                    </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowResetDialog(true)}>
                    <RotateCcw size={18} strokeWidth={1.8} className="mr-2" />
                    Reset to Default
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 size={18} strokeWidth={1.8} className="mr-2" />
                    Delete Section
                  </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>


              </div>
            </div>

            <AlertDialog open={editingColumns} onOpenChange={setEditingColumns}>
        <AlertDialogContent className="ww-djmc-portal">
          <AlertDialogHeader><AlertDialogTitle>Edit Columns</AlertDialogTitle><AlertDialogDescription>Choose the text columns for this section. Existing values are preserved.</AlertDialogDescription></AlertDialogHeader>
          <label>Number of columns<Input type="number" min={1} max={12} value={draftColumns.length} onChange={event=>{
            const count=Math.max(1,Math.min(12,Number(event.target.value)||1));
            setDraftColumns(current=>Array.from({length:count},(_,i)=>current[i]||{id:crypto.randomUUID(),label:`Column ${i+1}`}));
          }}/></label>
          {draftColumns.map((column,index)=><Input key={column.id} aria-label={`Heading ${index+1}`} value={column.label} onChange={event=>setDraftColumns(current=>current.map(c=>c.id===column.id?{...c,label:event.target.value}:c))} />)}
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><Button onClick={()=>{
            const removed=columnsFor(section).filter(c=>!draftColumns.some(d=>d.id===c.id));
            if(removed.some(c=>section.items.some(item=>cellValue(item,c).trim())) && !window.confirm('Hide columns containing information? Their values will be retained, and you can Undo this change.'))return;
            onUpdateSection({custom_columns:draftColumns.map((c,i)=>({...c,label:c.label.trim()||`Column ${i+1}`}))});setEditingColumns(false);
          }}>Save Columns</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Notes field */}
            {showNotes && (
              <div className="mt-3">
                <div className={`${theme.notesPanel} rounded-md px-3 py-2`}>
                  <div className={`${theme.fieldLabel} text-primary mb-1 flex items-center gap-2`}>
                    <NotebookPen size={17} strokeWidth={1.8} aria-hidden="true" />
                    Notes for DJ-MC
                  </div>
                  <Textarea
                    value={section.notes || ''}
                    onChange={(e) => onUpdateSection({ notes: e.target.value || null })}
                    placeholder="e.g., special instructions, timing, etc."
                    className={`${theme.bodyText} resize-y border-0 px-3 py-2 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px]`}
                    rows={2}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 px-2 pb-3 max-sm:px-3 max-sm:pb-4">
            <div className="max-lg:overflow-x-auto max-lg:-mx-2 max-lg:px-2 max-sm:-mx-3 max-sm:px-3 max-sm:[-webkit-overflow-scrolling:touch]">
              <div className={`${theme.mobileRows} max-lg:min-w-[1180px]`}>
            {/* Subtitle for sections that have one (e.g., Do Not Play List) */}
            {section.section_subtitle && (
              <p className={`${theme.bodyText} text-muted-foreground mb-3 italic px-2`}>
                {section.section_subtitle}
              </p>
            )}
            
            {/* Column headers - 3 equal columns */}
            {section.custom_columns ? <div className={`${theme.columnHeader} flex items-center gap-2 px-1 py-2 text-xs font-medium uppercase tracking-wide`}>
              <div className="w-6 shrink-0"/>
              {section.custom_columns.map(column=><input key={column.id} aria-label={`Column heading: ${column.label}`} disabled={disabled}
                className="flex-1 min-w-0 bg-transparent text-center uppercase" defaultValue={column.label}
                onBlur={event=>{const label=event.target.value.trim()||column.label;onUpdateSection({custom_columns:section.custom_columns!.map(c=>c.id===column.id?{...c,label}:c)});}}/>)}
              <div className="w-7 shrink-0"/>
            </div> : <>
            <div className={`${theme.columnHeader} flex items-center gap-2 px-1 py-2 text-xs font-medium uppercase tracking-wide`}>
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
                    <div className="flex-1 basis-1/3 min-w-0 flex items-center gap-2">
                      <div className="flex-1 min-w-0 text-center">Song Title & Artist</div>
                      <div className="w-10 shrink-0 flex flex-col items-center leading-none text-center">
                        <span className="text-[9px] text-muted-foreground">Pronunciation</span>
                        <span>Audio</span>
                      </div>
                    </div>
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

            </>}
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
                      columns={section.custom_columns}
                      item={item}
                      eventId={eventId}
                      shareToken={shareToken}
                      onRunUndoable={onRunUndoable}
                      sectionType={section.section_type}
                      onUpdate={(updates) => onUpdateItem(item.id, updates)}
                      onDelete={() => { void deleteItem(item); }}
                      onDuplicate={() => onDuplicateItem(item)}
                      onClearText={() => { void clearItem(item); }}
                      disabled={disabled}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Add row button */}
              <Button
                variant="ghost"
                size="sm"
                className={`${theme.primaryAction} w-1/2 mx-auto flex mt-2`}
                onClick={onAddItem}
                disabled={disabled}
              >
                <Plus size={15} strokeWidth={1.8} className="mr-[5px]" aria-hidden="true" />
                Add Bottom Row
              </Button>
              </div>
            </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Reset confirmation dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className={theme.dialogSurface}>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Section to Default?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the section title and all rows to the original template.
              Use the top Undo button to recover the previous questionnaire while this page is open.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await onRunUndoable(async () => {
                  await removeSectionRecordings();
                  await onResetToDefault();
                  }, true);
                  setShowResetDialog(false);
                } catch (error) {
                  reportRecordingCleanupFailure(error);
                }
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
        <AlertDialogContent className={theme.dialogSurface}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete this entire section and all its rows. Use the top Undo button to recover it while this page is open.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await onRunUndoable(async () => {
                  await removeSectionRecordings();
                  await onDeleteSection();
                  }, true);
                  setShowDeleteDialog(false);
                } catch (error) {
                  reportRecordingCleanupFailure(error);
                }
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
        <AlertDialogContent className={theme.dialogSurface}>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all text in every row of this section. The rows will remain but all content will be erased. Use the top Undo button to recover it while this page is open.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await onRunUndoable(async () => {
                  await removeSectionRecordings();
                  section.items.forEach(item => {
                    onUpdateItem(item.id, { ...(item.custom_values ? {custom_values:{}} : {}), value_text: null, song_title_artist: null, music_url: null, duration: null, pronunciation_audio_url: null, pronunciation_audio_path: null });
                  });
                  }, true);
                  setShowClearSectionDialog(false);
                } catch (error) {
                  reportRecordingCleanupFailure(error);
                }
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
