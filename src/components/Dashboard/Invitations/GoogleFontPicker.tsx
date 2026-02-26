import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { WEDDING_FONTS, CATEGORY_LABELS, loadGoogleFont, type FontEntry } from '@/lib/googleFonts';

interface Props {
  value: string;
  onValueChange: (font: string) => void;
}

// Group fonts by category
const groupedFonts = (['serif', 'sans-serif', 'script', 'display'] as const).map(cat => ({
  category: cat,
  label: CATEGORY_LABELS[cat],
  fonts: WEDDING_FONTS.filter(f => f.category === cat),
}));

// Pre-load all font names so they render in their own typeface inside the picker
let fontsPreloaded = false;
function preloadPickerFonts() {
  if (fontsPreloaded) return;
  fontsPreloaded = true;
  WEDDING_FONTS.forEach(f => loadGoogleFont(f.name));
}

export const GoogleFontPicker: React.FC<Props> = ({ value, onValueChange }) => {
  const [open, setOpen] = useState(false);

  // Preload all fonts when the picker first opens
  useEffect(() => {
    if (open) preloadPickerFonts();
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between text-sm font-normal"
        >
          <span style={{ fontFamily: value }} className="truncate">
            {value || 'Select font…'}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search fonts…" className="h-9" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No font found.</CommandEmpty>
            {groupedFonts.map(group => (
              <CommandGroup key={group.category} heading={group.label}>
                {group.fonts.map(font => (
                  <CommandItem
                    key={font.name}
                    value={font.name}
                    onSelect={() => {
                      loadGoogleFont(font.name);
                      onValueChange(font.name);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-3.5 w-3.5',
                        value === font.name ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span style={{ fontFamily: font.name }} className="text-sm">
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
