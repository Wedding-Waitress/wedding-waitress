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
  // Black shades
  ['#000000', '#404040', '#808080'], // Black, Dark Gray, Gray
  // Red shades
  ['#8B0000', '#FF0000', '#FF6B6B'], // Dark Red, Red, Light Red
  // Orange shades
  ['#CC5500', '#FF7F00', '#FFB366'], // Dark Orange, Orange, Light Orange
  // Yellow shades
  ['#CC9900', '#FFFF00', '#FFFF99'], // Dark Yellow, Yellow, Light Yellow
  // Lime shades
  ['#66CC00', '#7FFF00', '#CCFF99'], // Dark Lime, Lime, Light Lime
  // Green shades
  ['#006400', '#00FF00', '#66FF66'], // Dark Green, Green, Light Green
  // Spring Green shades
  ['#00CC66', '#00FF7F', '#99FFCC'], // Dark Spring, Spring Green, Light Spring
  // Cyan shades
  ['#00CCCC', '#00FFFF', '#99FFFF'], // Dark Cyan, Cyan, Light Cyan
  // Azure shades
  ['#0066CC', '#007FFF', '#66B3FF'], // Dark Azure, Azure, Light Azure
  // Blue shades
  ['#000099', '#0000FF', '#6666FF'], // Dark Blue, Blue, Light Blue
  // Violet shades
  ['#660099', '#7F00FF', '#CC99FF'], // Dark Violet, Violet, Light Violet
  // Magenta shades
  ['#CC00CC', '#FF00FF', '#FF99FF'], // Dark Magenta, Magenta, Light Magenta
  // Rose shades
  ['#CC0066', '#FF007F', '#FF99CC'], // Dark Rose, Rose, Light Rose
  // White (single color)
  ['#FFFFFF'], // White
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
            <div className="grid grid-cols-3 gap-1">
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
