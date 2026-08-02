import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { BACKGROUND_COLOR_FAMILIES, colorNameForHex } from '@/lib/backgroundColorPalette';

interface Props {
  value: string;
  onSelect: (hex: string) => void;
  /** Shown as the "Selected" state marker on the trigger. */
  active?: boolean;
}

/**
 * Dropdown colour picker for the guest-facing gallery page background.
 * Does not affect buttons, accents, toggles or text colours.
 */
export function GalleryBackgroundColorPicker({ value, onSelect, active }: Props) {
  const [open, setOpen] = useState(false);
  const name = colorNameForHex(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Choose a background colour"
          aria-haspopup="dialog"
          aria-expanded={open}
          className={`flex h-11 w-full items-center gap-3 rounded-md border bg-background px-3 text-left transition-colors ${
            active ? 'border-[#967A59] ring-2 ring-[#967A59]/20' : 'border-border hover:border-[#967A59]/50'
          }`}
        >
          <span
            className="h-6 w-6 shrink-0 rounded-md border border-black/10"
            style={{ backgroundColor: value }}
          />
          <span className="min-w-0 flex-1 truncate text-sm">
            {name ?? 'Custom colour'}
            <span className="ml-2 font-mono text-xs text-muted-foreground">{value.toUpperCase()}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(22rem,calc(100vw-2rem))] max-h-[60vh] overflow-y-auto overflow-x-hidden p-3"
      >
        <div className="space-y-3">
          {BACKGROUND_COLOR_FAMILIES.map((f) => (
            <div key={f.family}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {f.family}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {f.swatches.map((s) => {
                  const selected = s.hex.toUpperCase() === value.toUpperCase();
                  return (
                    <button
                      key={s.hex}
                      type="button"
                      title={`${s.name} · ${s.hex}`}
                      aria-label={`${s.name} ${s.hex}`}
                      aria-pressed={selected}
                      onClick={() => { onSelect(s.hex); setOpen(false); }}
                      className={`relative aspect-square w-full rounded-md border transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#967A59] ${
                        selected ? 'border-[#967A59] ring-2 ring-[#967A59]/30' : 'border-black/10'
                      }`}
                      style={{ backgroundColor: s.hex }}
                    >
                      {selected && (
                        <Check
                          className="absolute inset-0 m-auto h-4 w-4"
                          style={{ color: ['#0B0B0B', '#3A3A3D', '#472C1D', '#5A1A19', '#1B2C45', '#28402A', '#1F4B4A', '#432B58', '#8B4A5E', '#7E3C1C', '#8A6D2B', '#8E7A64', '#6B4B31', '#8E2A26', '#4E6B4A', '#3B7A78', '#3C5A80', '#7A5695'].includes(s.hex) ? '#FFFFFF' : '#1D1D1F' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
