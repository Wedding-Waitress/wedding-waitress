import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSignageGallery, SignageGalleryImage } from '@/hooks/useSignageGallery';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useToast } from '@/hooks/use-toast';
import { Search, ImageIcon, Eye, Check, ArrowLeft, Upload, Trash2, Tag, Plus, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SignageBulkUploader } from './SignageBulkUploader';
import { replaceImageCategories } from './signageUploadUtils';
import { supabase } from '@/integrations/supabase/client';
import { previewUrlFor } from '@/lib/imagePipeline';
import styles from './SignageGalleryModal.module.css';

const getErrorMessage = (err: unknown, fallback: string) => (
  err instanceof Error ? err.message : fallback
);

interface SignageGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectImage: (imageUrl: string, printUrl?: string) => void;
}

export const SignageGalleryModal: React.FC<SignageGalleryModalProps> = ({
  open,
  onOpenChange,
  onSelectImage,
}) => {
  const { images, categoriesWithCounts, loading, error, removeImageFromGallery, refetch } = useSignageGallery();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<SignageGalleryImage | null>(null);
  const [selectedImage, setSelectedImage] = useState<SignageGalleryImage | null>(null);

  // Admin upload state
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SignageGalleryImage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [categorizeOpenId, setCategorizeOpenId] = useState<string | null>(null);
  const [categorizeMode, setCategorizeMode] = useState<'list' | 'create'>('list');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [assigningCategory, setAssigningCategory] = useState(false);

  const handleAssignCategory = async (image: SignageGalleryImage, categoryName: string) => {
    const name = categoryName.trim();
    if (!name || assigningCategory) return;
    try {
      setAssigningCategory(true);
      await replaceImageCategories(image.id, [name]);
      toast({ title: 'Category updated', description: `${image.name} → ${name}` });
      setCategorizeOpenId(null);
      setCategorizeMode('list');
      setNewCategoryName('');
      await refetch();
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Could not assign category.', variant: 'destructive' });
    } finally {
      setAssigningCategory(false);
    }
  };

  const storagePathsForDelete = useMemo(() => {
    if (!deleteTarget) return [];

    const toStoragePath = (url?: string | null) => {
      if (!url) return null;
      const marker = '/storage/v1/object/public/signage-gallery/';
      const [, path] = url.split(marker);
      return path ? decodeURIComponent(path.split('?')[0]) : null;
    };

    return Array.from(new Set([
      toStoragePath(deleteTarget.image_url),
      toStoragePath(deleteTarget.thumbnail_url),
    ].filter(Boolean) as string[]));
  }, [deleteTarget]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    try {
      setDeleting(true);
      const { error } = await supabase
        .from('signage_gallery_images' as never)
        .delete()
        .eq('id', target.id);
      if (error) throw error;

      if (storagePathsForDelete.length > 0) {
        supabase.storage.from('signage-gallery').remove(storagePathsForDelete).then(({ error: storageError }) => {
          if (storageError) console.warn('Signage gallery storage cleanup failed:', storageError);
        });
      }

      removeImageFromGallery(target.id);
      toast({ title: 'Image deleted', description: target.name });
      setDeleteTarget(null);
    } catch (err) {
      toast({ title: 'Delete failed', description: getErrorMessage(err, 'Could not delete image.'), variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const showCategoryDropdown = !previewImage && images.length > 0 && categoriesWithCounts.length > 1;
  const effectiveCategory = showCategoryDropdown ? selectedCategory : 'all';

  const filteredImages = images.filter(img => {
    const matchesSearch = img.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = effectiveCategory === 'all' || img.categories.includes(effectiveCategory);
    return matchesSearch && matchesCategory;
  });

  const handleSelectImage = (image: SignageGalleryImage) => {
    // Editor uses the MASTER url (server-resized to ~2400px by useOptimizedPreview).
    // Never the 400px thumbnail — that produced a blurry editor preview.
    onSelectImage(image.preview_url || image.image_url, image.image_url);
    setPreviewImage(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) { setPreviewImage(null); setSelectedImage(null); setShowUpload(false); } onOpenChange(val); }}>
      <DialogContent className={`${styles.libraryDialog} max-h-[95vh] flex flex-col gap-0 bg-white p-0 [&~[data-radix-scroll-area-viewport]]:!border-0`} style={{ zIndex: 110 }} overlayClassName="z-[105] bg-black/95">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 pr-16 sm:px-6 sm:pr-[4.75rem]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-left">
              <ImageIcon className="h-5 w-5 text-primary" />
                Seating Chart Signs Template Library
                <span className="text-primary font-medium">{images.length} Total Designs</span>
              </DialogTitle>
              <DialogDescription className="mt-1 text-left">
                Choose a Wedding Waitress seating chart sign template for your design.
              </DialogDescription>
            </div>
            {isAdmin && !previewImage && (
              <Button
                size="sm"
                variant="outline"
                className="lv-premium-shade shrink-0 self-start"
                onClick={() => setShowUpload((s) => !s)}
              >
                <Upload className="h-4 w-4 mr-1" />
                Admin Upload
              </Button>
            )}
          </div>
        </DialogHeader>

        {isAdmin && showUpload && !previewImage && (
          <div className="mx-4 mt-3 sm:mx-6">
            <SignageBulkUploader onAllDone={() => { void refetch(); }} />
          </div>
        )}

        {previewImage ? (
          <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewImage(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Gallery
              </Button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{previewImage.name}</h3>
                <p className="text-xs text-muted-foreground">{previewImage.category}</p>
              </div>
            </div>
            <div className="flex justify-center mb-4">
              <Button className="bg-green-500 hover:bg-green-600 text-white lv-premium-shade" onClick={() => handleSelectImage(previewImage)}>
                <Check className="h-4 w-4 mr-1" />
                Use This Image
              </Button>
            </div>
            <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-xl border border-border overflow-hidden min-h-[400px]">
              <img
                src={previewImage.image_url}
                alt={previewImage.name}
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="grid shrink-0 grid-cols-1 gap-2 px-4 pt-3 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(210px,280px)]">
              <div className="relative min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates by name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {showCategoryDropdown ? (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-10 text-sm font-normal bg-background">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="z-[120] max-h-[60vh]">
                    <SelectItem value="all">All Categories ({images.length})</SelectItem>
                    {categoriesWithCounts.map(({ name, count }) => (
                      <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : <div />}
            </div>

            <div className="flex-1 flex flex-col min-h-0 px-4 pb-2 pt-3 sm:px-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64 text-destructive">
                  {error}
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
                  <p>No images available yet</p>
                  <p className="text-sm">Gallery images will be added by the admin</p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-2 custom-scrollbar [scrollbar-gutter:stable]">
                  <div className={styles.templateGrid} data-testid="signage-template-grid">
                    {filteredImages.map(image => (
                      <div
                        key={image.id}
                        className={`${styles.templateCard} ${selectedImage?.id === image.id ? styles.templateCardSelected : ''}`}
                      >
                        <div className="aspect-[4/5] overflow-hidden bg-muted">
                          <img
                            src={image.thumbnail_url || image.image_url}
                            alt={image.name}
                            loading="lazy"
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              const img = e.currentTarget;
                              if (image.image_url && img.src !== image.image_url) img.src = image.image_url;
                            }}
                          />
                        </div>
                        <div className="border-t border-border bg-white px-2 py-1.5">
                          <p className="truncate text-xs font-semibold text-foreground" title={image.name}>{image.name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 border-t border-border bg-white p-1.5">
                          <button
                            onClick={() => setPreviewImage(image)}
                            className={styles.cardAction}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                          <button
                            onClick={() => setSelectedImage(image)}
                            className={`${styles.cardAction} ${styles.selectAction}`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Select
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteTarget(image)}
                              className={`${styles.cardAction} ${styles.deleteAction}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          )}
                          {isAdmin && (
                            <Popover
                              open={categorizeOpenId === image.id}
                              onOpenChange={(o) => {
                                setCategorizeOpenId(o ? image.id : null);
                                if (!o) { setCategorizeMode('list'); setNewCategoryName(''); }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className={`${styles.cardAction} ${styles.categorizeAction}`}
                                >
                                  <Tag className="h-3.5 w-3.5" />
                                  Categorize
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-64 p-2 z-[130]"
                                align="center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {categorizeMode === 'list' ? (
                                  <>
                                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                                      Assign to category
                                    </div>
                                    <div
                                      className="max-h-56 overflow-y-auto overscroll-contain"
                                      onWheel={(e) => {
                                        const el = e.currentTarget;
                                        if (el.scrollHeight > el.clientHeight) {
                                          el.scrollTop += e.deltaY;
                                          e.stopPropagation();
                                        }
                                      }}
                                    >
                                      {categoriesWithCounts.length === 0 && (
                                        <div className="px-2 py-2 text-xs text-muted-foreground">No categories yet</div>
                                      )}
                                      {categoriesWithCounts.map(({ name, count }) => {
                                        const isCurrent = image.categories.includes(name);
                                        return (
                                          <button
                                            key={name}
                                            disabled={assigningCategory || isCurrent}
                                            onClick={() => handleAssignCategory(image, name)}
                                            className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-md text-left hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed ${isCurrent ? 'bg-muted/60' : ''}`}
                                          >
                                            <span className="truncate">{name}</span>
                                            <span className="text-xs text-muted-foreground">{count}{isCurrent ? ' ✓' : ''}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <div className="border-t border-border my-1" />
                                    <button
                                      onClick={() => { setCategorizeMode('create'); setNewCategoryName(''); }}
                                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md text-left text-primary hover:bg-muted"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Create New Category
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex flex-col gap-2 p-1">
                                    <label className="text-xs font-semibold text-muted-foreground">New category name</label>
                                    <Input
                                      autoFocus
                                      value={newCategoryName}
                                      onChange={(e) => setNewCategoryName(e.target.value)}
                                      placeholder="e.g. Welcome Sign"
                                      className="h-9"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newCategoryName.trim()) {
                                          e.preventDefault();
                                          handleAssignCategory(image, newCategoryName);
                                        }
                                      }}
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="lv-premium-shade"
                                        disabled={assigningCategory}
                                        onClick={() => { setCategorizeMode('list'); setNewCategoryName(''); }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white lv-premium-shade"
                                        disabled={assigningCategory || !newCategoryName.trim()}
                                        onClick={() => handleAssignCategory(image, newCategoryName)}
                                      >
                                        {assigningCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 z-50 flex shrink-0 justify-end gap-2 border-t border-border bg-white px-4 py-3 sm:px-6">
              <Button variant="outline" className="lv-premium-shade" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                className="bg-green-600 text-white hover:bg-green-700 lv-premium-shade"
                disabled={!selectedImage}
                onClick={() => selectedImage && handleSelectImage(selectedImage)}
              >
                <Check className="mr-1 h-4 w-4" />
                Select Template
              </Button>
            </div>
          </>
        )}

        {deleteTarget && (
          <div
            className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 pointer-events-auto"
          >
            <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">Delete this image?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Once you delete <span className="font-semibold text-foreground">{deleteTarget.name}</span>, you can't go back. This will permanently remove the image from the gallery.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 lv-premium-shade"
              >
                {deleting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Deleting…</> : <><Trash2 className="h-4 w-4 mr-1" />Delete</>}
              </Button>
            </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
