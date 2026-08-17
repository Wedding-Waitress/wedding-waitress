import React, { useEffect, useMemo, useState } from 'react';
import { Check, Eye, Loader2, Search, Tag, Trash2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { usePhotoBoothTemplateLibrary } from '@/hooks/usePhotoBoothTemplateLibrary';
import { useToast } from '@/hooks/use-toast';
import {
  filterPhotoBoothTemplates,
  PHOTO_BOOTH_BACKGROUND_TEMPLATES,
  type PhotoBoothBackgroundTemplate,
} from '@/lib/photoBoothBackgroundTemplates';
import { naturalPhotoBoothTemplateCompare } from '@/lib/photoBoothTemplateAdmin';
import { cn } from '@/lib/utils';
import { PhotoBoothTemplateAdminUploader } from './PhotoBoothTemplateAdminUploader';
import managementStyles from './photoVideoSharingManagement.module.css';

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  selectedUrl: string | null;
  onSelect: (url: string | null) => void;
  appearance?: 'default' | 'espresso-glass';
}

const uniqueValues = (templates: PhotoBoothBackgroundTemplate[], key: 'category' | 'colour') =>
  Array.from(new Set(templates.map((template) => template[key]))).sort((a, b) => a.localeCompare(b));

export const PhotoBoothTemplateLibraryDialog: React.FC<Props> = ({ open, onOpenChange, selectedUrl, onSelect, appearance = 'default' }) => {
  const isGlass = appearance === 'espresso-glass';
  const { isAdmin } = useIsAdmin();
  const { templates: managedTemplates, loading, error, refetch, remove, update } = usePhotoBoothTemplateLibrary();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [colour, setColour] = useState('all');
  const [pending, setPending] = useState<string | null>(null);
  const [preview, setPreview] = useState<PhotoBoothBackgroundTemplate | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing] = useState<PhotoBoothBackgroundTemplate | null>(null);
  const [editCategory, setEditCategory] = useState('General');
  const [editColour, setEditColour] = useState('Multicolour');

  const templates = useMemo(() => {
    const seen = new Set<string>();
    return [...PHOTO_BOOTH_BACKGROUND_TEMPLATES, ...managedTemplates]
      .filter((template) => !seen.has(template.url) && !!seen.add(template.url))
      .sort(naturalPhotoBoothTemplateCompare);
  }, [managedTemplates]);
  const results = useMemo(() => filterPhotoBoothTemplates(templates, query, category, colour), [templates, query, category, colour]);
  const categories = useMemo(() => uniqueValues(templates, 'category'), [templates]);
  const colours = useMemo(() => uniqueValues(templates, 'colour'), [templates]);
  const categoryCounts = useMemo(() => new Map(categories.map((value) => [value, templates.filter((template) => template.category === value).length])), [categories, templates]);
  const colourCounts = useMemo(() => new Map(colours.map((value) => [value, templates.filter((template) => template.colour === value).length])), [colours, templates]);

  useEffect(() => {
    if (!open) return;
    setPending(templates.find((template) => selectedUrl === template.url || selectedUrl?.endsWith(template.url))?.url ?? null);
    setPreview(null); setEditing(null);
  }, [open, selectedUrl, templates]);

  const select = (template: PhotoBoothBackgroundTemplate) => { setPending(template.url); onSelect(template.url); onOpenChange(false); };
  const beginEdit = (template: PhotoBoothBackgroundTemplate) => { setEditing(template); setEditCategory(template.category); setEditColour(template.colour); };
  const saveEdit = async () => {
    if (!editing) return;
    try { await update(editing.id, editCategory.trim() || 'General', editColour.trim() || 'Multicolour'); setEditing(null); toast({ title: 'Template updated' }); }
    catch (cause) { toast({ title: 'Update failed', description: cause instanceof Error ? cause.message : 'Could not update template.', variant: 'destructive' }); }
  };
  const deleteTemplate = async (template: PhotoBoothBackgroundTemplate) => {
    if (!window.confirm(`Delete “${template.name}” from the shared Photo Booth Template Library?`)) return;
    try {
      await remove(template);
      if (pending === template.url || selectedUrl === template.url) { setPending(null); onSelect(null); }
      toast({ title: 'Template deleted', description: template.name });
    } catch (cause) { toast({ title: 'Delete failed', description: cause instanceof Error ? cause.message : 'Could not delete template.', variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) { setShowUpload(false); setPreview(null); setEditing(null); } onOpenChange(value); }}>
      <DialogContent className={cn('w-[calc(100vw-2rem)] p-0 overflow-hidden', isGlass && managementStyles.guestbookDialog, isGlass && managementStyles.templateLibraryDialog)}>
        <DialogHeader className="px-5 pt-5 pb-3 pr-32 text-left relative">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <DialogTitle className={cn('text-lg font-bold', isGlass && managementStyles.galleryViewHeading)}>Template Library</DialogTitle>
            <span
              aria-live="polite"
              aria-label={`${templates.length} total designs`}
              className="whitespace-nowrap text-sm font-medium text-[#d9b77f] sm:text-base"
            >
              {templates.length} Total Designs
            </span>
          </div>
          <DialogDescription className={cn('text-sm', isGlass && managementStyles.gallerySecondaryText)}>Choose a Wedding Waitress photo-strip background. The guest photos and footer always stay on top.</DialogDescription>
          {isAdmin && !preview && (
            <Button type="button" size="sm" variant="outline" className={cn('absolute right-[4.5rem] top-3.5 lv-premium-shade', managementStyles.templateLibrarySecondaryAction)} onClick={() => setShowUpload((current) => !current)}>
              <Upload className="h-4 w-4 mr-1" /> Admin Upload
            </Button>
          )}
        </DialogHeader>

        {isAdmin && showUpload && !preview && <div className="px-5 pb-3"><PhotoBoothTemplateAdminUploader onComplete={refetch} /></div>}

        {preview ? (
          <div className="px-5 pb-4 min-h-0 flex flex-col items-center">
            <div className="w-full flex items-center justify-between gap-3 mb-3"><Button variant="outline" className={managementStyles.templateLibrarySecondaryAction} onClick={() => setPreview(null)}>Back to library</Button><strong className="text-white truncate">{preview.name}</strong></div>
            <img src={preview.url} alt={preview.name} className="max-h-[58vh] max-w-full object-contain" />
            <Button className={cn('mt-3', managementStyles.galleryViewPrimaryAction)} onClick={() => select(preview)}><Check className="h-4 w-4 mr-1" /> Select</Button>
          </div>
        ) : (
          <>
            <div className="px-5 pb-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
              <div className="relative"><Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4', managementStyles.templateLibrarySearchIcon)} /><Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search templates by name" placeholder="Search templates by name" className={cn('h-11 pl-9 text-base', managementStyles.templateLibraryControl)} /></div>
              <Select value={category} onValueChange={setCategory}><SelectTrigger aria-label="Filter templates by category" className={cn('h-11 sm:w-44', managementStyles.templateLibraryControl)}><SelectValue /></SelectTrigger><SelectContent className={cn(managementStyles.gallerySelectContent, managementStyles.templateLibrarySelectContent)}><SelectItem value="all" className={managementStyles.gallerySelectItem}>All categories ({templates.length})</SelectItem>{categories.map((value) => <SelectItem key={value} value={value} className={managementStyles.gallerySelectItem}>{value} ({categoryCounts.get(value)})</SelectItem>)}</SelectContent></Select>
              <Select value={colour} onValueChange={setColour}><SelectTrigger aria-label="Filter templates by colour" className={cn('h-11 sm:w-44', managementStyles.templateLibraryControl)}><SelectValue /></SelectTrigger><SelectContent className={cn(managementStyles.gallerySelectContent, managementStyles.templateLibrarySelectContent)}><SelectItem value="all" className={managementStyles.gallerySelectItem}>All colours ({templates.length})</SelectItem>{colours.map((value) => <SelectItem key={value} value={value} className={managementStyles.gallerySelectItem}>{value} ({colourCounts.get(value)})</SelectItem>)}</SelectContent></Select>
            </div>
            <div className={cn('px-5 pb-2 max-h-[55vh] overflow-y-auto', managementStyles.templateLibraryScrollArea)}>
              {loading ? <div className={managementStyles.templateLibraryState}><Loader2 className="h-6 w-6 animate-spin" /><span>Loading templates…</span></div> : error ? <p className={managementStyles.templateLibraryState}>{error}</p> : results.length === 0 ? <p className={managementStyles.templateLibraryState}>{templates.length ? 'No templates match your search.' : 'No background templates are currently available.'}</p> : (
                <div className={cn('grid gap-3', managementStyles.templateLibraryGrid)}>
                  {results.map((template) => {
                    const active = pending === template.url;
                    const managed = managedTemplates.some((item) => item.id === template.id);
                    return <article key={template.id} className={cn('group relative rounded-lg overflow-hidden border-2', managementStyles.templateLibraryCard, active && managementStyles.templateLibraryCardSelected)}>
                      <button type="button" className="block w-full text-left" onClick={() => setPending(template.url)} aria-pressed={active}>
                        <img src={template.thumbUrl} alt={template.name} loading="lazy" width={288} height={432} decoding="async" className="w-full aspect-[2/3] object-contain bg-black/30" />
                        <span className={cn('block px-2 py-1.5 text-xs font-medium text-white truncate')}>{template.name}</span>
                      </button>
                      {active && <span className="absolute top-2 right-2 rounded-full bg-[#16A34A] p-1"><Check className="h-3.5 w-3.5 text-white" /></span>}
                      <div className={managementStyles.templateLibraryCardActions}>
                        <button type="button" onClick={() => setPreview(template)}><Eye className="h-4 w-4" /> View</button>
                        <button type="button" onClick={() => select(template)}><Check className="h-4 w-4" /> Select</button>
                        {isAdmin && managed && <button type="button" onClick={() => beginEdit(template)}><Tag className="h-4 w-4" /> Categorize</button>}
                        {isAdmin && managed && <button type="button" onClick={() => void deleteTemplate(template)}><Trash2 className="h-4 w-4" /> Delete</button>}
                      </div>
                    </article>;
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {editing && <div className="px-5 pb-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end"><div><label htmlFor="photo-booth-template-category" className="text-xs text-white">Category</label><Input id="photo-booth-template-category" value={editCategory} onChange={(event) => setEditCategory(event.target.value)} className={managementStyles.templateLibraryControl} /></div><div><label htmlFor="photo-booth-template-colour" className="text-xs text-white">Colour</label><Input id="photo-booth-template-colour" value={editColour} onChange={(event) => setEditColour(event.target.value)} className={managementStyles.templateLibraryControl} /></div><Button onClick={() => void saveEdit()} className={managementStyles.galleryViewPrimaryAction}>Save</Button></div>}

        {!preview && <DialogFooter className={cn('px-5 py-4 border-t gap-2', managementStyles.templateLibraryFooter)}><Button type="button" variant="outline" className={managementStyles.templateLibrarySecondaryAction} onClick={() => onOpenChange(false)}>Close</Button><Button type="button" className={managementStyles.galleryViewPrimaryAction} disabled={!pending} onClick={() => { const template = templates.find((item) => item.url === pending); if (template) select(template); }}>Select Template</Button></DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};

export default PhotoBoothTemplateLibraryDialog;
