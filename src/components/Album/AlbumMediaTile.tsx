import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Eye, 
  EyeOff, 
  Download, 
  Trash, 
  Edit, 
  RotateCw, 
  Play,
  Music,
  GripVertical
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProcessingPill } from '@/components/Gallery/ProcessingPill';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MediaItem {
  id: string;
  type: 'photo' | 'video' | 'audio';
  storage_path: string | null;
  thumbnail_path: string | null;
  cloudflare_stream_uid: string | null;
  status: string;
  visibility: 'public' | 'hidden';
}

interface AlbumMediaTileProps {
  item: MediaItem;
  selected: boolean;
  selectMode: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onHide: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onRotate?: () => void;
  onEditCaption: () => void;
}

export const AlbumMediaTile = ({
  item,
  selected,
  selectMode,
  onSelect,
  onApprove,
  onHide,
  onDelete,
  onDownload,
  onRotate,
  onEditCaption,
}: AlbumMediaTileProps) => {
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

  const getThumbnailUrl = () => {
    if (item.type === 'photo' && item.thumbnail_path) {
      const { data } = supabase.storage.from('media-thumbs').getPublicUrl(item.thumbnail_path);
      return data.publicUrl;
    }
    if (item.type === 'video' && item.thumbnail_path) {
      const { data } = supabase.storage.from('media-thumbs').getPublicUrl(item.thumbnail_path);
      return data.publicUrl;
    }
    return null;
  };

  const thumbnailUrl = getThumbnailUrl();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group aspect-square rounded-lg overflow-hidden bg-muted ${
        selectMode ? 'cursor-pointer' : ''
      }`}
      onClick={selectMode ? onSelect : undefined}
    >
      {/* Drag Handle */}
      {!selectMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-move"
        >
          <GripVertical className="w-5 h-5 text-white drop-shadow-lg" />
        </div>
      )}

      {/* Checkbox (select mode) */}
      {selectMode && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox checked={selected} onCheckedChange={onSelect} />
        </div>
      )}

      {/* Status Badges */}
      {item.visibility === 'hidden' && (
        <Badge className="absolute top-2 right-2 z-10 bg-black/70">
          <EyeOff className="w-3 h-3 mr-1" />
          Hidden
        </Badge>
      )}

      {item.status === 'processing' && (
        <div className="absolute top-2 right-2 z-10">
          <ProcessingPill />
        </div>
      )}

      {/* Thumbnail */}
      {item.type === 'photo' && thumbnailUrl && (
        <img src={thumbnailUrl} className="w-full h-full object-cover" alt="" />
      )}

      {item.type === 'video' && (
        <>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
          )}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Play className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
        </>
      )}

      {item.type === 'audio' && (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
          <Music className="w-8 h-8 text-white" />
        </div>
      )}

      {/* Hover Actions (not in select mode) */}
      {!selectMode && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-2 flex-wrap">
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={(e) => {
              e.stopPropagation();
              item.visibility === 'hidden' ? onApprove() : onHide();
            }}
          >
            {item.visibility === 'hidden' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
          >
            <Download className="w-4 h-4" />
          </Button>
          {item.type === 'photo' && onRotate && (
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={(e) => {
                e.stopPropagation();
                onRotate();
              }}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          )}
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={(e) => {
              e.stopPropagation();
              onEditCaption();
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
