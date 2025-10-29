import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { useAlbumMedia, MediaItem } from '@/hooks/useAlbumMedia';
import { useAlbumStats } from '@/hooks/useAlbumStats';
import { AlbumMediaTile } from './AlbumMediaTile';
import { BulkActionsBar } from './BulkActionsBar';
import { EditCaptionModal } from './EditCaptionModal';
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
import { downloadMediaAsZip } from '@/lib/albumZipDownloader';

interface AlbumGalleryTabProps {
  eventId: string;
  eventName: string;
}

export const AlbumGalleryTab = ({ eventId, eventName }: AlbumGalleryTabProps) => {
  const { media, loading, updateVisibility, updateCaption, deleteMedia } = useAlbumMedia(eventId);
  const { stats } = useAlbumStats(eventId);
  const { toast } = useToast();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'photos' | 'videos' | 'audio' | 'hidden' | 'processing'>('all');
  const [selectMode, setSelectMode] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editCaptionOpen, setEditCaptionOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  const filteredMedia = useMemo(() => {
    return media.filter(item => {
      if (filter === 'all') return true;
      if (filter === 'photos') return item.type === 'photo';
      if (filter === 'videos') return item.type === 'video';
      if (filter === 'audio') return item.type === 'audio';
      if (filter === 'hidden') return item.visibility === 'hidden';
      if (filter === 'processing') return item.status === 'processing' || item.status === 'uploading';
      return true;
    });
  }, [media, filter]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const bulkApprove = async () => {
    for (const id of selectedIds) {
      await updateVisibility(id, 'public');
    }
    setSelectedIds(new Set());
  };

  const bulkHide = async () => {
    for (const id of selectedIds) {
      await updateVisibility(id, 'hidden');
    }
    setSelectedIds(new Set());
  };

  const bulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteMedia(id);
    }
    setSelectedIds(new Set());
  };

  const bulkDownload = async () => {
    const selectedMedia = media.filter(m => selectedIds.has(m.id));
    await downloadMediaAsZip(selectedMedia, eventName);
    toast({ title: 'Download started', description: 'Your ZIP file is being prepared' });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredMedia.findIndex(m => m.id === active.id);
    const newIndex = filteredMedia.findIndex(m => m.id === over.id);

    const reordered = arrayMove(filteredMedia, oldIndex, newIndex);

    // Update sort_index in database
    const updates = reordered.map((item, index) => ({
      id: item.id,
      sort_index: index
    }));

    await Promise.all(updates.map(u => 
      supabase.from('media_items').update({ sort_index: u.sort_index }).eq('id', u.id)
    ));

    toast({ title: 'Order updated', description: 'Media reordered successfully' });
  };

  const confirmDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      await deleteMedia(itemToDelete);
      setItemToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const openEditCaption = (item: MediaItem) => {
    setEditingItem(item);
    setEditCaptionOpen(true);
  };

  const handleSaveCaption = async (caption: string) => {
    if (editingItem) {
      await updateCaption(editingItem.id, caption);
    }
  };

  const downloadSingleItem = async (item: MediaItem) => {
    await downloadMediaAsZip([item], eventName);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading media...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {/* Left: Bulk Actions */}
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => {
              setSelectMode(!selectMode);
              if (selectMode) setSelectedIds(new Set());
            }} 
            variant={selectMode ? 'default' : 'outline'}
            size="sm"
          >
            {selectMode ? 'Done' : 'Select'}
          </Button>
          
          {selectMode && (
            <BulkActionsBar 
              count={selectedIds.size}
              onApprove={bulkApprove}
              onHide={bulkHide}
              onDelete={bulkDelete}
              onDownload={bulkDownload}
            />
          )}
        </div>

        {/* Right: Filters */}
        <div className="flex items-center gap-2">
          <Button 
            variant={filter === 'all' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </Button>
          <Button 
            variant={filter === 'photos' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setFilter('photos')}
          >
            Photos ({stats.photos})
          </Button>
          <Button 
            variant={filter === 'videos' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setFilter('videos')}
          >
            Videos ({stats.videos})
          </Button>
          <Button 
            variant={filter === 'audio' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setFilter('audio')}
          >
            Audio ({stats.audio})
          </Button>
          <Button 
            variant={filter === 'hidden' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setFilter('hidden')}
          >
            Hidden ({stats.hidden})
          </Button>
          <Button 
            variant={filter === 'processing' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setFilter('processing')}
          >
            Processing ({stats.pending})
          </Button>
        </div>
      </div>

      {/* Media Grid with Drag & Drop */}
      <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <SortableContext items={filteredMedia.map(m => m.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {filteredMedia.map(item => (
              <AlbumMediaTile
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                selectMode={selectMode}
                onSelect={() => toggleSelect(item.id)}
                onApprove={() => updateVisibility(item.id, 'public')}
                onHide={() => updateVisibility(item.id, 'hidden')}
                onDelete={() => confirmDelete(item.id)}
                onDownload={() => downloadSingleItem(item)}
                onRotate={item.type === 'photo' ? () => toast({ title: 'Rotate coming soon' }) : undefined}
                onEditCaption={() => openEditCaption(item)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {filteredMedia.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No media items found
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The file will be deleted from storage and the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Caption Modal */}
      {editingItem && (
        <EditCaptionModal
          isOpen={editCaptionOpen}
          onClose={() => {
            setEditCaptionOpen(false);
            setEditingItem(null);
          }}
          currentCaption={editingItem.caption}
          onSave={handleSaveCaption}
        />
      )}
    </div>
  );
};
