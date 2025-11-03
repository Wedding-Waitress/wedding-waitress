import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Rect, Circle, Line, Text, Object as FabricObject } from 'fabric';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Grid3X3 } from 'lucide-react';

interface FloorPlanCanvasProps {
  canvasData?: any;
  settings: {
    width: number;
    height: number;
    gridSize: number;
    showGrid: boolean;
    snapToGrid: boolean;
    measurementUnit: 'feet' | 'meters';
  };
  currentTool: string;
  onCanvasChange?: (canvasData: any) => void;
  onObjectSelected?: (object: FabricObject | null) => void;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  canvasData,
  settings,
  currentTool,
  onCanvasChange,
  onObjectSelected,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState(1);

  // Initialize fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: settings.width,
      height: settings.height,
      backgroundColor: '#ffffff',
      selection: currentTool === 'select',
    });

    // Set up grid if enabled
    if (settings.showGrid) {
      drawGrid(canvas, settings.gridSize);
    }

    // Set up snap to grid
    if (settings.snapToGrid) {
      setupSnapToGrid(canvas, settings.gridSize);
    }

    // Handle object selection
    canvas.on('selection:created', (e) => {
      onObjectSelected?.(e.selected?.[0] || null);
    });

    canvas.on('selection:updated', (e) => {
      onObjectSelected?.(e.selected?.[0] || null);
    });

    canvas.on('selection:cleared', () => {
      onObjectSelected?.(null);
    });

    // Handle canvas changes
    canvas.on('object:modified', () => {
      onCanvasChange?.(canvas.toJSON());
    });

    canvas.on('object:added', () => {
      onCanvasChange?.(canvas.toJSON());
    });

    canvas.on('object:removed', () => {
      onCanvasChange?.(canvas.toJSON());
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [settings.width, settings.height]);

  // Update canvas settings when they change
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.selection = currentTool === 'select';
    fabricCanvas.defaultCursor = currentTool === 'select' ? 'default' : 'crosshair';

    // Update grid
    if (settings.showGrid) {
      drawGrid(fabricCanvas, settings.gridSize);
    } else {
      removeGrid(fabricCanvas);
    }

    // Update snap to grid
    if (settings.snapToGrid) {
      setupSnapToGrid(fabricCanvas, settings.gridSize);
    }

    fabricCanvas.renderAll();
  }, [fabricCanvas, settings, currentTool]);

  // Load canvas data
  useEffect(() => {
    if (!fabricCanvas || !canvasData) return;

    try {
      fabricCanvas.loadFromJSON(canvasData, () => {
        fabricCanvas.renderAll();
      });
    } catch (error) {
      console.error('Error loading canvas data:', error);
    }
  }, [fabricCanvas, canvasData]);

  const drawGrid = (canvas: FabricCanvas, gridSize: number) => {
    const width = canvas.getWidth();
    const height = canvas.getHeight();

    // Remove existing grid
    removeGrid(canvas);

    const gridLines: Line[] = [];

    // Vertical lines
    for (let i = 0; i <= width; i += gridSize) {
      const line = new Line([i, 0, i, height], {
        stroke: '#e5e7eb',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: 'grid-line',
      });
      gridLines.push(line);
      canvas.add(line);
    }

    // Horizontal lines
    for (let i = 0; i <= height; i += gridSize) {
      const line = new Line([0, i, width, i], {
        stroke: '#e5e7eb',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: 'grid-line',
      });
      gridLines.push(line);
      canvas.add(line);
    }

    // Send grid lines to back individually
    gridLines.forEach(line => canvas.sendObjectToBack(line));
  };

  const removeGrid = (canvas: FabricCanvas) => {
    const objects = canvas.getObjects();
    const gridLines = objects.filter((obj: any) => obj.name === 'grid-line');
    gridLines.forEach(line => canvas.remove(line));
  };

  const setupSnapToGrid = (canvas: FabricCanvas, gridSize: number) => {
    canvas.on('object:moving', (e) => {
      const obj = e.target;
      if (!obj) return;

      const left = Math.round(obj.left! / gridSize) * gridSize;
      const top = Math.round(obj.top! / gridSize) * gridSize;

      obj.set({ left, top });
    });
  };

  const handleZoomIn = useCallback(() => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoom * 1.2, 3);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  }, [fabricCanvas, zoom]);

  const handleZoomOut = useCallback(() => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoom / 1.2, 0.1);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  }, [fabricCanvas, zoom]);

  const handleResetView = useCallback(() => {
    if (!fabricCanvas) return;
    setZoom(1);
    fabricCanvas.setZoom(1);
    fabricCanvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  const handleToggleGrid = useCallback(() => {
    if (!fabricCanvas) return;
    if (settings.showGrid) {
      removeGrid(fabricCanvas);
    } else {
      drawGrid(fabricCanvas, settings.gridSize);
    }
    fabricCanvas.renderAll();
  }, [fabricCanvas, settings]);

  // Handle drawing tools
  useEffect(() => {
    if (!fabricCanvas) return;

    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let currentObject: FabricObject | null = null;

    const handleMouseDown = (e: any) => {
      if (currentTool === 'select') return;

      isDrawing = true;
      const pointer = fabricCanvas.getPointer(e.e);
      startX = pointer.x;
      startY = pointer.y;

      switch (currentTool) {
        case 'room':
          currentObject = new Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: '#374151',
            strokeWidth: 2,
          });
          fabricCanvas.add(currentObject);
          break;

        case 'table-round':
          currentObject = new Circle({
            left: startX,
            top: startY,
            radius: 0,
            fill: '#f3e8ff',
            stroke: '#7c3aed',
            strokeWidth: 2,
          });
          fabricCanvas.add(currentObject);
          break;

        case 'table-square':
          currentObject = new Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: '#f3e8ff',
            stroke: '#7c3aed',
            strokeWidth: 2,
          });
          fabricCanvas.add(currentObject);
          break;

        case 'text':
          currentObject = new Text('Text', {
            left: startX,
            top: startY,
            fontFamily: 'Arial',
            fontSize: 16,
            fill: '#374151',
          });
          fabricCanvas.add(currentObject);
          isDrawing = false;
          break;
      }
    };

    const handleMouseMove = (e: any) => {
      if (!isDrawing || !currentObject) return;

      const pointer = fabricCanvas.getPointer(e.e);
      const width = Math.abs(pointer.x - startX);
      const height = Math.abs(pointer.y - startY);

      switch (currentTool) {
        case 'room':
        case 'table-square':
          (currentObject as Rect).set({
            left: Math.min(startX, pointer.x),
            top: Math.min(startY, pointer.y),
            width,
            height,
          });
          break;

        case 'table-round':
          const radius = Math.max(width, height) / 2;
          (currentObject as Circle).set({
            radius,
            left: startX - radius,
            top: startY - radius,
          });
          break;
      }

      fabricCanvas.renderAll();
    };

    const handleMouseUp = () => {
      isDrawing = false;
      currentObject = null;
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:up', handleMouseUp);

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
    };
  }, [fabricCanvas, currentTool]);

  return (
    <div className="flex flex-col space-y-4">
      {/* Canvas Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="xs" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="xs" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="xs" onClick={handleResetView}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={settings.showGrid ? "default" : "outline"}
            size="xs"
            onClick={handleToggleGrid}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="border border-border rounded-lg overflow-hidden bg-background">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};