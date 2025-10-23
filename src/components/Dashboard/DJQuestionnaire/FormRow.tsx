import { Button } from '@/components/ui/button';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SpeechRow } from './RowTypes/SpeechRow';
import { PronunciationRow } from './RowTypes/PronunciationRow';
import { BridalPartyRow } from './RowTypes/BridalPartyRow';
import { SongRow } from './RowTypes/SongRow';
import { CulturalRow } from './RowTypes/CulturalRow';
import { AnnouncementRow } from './RowTypes/AnnouncementRow';
import { DJItem } from '@/types/djQuestionnaire';

interface FormRowProps {
  item: DJItem;
  value: any;
  onChange: (value: any) => void;
  onAddAbove: () => void;
  onAddBelow: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export const FormRow = ({
  item,
  value,
  onChange,
  onAddAbove,
  onAddBelow,
  onDelete,
  canDelete
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

  const renderInput = () => {
    const showMoment = item.meta?.showMoment;

    switch (item.type) {
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
      className="group flex items-center gap-2 p-3 rounded-lg border bg-card hover:shadow-sm transition-all"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-[#6D28D9] transition-colors"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Input Fields */}
      <div className="flex-1">
        {renderInput()}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onAddAbove}
          className="h-8 w-8 text-muted-foreground hover:text-[#6D28D9]"
          title="Add row above"
        >
          <Plus className="w-4 h-4 rotate-180" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onAddBelow}
          className="h-8 w-8 text-muted-foreground hover:text-[#6D28D9]"
          title="Add row below"
        >
          <Plus className="w-4 h-4" />
        </Button>
        {canDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            title="Delete row"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
