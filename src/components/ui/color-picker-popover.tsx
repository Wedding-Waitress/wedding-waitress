import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ColorPickerPopoverProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

// Wedding-themed color palette
const THEME_COLORS = [
  // Whites & Creams
  ['#FFFFFF', '#F8F9FA', '#F1F3F5', '#E9ECEF', '#DEE2E6'],
  ['#FFF8F0', '#FFF0E0', '#FFE8D0', '#FFD8B8', '#FFC8A0'],
  // Soft Pinks & Roses
  ['#FFF0F5', '#FFE0EB', '#FFD0E1', '#FFC0D7', '#FFB0CD'],
  ['#FFE5E5', '#FFD5D5', '#FFC5C5', '#FFB5B5', '#FFA5A5'],
  // Soft Blues
  ['#F0F8FF', '#E0F0FF', '#D0E8FF', '#C0E0FF', '#B0D8FF'],
  ['#E8F4F8', '#D8E8F0', '#C8DCE8', '#B8D0E0', '#A8C4D8'],
  // Golds & Yellows
  ['#FFFEF0', '#FFF8E0', '#FFF0D0', '#FFE8C0', '#FFE0B0'],
  ['#FFE8B8', '#FFD898', '#FFC878', '#FFB858', '#FFA838'],
  // Soft Greens
  ['#F0FFF0', '#E0FFE8', '#D0FFE0', '#C0FFD8', '#B0FFD0'],
  ['#E8F8E8', '#D8F0D8', '#C8E8C8', '#B8E0B8', '#A8D8A8'],
];

const STANDARD_COLORS = [
  '#FF0000', // Red
  '#FF7F00', // Orange
  '#FFFF00', // Yellow
  '#7FFF00', // Lime
  '#00FF00', // Green
  '#00FF7F', // Spring Green
  '#00FFFF', // Cyan
  '#007FFF', // Azure
  '#0000FF', // Blue
  '#7F00FF', // Violet
  '#FF00FF', // Magenta
  '#FF007F', // Rose
];

export function ColorPickerPopover({ value, onChange, className }: ColorPickerPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [hoveredColor, setHoveredColor] = React.useState<string | null>(null);
  const colorInputRef = React.useRef<HTMLInputElement>(null);

  const handleColorSelect = (color: string) => {
    onChange(color);
  };

  const handleMoreColors = () => {
    colorInputRef.current?.click();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start gap-2", className)}
        >
          <div
            className="h-5 w-5 rounded border border-border"
            style={{ backgroundColor: value }}
          />
          <span className="flex-1 text-left">{value.toUpperCase()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        <div className="space-y-3">
          {/* Theme Colors */}
          <div>
            <p className="text-xs font-medium mb-2 text-muted-foreground">Theme Colors</p>
            <div className="grid grid-cols-5 gap-1">
              {THEME_COLORS.map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  {row.map((color, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      className="h-6 w-full rounded border border-border hover:scale-110 transition-transform relative group"
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorSelect(color)}
                      onMouseEnter={() => setHoveredColor(color)}
                      onMouseLeave={() => setHoveredColor(null)}
                      title={color}
                    />
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Standard Colors */}
          <div>
            <p className="text-xs font-medium mb-2 text-muted-foreground">Standard Colors</p>
            <div className="grid grid-cols-12 gap-1">
              {STANDARD_COLORS.map((color, index) => (
                <button
                  key={index}
                  className="h-6 w-full rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  onMouseEnter={() => setHoveredColor(color)}
                  onMouseLeave={() => setHoveredColor(null)}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* More Colors Button */}
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={handleMoreColors}
            >
              More Colors...
            </Button>
            <input
              ref={colorInputRef}
              type="color"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setIsOpen(false);
              }}
              className="hidden"
            />
          </div>

          {/* Hovered Color Display */}
          {hoveredColor && (
            <div className="text-xs text-center text-muted-foreground pt-2 border-t">
              {hoveredColor.toUpperCase()}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
