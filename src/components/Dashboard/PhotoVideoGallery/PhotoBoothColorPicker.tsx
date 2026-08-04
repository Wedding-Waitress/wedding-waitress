// Grouped colour palette dropdown for the Photo Booth strip background.
import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/enhanced-button';
import { Check, ChevronDown } from 'lucide-react';

export interface ColorFamily {
  name: string;
  shades: string[];
}

export const PHOTO_BOOTH_COLOR_FAMILIES: ColorFamily[] = [
  { name: 'Browns', shades: ['#3E2A1E', '#5B4130', '#7A5C40', '#967A59', '#B79A78', '#D8C3A5'] },
  { name: 'Neutrals', shades: ['#000000', '#1D1D1F', '#3F3F46', '#6E6E73', '#A1A1AA', '#D4D4D8', '#F5F5F4', '#FFFFFF'] },
  { name: 'Reds', shades: ['#4C0519', '#7F1D1D', '#B91C1C', '#DC2626', '#F87171', '#FECACA'] },
  { name: 'Pinks', shades: ['#831843', '#BE185D', '#DB2777', '#F472B6', '#F9A8D4', '#FCE7F3'] },
  { name: 'Oranges', shades: ['#7C2D12', '#C2410C', '#EA580C', '#F97316', '#FDBA74', '#FFEDD5'] },
  { name: 'Yellows & Golds', shades: ['#713F12', '#A16207', '#CA8A04', '#C8A97E', '#E7C873', '#FEF3C7'] },
  { name: 'Greens', shades: ['#052E16', '#14532D', '#166534', '#16A34A', '#86EFAC', '#DCFCE7'] },
  { name: 'Teals', shades: ['#042F2E', '#115E59', '#0D9488', '#2DD4BF', '#99F6E4', '#CCFBF1'] },
  { name: 'Blues', shades: ['#0C2340', '#1E3A8A', '#1D4ED8', '#3B82F6', '#93C5FD', '#DBEAFE'] },
  { name: 'Purples', shades: ['#2E1065', '#5B21B6', '#7C3AED', '#A78BFA', '#C4B5FD', '#EDE9FE'] },
  { name: 'Pastels', shades: ['#FBF7F0', '#FDE8E8', '#FDF2D0', '#E4F5E7', '#E0EDFB', '#EDE4F7'] },
];

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

export const PhotoBoothColorPicker: React.FC<Props> = ({ value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="lv-premium-shade h-11 w-full justify-between font-normal">
          <span className="flex items-center gap-2 min-w-0">
            <span className="h-5 w-5 rounded border border-border shrink-0" style={{ backgroundColor: value }} />
            <span className="truncate">{value.toUpperCase()}</span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-60 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,320px)] p-3 max-h-[60vh] overflow-y-auto">
        <div className="space-y-3">
          {PHOTO_BOOTH_COLOR_FAMILIES.map(fam => (
            <div key={fam.name}>
              <p className="text-xs font-semibold text-[#1D1D1F] mb-1.5">{fam.name}</p>
              <div className="grid grid-cols-8 gap-1.5">
                {fam.shades.map(hex => (
                  <button
                    key={hex}
                    type="button"
                    title={hex}
                    aria-label={`${fam.name} ${hex}`}
                    onClick={() => { onChange(hex); setOpen(false); }}
                    className="h-7 w-7 rounded-md border border-border flex items-center justify-center"
                    style={{ backgroundColor: hex }}
                  >
                    {value.toLowerCase() === hex.toLowerCase() && (
                      <Check className="h-3.5 w-3.5" style={{ color: hex === '#FFFFFF' || hex.startsWith('#F') ? '#1D1D1F' : '#FFFFFF' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-1 border-t border-border">
            <label className="text-xs font-semibold text-[#1D1D1F]">Custom colour</label>
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className="mt-1.5 h-9 w-full rounded-md border border-border bg-background"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PhotoBoothColorPicker;
