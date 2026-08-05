import React, { useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInvitationGallery, InvitationGalleryImage } from '@/hooks/useInvitationGallery';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useToast } from '@/hooks/use-toast';
import { Search, ImageIcon, Loader2, Eye, Check, ArrowLeft, Upload, Layers, FolderOpen, Trash2, Tag, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { InvitationBulkUploader, InvitationBulkUploaderHandle } from './InvitationBulkUploader';
import { MAX_INVITATION_UPLOAD_BYTES, prettifyInvitationFilename, uploadInvitationGalleryImage, replaceImageCategories } from './invitationUploadUtils';
import { supabase } from '@/integrations/supabase/client';
import { GalleryUploadProgress, getReadableUploadError, isSupportedGalleryImage } from '../galleryUploadCore';

const getErrorMessage = (err: unknown, fallback: string) => (
  err instanceof Error ? err.message : fallback
);

interface InvitationGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectImage: (imageUrl: string) => void;
}

export const InvitationGalleryModal: React.FC<InvitationGalleryModalProps> = ({
  open,
  onOpenChange,
  onSelectImage,
}) => {
  const { images, categoriesWithCounts, loading, error, removeImageFromGallery, refetch } = useInvitationGallery();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<InvitationGalleryImage | null>(null);

  // Admin upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('bulk');
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<GalleryUploadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkRef = useRef<InvitationBulkUploaderHandle>(null);
  const bulkDropRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvitationGalleryImage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [categorizeOpenId, setCategorizeOpenId] = useState<string | null>(null);
  const [categorizeMode, setCategorizeMode] = useState<'list' | 'create'>('list');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [assigningCategory, setAssigningCategory] = useState(false);

  const handleAssignCategory = async (image: InvitationGalleryImage, categoryName: string) => {
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
      toast({ title: 'Update failed', description: getErrorMessage(err, 'Could not assign category.'), variant: 'destructive' });
    } finally {
      setAssigningCategory(false);
    }
  };

  const storagePathsForDelete = useMemo(() => {
    if (!deleteTarget) return [];

    const toStoragePath = (url?: string | null) => {
      if (!url) return null;
      const marker = '/storage/v1/object/public/invitation-gallery/';
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
        .from('invitation_gallery_images' as never)
        .delete()
        .eq('id', target.id);
      if (error) throw error;

      if (storagePathsForDelete.length > 0) {
        supabase.storage.from('invitation-gallery').remove(storagePathsForDelete).then(({ error: storageError }) => {
          if (storageError) console.warn('Invitation gallery storage cleanup failed:', storageError);
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

  const handleSelectImage = (image: InvitationGalleryImage) => {
    onSelectImage(image.image_url);
    setPreviewImage(null);
    onOpenChange(false);
  };

  const handleUpload = async () => {
    const finalName = uploadName.trim() || (uploadFile ? prettifyInvitationFilename(uploadFile.name) : '');
    const finalCategory = uploadCategory.trim() || 'Uncategorized';
    if (!uploadFile) {
      toast({ title: 'Choose an image', description: 'Please select a PNG or JPG file first.', variant: 'destructive' });
      return;
    }
    if (!isSupportedGalleryImage(uploadFile)) {
      toast({ title: 'Invalid file type', description: 'Please select a PNG or JPG image.', variant: 'destructive' });
      return;
    }
    if (!finalName) {
      toast({ title: 'Name required', description: 'Give the design a name.', variant: 'destructive' });
      return;
    }
    if (uploadFile.size > MAX_INVITATION_UPLOAD_BYTES) {
      toast({ title: 'File too large', description: 'Maximum 500 MB per upload.', variant: 'destructive' });
      return;
    }
    try {
      setUploading(true);
      setUploadProgress({ phase: 'validating', percent: 0, message: 'Preparing image upload…' });
      const result = await uploadInvitationGalleryImage(uploadFile, finalName, finalCategory, setUploadProgress);
      const masterKB = Math.round(result.masterBytes / 1024);
      const thumbKB = Math.round(result.thumbBytes / 1024);
      toast({
        title: 'Uploaded successfully',
        description: `Original kept for print (${masterKB} KB)${thumbKB ? ` · thumbnail ${thumbKB} KB` : ''}`,
      });
      setUploadName('');
      setUploadCategory('');
      setUploadFile(null);
      setUploadProgress({ phase: 'complete', percent: 100, message: 'Upload complete. Gallery refreshed.' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowUpload(false);
      await refetch();
    } catch (err) {
      console.error('Invitation upload failed', err);
      toast({
        title: 'Upload failed',
        description: getReadableUploadError(err, 'Could not optimize and upload the image.'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) { setPreviewImage(null); setShowUpload(false); } onOpenChange(val); }}>
      <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col bg-white [&~[data-radix-scroll-area-viewport]]:!border-0" style={{ zIndex: 110 }} overlayClassName="z-[105] bg-black/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap max-sm:gap-1">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Invitation Image Gallery
            </div>
            <span className="text-primary font-medium">{images.length} Total Designs</span>

            {showCategoryDropdown && (
              <div className="order-3 sm:order-none sm:mx-auto w-full sm:w-auto sm:min-w-[200px] sm:max-w-[260px]">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-9 text-sm font-normal bg-background">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="z-[120] max-h-[60vh]">
                    <SelectItem value="all">All Categories ({images.length})</SelectItem>
                    {categoriesWithCounts.map(({ name, count }) => (
                      <SelectItem key={name} value={name}>
                        {name} ({count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAdmin && !previewImage && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto mr-12 lv-premium-shade"
                onClick={() => setShowUpload((s) => !s)}
              >
                <Upload className="h-4 w-4 mr-1" strokeWidth={1.8} aria-hidden="true" />
                {showUpload ? 'Close Upload' : 'Admin Upload'}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isAdmin && showUpload && !previewImage && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Button
                size="sm"
                variant={uploadMode === 'bulk' ? 'default' : 'outline'}
                onClick={() => setUploadMode('bulk')}
                className="lv-premium-shade"
              >
                <Layers className="h-4 w-4 mr-1" strokeWidth={1.8} aria-hidden="true" />
                Bulk Upload
              </Button>
              <Button
                size="sm"
                variant={uploadMode === 'single' ? 'default' : 'outline'}
                onClick={() => setUploadMode('single')}
                className="lv-premium-shade"
              >
                <Upload className="h-4 w-4 mr-1" strokeWidth={1.8} aria-hidden="true" />
                Single Upload
              </Button>

              {uploadMode === 'bulk' ? (
                <div
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files?.length) bulkRef.current?.addFiles(e.dataTransfer.files);
                  }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={() => bulkDropRef.current?.click()}
                  className="flex-1 rounded-md border-2 border-dashed border-border bg-background/50 px-3 py-2 text-center cursor-pointer hover:border-primary/60 transition-colors flex items-center justify-center gap-2 min-h-[40px]"
                >
                  <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <p className="text-xs font-medium">Drag & drop or click to select PNG / JPG (≤500 MB)</p>
                  <input
                    ref={bulkDropRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) bulkRef.current?.addFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 rounded-md border-2 border-dashed border-border bg-background/50 px-3 py-2 text-center cursor-pointer hover:border-primary/60 transition-colors flex items-center justify-center gap-2 min-h-[40px]"
                >
                  <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <p className="text-xs font-medium truncate">
                    {uploadFile ? uploadFile.name : 'Click to select a single PNG / JPG (≤500 MB)'}
                  </p>
                </div>
              )}
            </div>

            {uploadMode === 'bulk' ? (
              <InvitationBulkUploader ref={bulkRef} onAllDone={() => { refetch(); }} />
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (file && !isSupportedGalleryImage(file)) {
                      toast({ title: 'Invalid file type', description: 'Please select a PNG or JPG image.', variant: 'destructive' });
                      e.target.value = '';
                      return;
                    }
                    setUploadProgress(null);
                    setUploadFile(file);
                  }}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !uploadFile || (uploadFile?.size ?? 0) > MAX_INVITATION_UPLOAD_BYTES}
                  className="bg-green-600 hover:bg-green-700 text-white lv-premium-shade self-start"
                >
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Optimizing…</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-1" strokeWidth={1.8} aria-hidden="true" />Optimize & Upload</>
                  )}
                </Button>
                {uploading && uploadProgress && (
                  <div className="w-full max-w-md space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${uploadProgress.percent}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{uploadProgress.message}</p>
                  </div>
                )}
                {uploadFile && uploadFile.size > MAX_INVITATION_UPLOAD_BYTES && (
                  <p className="text-xs text-destructive">
                    This file is {(uploadFile.size / 1024 / 1024).toFixed(1)} MB. Maximum allowed is 500 MB — please re-export at a lower quality or smaller scale.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {previewImage ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-3 mb-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewImage(null)} className="lv-premium-shade">
                <ArrowLeft className="h-4 w-4 mr-1" strokeWidth={1.8} aria-hidden="true" />
                Back to Gallery
              </Button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{previewImage.name}</h3>
                <p className="text-xs text-muted-foreground">{previewImage.category}</p>
              </div>
            </div>
            <div className="flex justify-center mb-4">
              <Button className="bg-green-500 hover:bg-green-600 text-white lv-premium-shade" onClick={() => handleSelectImage(previewImage)}>
                <Check className="h-4 w-4 mr-1" strokeWidth={1.8} aria-hidden="true" />
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
            {!isAdmin && (
              <div className="relative w-[75%]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                <Input
                  placeholder="Search images..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}

            <div className="flex-1 flex flex-col min-h-0 mt-2">
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
                <div className="flex-1 min-h-0 overflow-y-scroll overscroll-contain pr-3 custom-scrollbar [scrollbar-gutter:stable]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pr-2 pb-3 max-sm:pb-24">
                    {filteredImages.map(image => (
                      <div
                        key={image.id}
                        className="group relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all bg-muted"
                      >
                        <img
                          src={image.thumbnail_url || image.image_url}
                          alt={image.name}
                          loading="lazy"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <button
                            onClick={() => setPreviewImage(image)}
                            className="flex items-center gap-1.5 bg-white/90 text-foreground rounded-full px-3 py-1.5 text-xs font-medium hover:bg-white transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                            View
                          </button>
                          <button
                            onClick={() => handleSelectImage(image)}
                            className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                            Select
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteTarget(image)}
                              className="flex items-center gap-1.5 bg-red-500 text-white rounded-full px-3 py-1.5 text-xs font-medium hover:bg-red-600 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
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
                                  className="flex items-center gap-1.5 bg-amber-600 text-white rounded-full px-3 py-1.5 text-xs font-medium hover:bg-amber-700 transition-colors"
                                >
                                  <Tag className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
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
                                      <Plus className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
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
                                      placeholder="e.g. Art Deco"
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
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <p className="text-white text-xs font-medium truncate">
                            {image.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t-0 max-sm:sticky max-sm:bottom-0 max-sm:z-50 max-sm:bg-background max-sm:pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <Button className="bg-red-500 hover:bg-red-600 text-white h-8 px-4 lv-premium-shade" onClick={() => onOpenChange(false)}>
                Cancel
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
                <Button variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)} className="lv-premium-shade">
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 lv-premium-shade"
                >
                  {deleting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Deleting…</> : <><Trash2 className="h-4 w-4 mr-1" strokeWidth={1.8} aria-hidden="true" />Delete</>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
