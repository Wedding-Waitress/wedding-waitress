import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { CircleCheck, ImagePlus } from 'lucide-react';
import {
  GALLERY_BACKGROUND_PRESETS,
  GALLERY_BACKGROUND_CATEGORIES,
  type GalleryBackgroundPreset,
} from '@/lib/galleryBackgroundLibrary';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUrl: string | null;
  onApply: (url: string) => void;
}

export const GalleryBackgroundGalleryModal: React.FC<Props> = ({ open, onOpenChange, currentUrl, onApply }) => {
  const [category, setCategory] = useState<string>('All');
  const [selected, setSelected] = useState<string | null>(currentUrl);

  React.useEffect(() => {
    if (open) {
      setSelected(currentUrl);
      setCategory('All');
    }
  }, [open, currentUrl]);

  const categories = useMemo(() => ['All', ...GALLERY_BACKGROUND_CATEGORIES], []);
  const visible: GalleryBackgroundPreset[] = useMemo(
    () => (category === 'All' ? GALLERY_BACKGROUND_PRESETS : GALLERY_BACKGROUND_PRESETS.filter(p => p.category === category)),
    [category],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col bg-white p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 max-lg:px-4">
          <DialogTitle className="flex items-center gap-2 text-lg max-lg:justify-center">
            <ImagePlus className="h-5 w-5 text-[#967A59] shrink-0" strokeWidth={1.8} />
            Background Gallery
          </DialogTitle>
          <DialogDescription className="max-lg:text-center">
            {GALLERY_BACKGROUND_PRESETS.length} premium backgrounds for weddings and events. Pick one, then apply it.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 max-lg:px-4 pb-3 flex flex-wrap gap-2">
          {categories.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                category === c
                  ? 'border-[#967A59] bg-[#967A59] text-white'
                  : 'border-border text-[#6E6E73] hover:border-[#967A59]/50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 max-lg:px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {visible.map(bg => {
              const active = selected === bg.url;
              return (
                <button
                  key={bg.slug}
                  type="button"
                  onClick={() => setSelected(bg.url)}
                  className={`group relative rounded-xl overflow-hidden border-2 text-left transition-all ${
                    active ? 'border-[#967A59] ring-2 ring-[#967A59]/25' : 'border-transparent hover:border-[#967A59]/40'
                  }`}
                  aria-pressed={active}
                >
                  <img src={bg.url} alt={bg.name} loading="lazy" className="w-full h-28 sm:h-32 object-cover" />
                  {active && (
                    <span className="absolute top-2 right-2 rounded-full bg-[#967A59] text-white p-1">
                      <CircleCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </span>
                  )}
                  <div className="px-2.5 py-2 bg-white">
                    <p className="text-xs font-semibold text-[#1D1D1F] truncate">{bg.name}</p>
                    <p className="text-[11px] text-[#6E6E73] truncate">{bg.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t px-5 max-lg:px-4 py-3 flex gap-3 justify-end max-lg:flex-row-reverse">
          <Button
            className="lv-premium-shade h-11 max-lg:flex-1"
            disabled={!selected}
            onClick={() => { if (selected) { onApply(selected); onOpenChange(false); } }}
          >
            Apply Background
          </Button>
          <Button variant="outline" className="lv-premium-shade h-11 max-lg:flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GalleryBackgroundGalleryModal;
