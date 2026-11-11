import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Eye, ImageIcon, Loader2, Search, Tag, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/enhanced-button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInvitationGallery, type InvitationGalleryImage } from '@/hooks/useInvitationGallery';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { InvitationBulkUploader } from './InvitationBulkUploader';
import { getInvitationDesignColour } from './invitationTemplateFilters';
import { replaceImageCategories } from './invitationUploadUtils';
import { SignageLibraryImage } from '../Signage/SignageLibraryImage';
import { hasLoadedSignageImage, loadSignageImageSize } from '@/lib/signageImageCache';
import styles from './InvitationGalleryModal.module.css';

interface InvitationGalleryModalProps { open: boolean; onOpenChange: (open: boolean) => void; onSelectImage: (imageUrl: string, measurementUrl?: string, signal?: AbortSignal) => void | boolean | Promise<void | boolean>; }
const messageFor = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const storagePathFromUrl = (url?: string | null) => {
  if (!url) return null;
  const [, path] = url.split('/storage/v1/object/public/invitation-gallery/');
  return path ? decodeURIComponent(path.split('?')[0]) : null;
};

export const InvitationGalleryModal: React.FC<InvitationGalleryModalProps> = ({ open, onOpenChange, onSelectImage }) => {
  const { images, categoriesWithCounts, loading, error, removeImageFromGallery, refetch } = useInvitationGallery();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  const [applying, setApplying] = useState(false);
  const applyRequest = useRef<AbortController | null>(null);
  const [visibleCount, setVisibleCount] = useState(32);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [colour, setColour] = useState('all');
  const [pending, setPending] = useState<InvitationGalleryImage | null>(null);
  const [preview, setPreview] = useState<InvitationGalleryImage | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InvitationGalleryImage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [categorizeTarget, setCategorizeTarget] = useState<InvitationGalleryImage | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const colours = useMemo(() => {
    const counts = new Map<string, number>();
    images.forEach((image) => { const value = getInvitationDesignColour(image); counts.set(value, (counts.get(value) ?? 0) + 1); });
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [images]);
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return images.filter((image) => (!normalized || image.name.toLocaleLowerCase().includes(normalized))
      && (category === 'all' || image.categories.includes(category))
      && (colour === 'all' || getInvitationDesignColour(image) === colour));
  }, [category, colour, images, query]);

  useEffect(() => { if (!open) { setPreview(null); setShowUpload(false); setDeleteTarget(null); setCategorizeTarget(null); } }, [open]);
  useEffect(() => { if (category !== 'all' && !categoriesWithCounts.some((item) => item.name === category)) setCategory('all'); }, [categoriesWithCounts, category]);
  useEffect(() => { if (colour !== 'all' && !colours.some(([name]) => name === colour)) setColour('all'); }, [colour, colours]);

  useEffect(() => {
    if (!open) { applyRequest.current?.abort(); setApplying(false); return; }
    setVisibleCount(Math.min(32, results.length));
    let count = 32;
    const timer = setInterval(() => { count += 32; setVisibleCount(Math.min(count, results.length)); if (count >= results.length) clearInterval(timer); }, 16);
    return () => clearInterval(timer);
  }, [open, results]);
  useEffect(() => () => applyRequest.current?.abort(), []);
  const markPending = (image: InvitationGalleryImage) => {
    applyRequest.current?.abort(); setApplying(false); setPending(image);
    void loadSignageImageSize(image.thumbnail_url || image.image_url).catch(() => undefined);
  };
  const close = () => { applyRequest.current?.abort(); setApplying(false); onOpenChange(false); };
  const selectImage = async (image: InvitationGalleryImage) => {
    applyRequest.current?.abort();
    const controller = new AbortController(); applyRequest.current = controller;
    setPending(image); setApplying(true);
    try {
      const applied = await onSelectImage(image.image_url, hasLoadedSignageImage(image.image_url) ? image.image_url : image.thumbnail_url || image.image_url, controller.signal);
      if (!controller.signal.aborted && applied !== false) onOpenChange(false);
    } catch (cause) {
      if (!controller.signal.aborted) toast({ title: 'Image selection failed', description: messageFor(cause, 'Please try again.'), variant: 'destructive' });
    } finally { if (applyRequest.current === controller) setApplying(false); }
  };
  const saveCategory = async () => {
    if (!categorizeTarget || !categoryName.trim() || savingCategory) return;
    try {
      setSavingCategory(true);
      await replaceImageCategories(categorizeTarget.id, [categoryName.trim()]);
      await refetch();
      toast({ title: 'Category updated', description: categorizeTarget.name });
      setCategorizeTarget(null); setCategoryName('');
    } catch (cause) { toast({ title: 'Update failed', description: messageFor(cause, 'Could not update the category.'), variant: 'destructive' }); }
    finally { setSavingCategory(false); }
  };
  const deleteImage = async () => {
    if (!deleteTarget || deleting) return;
    const target = deleteTarget;
    try {
      setDeleting(true);
      const { error: deleteError } = await supabase.from('invitation_gallery_images' as never).delete().eq('id', target.id);
      if (deleteError) throw deleteError;
      const paths = Array.from(new Set([storagePathFromUrl(target.image_url), storagePathFromUrl(target.thumbnail_url)].filter(Boolean) as string[]));
      if (paths.length) void supabase.storage.from('invitation-gallery').remove(paths);
      removeImageFromGallery(target.id); if (pending?.id === target.id) setPending(null);
      toast({ title: 'Template deleted', description: target.name }); setDeleteTarget(null);
    } catch (cause) { toast({ title: 'Delete failed', description: messageFor(cause, 'Could not delete the template.'), variant: 'destructive' }); }
    finally { setDeleting(false); }
  };

  return <Dialog open={open} onOpenChange={value => value ? onOpenChange(true) : close()}>
    <DialogContent className={styles.libraryDialog} overlayClassName="z-[105] bg-black/70" style={{ zIndex: 110 }}>
      <DialogHeader className={styles.header}>
        <div className={styles.titleLine}><DialogTitle className={styles.title}>Template Library</DialogTitle><span className={styles.total} aria-live="polite" aria-label={`${images.length} total designs`}>{images.length} Total Designs</span></div>
        <DialogDescription className={styles.description}>Choose a Wedding Waitress invitation background to apply to your card design.</DialogDescription>
        {isAdmin && !preview && <Button type="button" size="sm" variant="outline" className={styles.adminButton} onClick={() => setShowUpload((value) => !value)} aria-expanded={showUpload}><Upload className="h-4 w-4" aria-hidden="true" /> Admin Upload</Button>}
      </DialogHeader>
      <div className={styles.content}>
        {isAdmin && showUpload && !preview && <InvitationBulkUploader onAllDone={async () => { await refetch(); }} />}
        {preview ? <div className={styles.preview}><div className="flex h-full w-full min-h-0 flex-col items-center gap-3">
          <div className="flex w-full items-center justify-between gap-3"><Button type="button" variant="outline" className={styles.secondaryButton} onClick={() => setPreview(null)}><ArrowLeft className="h-4 w-4" /> Back to library</Button><strong className="truncate">{preview.name}</strong><Button type="button" className={styles.primaryButton} disabled={applying} onClick={() => void selectImage(preview)}><Check className="h-4 w-4" /> Select</Button></div>
          <div className="relative flex min-h-0 flex-1 w-full items-center justify-center"><SignageLibraryImage key={preview.id} src={preview.image_url} fallback={preview.image_url} placeholder={preview.thumbnail_url} alt={preview.name} className="block max-w-full max-h-full" eager /></div>
        </div></div> : <>
          <div className={styles.toolbar}>
            <div className={styles.searchWrap}><Search className={styles.searchIcon} aria-hidden="true" /><Input className={styles.searchInput} value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search templates by name" placeholder="Search templates by name" /></div>
            <div className="grid grid-cols-2 gap-2 max-[419px]:grid-cols-1">
              <Select value={category} onValueChange={setCategory}><SelectTrigger className={styles.categorySelect} aria-label="Filter templates by category"><SelectValue /></SelectTrigger><SelectContent className={styles.portal} style={{ zIndex: 130 }}><SelectItem value="all">All categories ({images.length})</SelectItem>{categoriesWithCounts.map((item) => <SelectItem key={item.name} value={item.name}>{item.name} ({item.count})</SelectItem>)}</SelectContent></Select>
              <Select value={colour} onValueChange={setColour}><SelectTrigger className={styles.categorySelect} aria-label="Filter templates by colour"><SelectValue /></SelectTrigger><SelectContent className={styles.portal} style={{ zIndex: 130 }}><SelectItem value="all">All colours ({images.length})</SelectItem>{colours.map(([name, count]) => <SelectItem key={name} value={name}>{name} ({count})</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className={styles.viewport} tabIndex={0} aria-label="Invitation templates">
            {loading ? <div className={styles.emptyState}><div><Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin motion-reduce:animate-none" /><p>Loading templates…</p></div></div>
              : error ? <div className={styles.emptyState} role="alert"><div><p>{error}</p><Button onClick={() => void refetch()}>Try again</Button></div></div>
              : results.length === 0 ? <div className={styles.emptyState}><div><ImageIcon className="mx-auto mb-3 h-10 w-10" /><p>{images.length ? 'No templates match your search or filters.' : 'No invitation templates are available.'}</p></div></div>
              : <div className={styles.grid}>{results.slice(0, visibleCount).map((image) => {
                const selected = pending?.id === image.id;
                return <InvitationLibraryCard key={image.id} image={image} selected={selected} applying={applying} isAdmin={isAdmin}
                  categorizeOpen={categorizeTarget?.id === image.id} categoryName={categorizeTarget?.id === image.id ? categoryName : ''}
                  savingCategory={categorizeTarget?.id === image.id && savingCategory} categories={categoriesWithCounts}
                  onSelectImage={onSelectImage} onOpenChange={onOpenChange} toast={toast}
                  renderCard={() => (<article key={image.id} className={cn(styles.card, selected && styles.cardSelected)}>
                  <button type="button" className={styles.imageButton} onClick={() => markPending(image)} aria-pressed={selected}><span className={`${styles.imageFrame} relative`}><SignageLibraryImage key={image.id} src={image.thumbnail_url || image.image_url} fallback={image.image_url} alt={image.name} className="block w-full h-full" /></span></button>
                  <div className={styles.cardName} title={image.name}>{image.name}</div>
                  <div className={styles.cardActions}>
                    <Button type="button" size="sm" variant="outline" className={styles.cardAction} onClick={() => { applyRequest.current?.abort(); setApplying(false); setPreview(image); }}><Eye /> View</Button><Button type="button" size="sm" variant="outline" className={styles.cardAction} disabled={applying} onClick={() => void selectImage(image)}><Check /> Select</Button>
                    {isAdmin && <Popover open={categorizeTarget?.id === image.id} onOpenChange={(value) => { setCategorizeTarget(value ? image : null); setCategoryName(value ? image.categories[0] || image.category || '' : ''); }}><PopoverTrigger asChild><Button type="button" size="sm" variant="outline" className={styles.cardAction}><Tag /> Categorize</Button></PopoverTrigger><PopoverContent className={`${styles.portal} w-72 space-y-3`} style={{ zIndex: 130 }}><label className="text-xs font-semibold" htmlFor={`invitation-category-${image.id}`}>Category</label><Input id={`invitation-category-${image.id}`} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} list="invitation-category-options" onKeyDown={(event) => { if (event.key === 'Enter') void saveCategory(); }} /><datalist id="invitation-category-options">{categoriesWithCounts.map((item) => <option key={item.name} value={item.name} />)}</datalist><div className="flex justify-end gap-2"><Button type="button" size="sm" disabled={!categoryName.trim() || savingCategory} onClick={() => void saveCategory()}>{savingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button><Button type="button" size="sm" variant="outline" onClick={() => setCategorizeTarget(null)}>Cancel</Button></div></PopoverContent></Popover>}
                    {isAdmin && <Button type="button" size="sm" variant="outline" className={cn(styles.cardAction, styles.deleteAction)} onClick={() => setDeleteTarget(image)}><Trash2 /> Delete</Button>}
                  </div>
                </article>)} />;
              })}</div>}
          </div>
        </>}
      </div>
      {applying && <p role="status" className="text-sm px-4">Loading selected image...</p>}
      {!preview && <DialogFooter className={styles.footer}><Button type="button" className={styles.primaryButton} disabled={!pending || applying} onClick={() => { if (pending) void selectImage(pending); }}>{applying && <Loader2 className="h-4 w-4 animate-spin" />} Select Template</Button><Button type="button" variant="outline" className={styles.secondaryButton} onClick={close}>Close</Button></DialogFooter>}
      {deleteTarget && <div className={styles.confirmOverlay}><div className={styles.confirmCard} role="alertdialog" aria-modal="true" aria-labelledby="delete-invitation-template-title"><h3 id="delete-invitation-template-title" className="text-lg font-semibold">Delete this template?</h3><p className="mt-2 text-sm text-muted-foreground">This permanently removes <strong>{deleteTarget.name}</strong> from the invitation catalogue.</p><div className={styles.confirmActions}><Button type="button" variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</Button><Button type="button" disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void deleteImage()}>{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4" /> Delete</>}</Button></div></div></div>}
    </DialogContent>
  </Dialog>;
};

// Render only cards whose visible state or callback scope changed. The callback
// reads those explicit dependencies; image-only cards need not rerender on selection.
const InvitationLibraryCard = React.memo(({ renderCard }: {
 image: InvitationGalleryImage; selected: boolean; applying: boolean; isAdmin: boolean;
 categorizeOpen: boolean; categoryName: string; savingCategory: boolean;
 categories: unknown; onSelectImage: InvitationGalleryModalProps['onSelectImage'];
 onOpenChange: InvitationGalleryModalProps['onOpenChange']; toast: unknown;
 renderCard: () => React.ReactNode;
}) => <>{renderCard()}</>, (before, after) =>
 before.image === after.image && before.selected === after.selected && before.applying === after.applying
 && before.isAdmin === after.isAdmin && before.categorizeOpen === after.categorizeOpen
 && before.categoryName === after.categoryName && before.savingCategory === after.savingCategory
 && before.categories === after.categories && before.onSelectImage === after.onSelectImage
 && before.onOpenChange === after.onOpenChange && before.toast === after.toast);
