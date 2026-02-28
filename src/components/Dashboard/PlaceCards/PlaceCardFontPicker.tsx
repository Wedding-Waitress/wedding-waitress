import React, { useEffect, useState, useCallback } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { loadGoogleFont } from '@/lib/googleFonts';
import {
  GOOGLE_FONTS_DEDUPED,
  GOOGLE_FONT_CATEGORIES,
  GOOGLE_FONT_CATEGORY_LABELS,
  type GoogleFontEntry,
} from '@/lib/googleFontsFullList';

// Premium fonts that ship with the app (custom, not from Google Fonts)
const PREMIUM_FONTS = [
  'Beauty Mountains',
  'Valentine Baby',
  'Amsterdam',
  'Back to Black Demo',
  'Flagfies',
  'Sphere Memory',
  'ET Emilia Grace Demo',
  'Grained',
];

interface PlaceCardFontPickerProps {
  value: string;
  onValueChange: (font: string) => void;
  label?: string;
}

// Group Google Fonts by category
const groupedGoogleFonts = GOOGLE_FONT_CATEGORIES.map((cat) => ({
  category: cat,
  label: GOOGLE_FONT_CATEGORY_LABELS[cat],
  fonts: GOOGLE_FONTS_DEDUPED.filter((f) => f.category === cat),
}));

// Track loaded preview fonts so we only inject CSS once
const previewLoaded = new Set<string>();
function loadPreviewFont(name: string) {
  if (previewLoaded.has(name)) return;
  previewLoaded.add(name);
  loadGoogleFont(name);
}

export const PlaceCardFontPicker: React.FC<PlaceCardFontPickerProps> = ({
  value,
  onValueChange,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Load the currently-selected font so the trigger renders correctly
  useEffect(() => {
    if (value && !PREMIUM_FONTS.includes(value)) {
      loadPreviewFont(value);
    }
  }, [value]);

  // When picker opens, load fonts for visible items
  const loadVisibleFonts = useCallback(
    (fonts: GoogleFontEntry[]) => {
      // Only load first 15 per group to keep network light
      fonts.slice(0, 15).forEach((f) => loadPreviewFont(f.name));
    },
    []
  );

  useEffect(() => {
    if (open) {
      // Preload a small batch from each category
      groupedGoogleFonts.forEach((g) => loadVisibleFonts(g.fonts));
    }
  }, [open, loadVisibleFonts]);

  const handleSelect = (fontName: string) => {
    if (!PREMIUM_FONTS.includes(fontName)) {
      loadPreviewFont(fontName);
    }
    onValueChange(fontName);
    setOpen(false);
  };

  const isPremium = PREMIUM_FONTS.includes(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between text-sm font-normal"
        >
          <span
            style={{ fontFamily: value }}
            className="truncate"
          >
            {value || 'Select font…'}
            {isPremium ? ' 💎' : ''}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder="Search 1,500+ fonts…"
            className="h-9"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>No font found.</CommandEmpty>

            {/* Premium fonts */}
            <CommandGroup heading="Premium 💎">
              {PREMIUM_FONTS.map((name) => (
                <CommandItem
                  key={`premium-${name}`}
                  value={name}
                  onSelect={() => handleSelect(name)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-3.5 w-3.5',
                      value === name ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span style={{ fontFamily: name }} className="text-sm">
                    {name} 💎
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>

            {/* Google Fonts by category */}
            {groupedGoogleFonts.map((group) => (
              <CommandGroup key={group.category} heading={group.label}>
                {group.fonts.map((font) => (
                  <CommandItem
                    key={`${group.category}-${font.name}`}
                    value={font.name}
                    onSelect={() => handleSelect(font.name)}
                    onMouseEnter={() => loadPreviewFont(font.name)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-3.5 w-3.5',
                        value === font.name ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span
                      style={{ fontFamily: font.name }}
                      className="text-sm"
                    >
                      {font.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
