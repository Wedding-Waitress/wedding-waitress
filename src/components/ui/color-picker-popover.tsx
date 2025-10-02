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
  // Black to Gray shades (5 shades)
  ['#000000', '#404040', '#808080', '#B0B0B0', '#D0D0D0'],
  // Red shades (5 shades)
  ['#660000', '#8B0000', '#FF0000', '#FF6B6B', '#FFB5B5'],
  // Orange shades (5 shades)
  ['#994400', '#CC5500', '#FF7F00', '#FFB366', '#FFD9B3'],
  // Yellow shades (5 shades)
  ['#997700', '#CC9900', '#FFFF00', '#FFFF66', '#FFFF99'],
  // Lime shades (5 shades)
  ['#4D9900', '#66CC00', '#7FFF00', '#B2FF66', '#CCFF99'],
  // Green shades (5 shades)
  ['#004D00', '#006400', '#00FF00', '#66FF66', '#B3FFB3'],
  // Spring Green shades (5 shades)
  ['#009950', '#00CC66', '#00FF7F', '#66FFAA', '#99FFCC'],
  // Cyan shades (5 shades)
  ['#009999', '#00CCCC', '#00FFFF', '#66FFFF', '#99FFFF'],
  // Azure shades (5 shades)
  ['#004D99', '#0066CC', '#007FFF', '#66B3FF', '#99CCFF'],
  // Blue shades (5 shades)
  ['#000066', '#000099', '#0000FF', '#6666FF', '#9999FF'],
  // Violet shades (5 shades)
  ['#4D0066', '#660099', '#7F00FF', '#B366FF', '#CC99FF'],
  // Magenta shades (5 shades)
  ['#990099', '#CC00CC', '#FF00FF', '#FF66FF', '#FF99FF'],
  // Rose shades (5 shades)
  ['#99004D', '#CC0066', '#FF007F', '#FF66AA', '#FF99CC'],
  // Gray to White shades (5 shades)
  ['#A0A0A0', '#C0C0C0', '#E0E0E0', '#F0F0F0', '#FFFFFF'],
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
                      className="h-6 w-full rounded border border-border hover:ring-2 hover:ring-primary transition-all relative group"
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
            <div className="grid grid-cols-5 gap-1">
              {STANDARD_COLORS.map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  {row.map((color, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      className="h-6 w-full rounded border border-border hover:ring-2 hover:ring-primary transition-all"
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
