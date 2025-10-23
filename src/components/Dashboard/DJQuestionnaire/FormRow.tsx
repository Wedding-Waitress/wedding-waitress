import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { GripVertical, MoreVertical, ArrowUp, ArrowDown, Plus, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SpeechRow } from './RowTypes/SpeechRow';
import { PronunciationRow } from './RowTypes/PronunciationRow';
import { BridalPartyRow } from './RowTypes/BridalPartyRow';
import { SongRow } from './RowTypes/SongRow';
import { CulturalRow } from './RowTypes/CulturalRow';
import { AnnouncementRow } from './RowTypes/AnnouncementRow';
import { CeremonyMusicRow } from './RowTypes/CeremonyMusicRow';
import { BridalPartyEnhancedRow } from './RowTypes/BridalPartyEnhancedRow';
import { SpeechEnhancedRow } from './RowTypes/SpeechEnhancedRow';
import { MainEventSongRow } from './RowTypes/MainEventSongRow';
import { BackgroundMusicRow } from './RowTypes/BackgroundMusicRow';
import { DanceMusicRow } from './RowTypes/DanceMusicRow';
import { CulturalMusicEnhancedRow } from './RowTypes/CulturalMusicEnhancedRow';
import { DoNotPlayRow } from './RowTypes/DoNotPlayRow';
import { DJItem } from '@/types/djQuestionnaire';

interface FormRowProps {
  item: DJItem;
  value: any;
  onChange: (value: any) => void;
  onAddAbove: () => void;
  onAddBelow: () => void;
  onDelete: () => void;
  canDelete: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  rowIndex: number;
  totalRows: number;
}

export const FormRow = ({
  item,
  value,
  onChange,
  onAddAbove,
  onAddBelow,
  onDelete,
  canDelete,
  onMoveUp,
  onMoveDown,
  rowIndex,
  totalRows
}: FormRowProps) => {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only handle keyboard navigation when focused on the row container
    if (e.target !== e.currentTarget) return;

    switch (e.key) {
      case 'ArrowUp':
        if (rowIndex > 0 && onMoveUp) {
          e.preventDefault();
          onMoveUp();
        }
        break;
      case 'ArrowDown':
        if (rowIndex < totalRows - 1 && onMoveDown) {
          e.preventDefault();
          onMoveDown();
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (canDelete && e.shiftKey) {
          e.preventDefault();
          onDelete();
        }
        break;
    }
  };

  const renderInput = () => {
    const showMoment = item.meta?.showMoment;

    switch (item.type) {
      case 'ceremony_music_row':
        return <CeremonyMusicRow value={value} onChange={onChange} />;
      case 'bridal_party_enhanced_row':
        return <BridalPartyEnhancedRow value={value} onChange={onChange} />;
      case 'speech_enhanced_row':
        return <SpeechEnhancedRow value={value} onChange={onChange} />;
      case 'main_event_song_row':
        return <MainEventSongRow value={value} onChange={onChange} />;
      case 'background_music_row':
        return <BackgroundMusicRow value={value} onChange={onChange} />;
      case 'dance_music_row':
        return <DanceMusicRow value={value} onChange={onChange} />;
      case 'cultural_music_enhanced_row':
        return <CulturalMusicEnhancedRow value={value} onChange={onChange} />;
      case 'do_not_play_row':
        return <DoNotPlayRow value={value} onChange={onChange} />;
      // Legacy types (keep for backward compatibility)
      case 'speech_row':
        return <SpeechRow value={value} onChange={onChange} />;
      case 'pronunciation_row':
        return <PronunciationRow value={value} onChange={onChange} />;
      case 'bridal_party_row':
        return <BridalPartyRow value={value} onChange={onChange} />;
      case 'song_row':
        return <SongRow value={value} onChange={onChange} showMoment={showMoment} />;
      case 'cultural_row':
        return <CulturalRow value={value} onChange={onChange} />;
      case 'announcement_row':
        return <AnnouncementRow value={value} onChange={onChange} />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 p-3 rounded-lg border bg-card hover:shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="listitem"
      aria-label={`Row ${rowIndex + 1} of ${totalRows}`}
    >
      {/* Row Number Badge */}
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted/30 text-muted-foreground text-xs font-medium flex-shrink-0">
        {rowIndex + 1}
      </div>

      {/* Drag Handle - Visible on Hover/Focus */}
      <div
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary flex-shrink-0"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Input Fields */}
      <div className="flex-1 min-w-0">
        {renderInput()}
      </div>

      {/* Kebab Menu */}
      <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              aria-label="Row actions"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onAddAbove}>
              <Plus className="w-4 h-4 mr-2" />
              Add Row Above
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddBelow}>
              <Plus className="w-4 h-4 mr-2" />
              Add Row Below
            </DropdownMenuItem>
            
            {onMoveUp && rowIndex > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onMoveUp}>
                  <ArrowUp className="w-4 h-4 mr-2" />
                  Move Up
                </DropdownMenuItem>
              </>
            )}
            
            {onMoveDown && rowIndex < totalRows - 1 && (
              <DropdownMenuItem onClick={onMoveDown}>
                <ArrowDown className="w-4 h-4 mr-2" />
                Move Down
              </DropdownMenuItem>
            )}
            
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Row
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
