import { useState, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BackgroundImagePositionerProps {
  imageUrl: string;
  xPosition: number;
  yPosition: number;
  scale: number;
  opacity: number;
  onPositionChange: (x: number, y: number) => void;
  onScaleChange: (scale: number) => void;
}

export const BackgroundImagePositioner = ({
  imageUrl,
  xPosition,
  yPosition,
  scale,
  opacity,
  onPositionChange,
  onScaleChange
}: BackgroundImagePositionerProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const CANVAS_WIDTH = 500;
  const CANVAS_HEIGHT = 305; // Maintains 1.636:1 aspect ratio (90mm × 55mm)
  const MIN_SCALE = 50;
  const MAX_SCALE = 200;
  
  // Clamp value between min and max
  const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
  };
  
  // Handle mouse down - start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };
  
  // Handle mouse move - update position while dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    
    // Convert pixel delta to percentage (based on canvas size)
    const percentDeltaX = (deltaX / CANVAS_WIDTH) * 100;
    const percentDeltaY = (deltaY / CANVAS_HEIGHT) * 100;
    
    // Calculate new positions with clamping
    const newX = clamp(xPosition + percentDeltaX, 0, 100);
    const newY = clamp(yPosition + percentDeltaY, 0, 100);
    
    // Round to integers before sending to parent (database expects integers)
    onPositionChange(Math.round(newX), Math.round(newY));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };
  
  // Handle mouse up/leave - stop dragging
  const handleMouseEnd = () => {
    setIsDragging(false);
  };
  
  // Handle scroll wheel - zoom in/out
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    // Determine zoom direction and amount
    const zoomDelta = e.deltaY > 0 ? -5 : 5; // 5% per scroll notch
    const newScale = clamp(scale + zoomDelta, MIN_SCALE, MAX_SCALE);
    
    // Ensure integer value (database expects integers)
    onScaleChange(Math.round(newScale));
  };
  
  // Handle reset zoom button
  const handleResetZoom = () => {
    onScaleChange(100);
  };
  
  return (
    <div className="space-y-2">
      <div
        ref={canvasRef}
        className={`relative border-2 rounded-lg overflow-hidden ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ 
          width: `${CANVAS_WIDTH}px`, 
          height: `${CANVAS_HEIGHT}px`,
          userSelect: 'none',
          borderColor: 'hsl(var(--border))'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseEnd}
        onMouseLeave={handleMouseEnd}
        onWheel={handleWheel}
      >
        {/* Background Image Layer - fills entire canvas, draggable/zoomable */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundPosition: `${xPosition}% ${yPosition}%`,
            backgroundSize: `${scale}%`,
            backgroundRepeat: 'no-repeat',
            opacity: opacity / 100,
            transition: isDragging ? 'none' : 'background-position 0.1s ease-out'
          }}
        />

        {/* Viewport Rectangle - represents the place card dimensions */}
        <div 
          className="absolute border-4 border-purple-500 shadow-2xl pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80%',
            height: '80%',
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Label indicating this is the card area */}
          <div className="absolute -top-8 left-0 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded">
            CARD AREA (90mm × 55mm)
          </div>
        </div>
        
        {/* Drag overlay indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-primary pointer-events-none" />
        )}
        
        {/* Grid reference lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-border opacity-30" />
          <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-border opacity-30" />
        </div>
        
        {/* Zoom percentage indicator (top-right) */}
        <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-mono pointer-events-none">
          {Math.round(scale)}%
        </div>
        
        {/* Reset Zoom button (bottom-right) */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="absolute bottom-2 right-2 h-8 w-8 shadow-lg"
                onClick={handleResetZoom}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset Zoom to 100%</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Instructions text */}
      <p className="text-xs text-muted-foreground">
        <strong>Drag</strong> the image behind the purple frame • <strong>Scroll</strong> to zoom (50-200%) • The purple rectangle shows what will appear on the card • Click <RotateCcw className="inline h-3 w-3" /> to reset zoom
      </p>
    </div>
  );
};
