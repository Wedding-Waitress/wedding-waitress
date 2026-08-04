// Template Library — a searchable, filterable, scrollable gallery of the
// built-in Wedding Waitress photo-strip background templates.
import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Search } from 'lucide-react';
import {
  PHOTO_BOOTH_BACKGROUND_TEMPLATES,
  PHOTO_BOOTH_TEMPLATE_CATEGORIES,
  PHOTO_BOOTH_TEMPLATE_COLOURS,
} from '@/lib/photoBoothBackgroundTemplates';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Currently applied template URL (may be a custom upload — then nothing is preselected) */
  selectedUrl: string | null;
  onSelect: (url: string) => void;
}

export const PhotoBoothTemplateLibraryDialog: React.FC<Props> = ({ open, onOpenChange, selectedUrl, onSelect }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [colour, setColour] = useState('all');
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPending(
        PHOTO_BOOTH_BACKGROUND_TEMPLATES.find((t) => selectedUrl?.endsWith(t.url))?.url ?? null,
      );
    }
  }, [open, selectedUrl]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PHOTO_BOOTH_BACKGROUND_TEMPLATES.filter((t) =>
      (!q || t.name.toLowerCase().includes(q)) &&
      (category === 'all' || t.category === category) &&
      (colour === 'all' || t.colour === colour));
  }, [query, category, colour]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 text-left">
          <DialogTitle className="text-lg font-bold text-[#1D1D1F]">Template Library</DialogTitle>
          <DialogDescription className="text-sm">
            Choose a Wedding Waitress photo-strip background. The guest photos and footer always stay on top.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates by name"
              className="h-11 pl-9 text-base"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-11 sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {PHOTO_BOOTH_TEMPLATE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={colour} onValueChange={setColour}>
            <SelectTrigger className="h-11 sm:w-40"><SelectValue placeholder="Colour" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All colours</SelectItem>
              {PHOTO_BOOTH_TEMPLATE_COLOURS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="px-5 pb-2 max-h-[55vh] overflow-y-auto">
          {results.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No templates match your search.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {results.map((t) => {
                const active = pending === t.url;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPending(t.url)}
                    aria-pressed={active}
                    className={`relative rounded-lg overflow-hidden border-2 text-left transition-shadow ${active ? 'border-[#C8A97E] shadow-md' : 'border-border hover:border-[#967A59]/50'}`}
                  >
                    <img
                      src={t.thumbUrl}
                      alt={t.name}
                      loading="lazy"
                      width={288}
                      height={400}
                      className="w-full aspect-[288/400] object-cover bg-muted"
                    />
                    {active && (
                      <span className="absolute top-2 right-2 rounded-full bg-[#C8A97E] p-1 shadow">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </span>
                    )}
                    <span className="block px-2 py-1.5 text-xs font-medium text-[#1D1D1F] truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-4 border-t bg-muted/30 gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="lv-premium-shade" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            className="lv-premium-shade bg-[#16A34A] hover:bg-[#15803D] text-white"
            disabled={!pending}
            onClick={() => { if (pending) { onSelect(pending); onOpenChange(false); } }}
          >
            Select Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoBoothTemplateLibraryDialog;
