import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Object as FabricObject } from 'fabric';

interface FloorPlanPropertiesPanelProps {
  selectedObject: FabricObject | null;
  settings: {
    width: number;
    height: number;
    gridSize: number;
    showGrid: boolean;
    snapToGrid: boolean;
    measurementUnit: 'feet' | 'meters';
  };
  roomDimensions: {
    width: number;
    height: number;
    realWidth: number;
    realHeight: number;
    unit: string;
  };
  onSettingsChange: (settings: any) => void;
  onRoomDimensionsChange: (dimensions: any) => void;
  onObjectChange?: (object: FabricObject, properties: any) => void;
}

export const FloorPlanPropertiesPanel: React.FC<FloorPlanPropertiesPanelProps> = ({
  selectedObject,
  settings,
  roomDimensions,
  onSettingsChange,
  onRoomDimensionsChange,
  onObjectChange,
}) => {
  const handleSettingChange = (key: string, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const handleRoomDimensionChange = (key: string, value: any) => {
    onRoomDimensionsChange({
      ...roomDimensions,
      [key]: value,
    });
  };

  const handleObjectPropertyChange = (property: string, value: any) => {
    if (!selectedObject || !onObjectChange) return;
    onObjectChange(selectedObject, { [property]: value });
  };

  return (
    <div className="w-80 bg-background border-l border-border p-4 space-y-4 overflow-y-auto">
      {/* Canvas Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Canvas Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Width</Label>
              <Input
                type="number"
                value={settings.width}
                onChange={(e) => handleSettingChange('width', parseInt(e.target.value) || 800)}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Height</Label>
              <Input
                type="number"
                value={settings.height}
                onChange={(e) => handleSettingChange('height', parseInt(e.target.value) || 600)}
                className="h-8"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Grid Size</Label>
            <Input
              type="number"
              value={settings.gridSize}
              onChange={(e) => handleSettingChange('gridSize', parseInt(e.target.value) || 20)}
              className="h-8"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Show Grid</Label>
            <Switch
              checked={settings.showGrid}
              onCheckedChange={(checked) => handleSettingChange('showGrid', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Snap to Grid</Label>
            <Switch
              checked={settings.snapToGrid}
              onCheckedChange={(checked) => handleSettingChange('snapToGrid', checked)}
            />
          </div>

          <div>
            <Label className="text-xs">Measurement Unit</Label>
            <Select
              value={settings.measurementUnit}
              onValueChange={(value) => handleSettingChange('measurementUnit', value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feet">Feet</SelectItem>
                <SelectItem value="meters">Meters</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Room Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Room Dimensions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Real Width ({roomDimensions.unit})</Label>
              <Input
                type="number"
                value={roomDimensions.realWidth}
                onChange={(e) => handleRoomDimensionChange('realWidth', parseFloat(e.target.value) || 0)}
                className="h-8"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Real Height ({roomDimensions.unit})</Label>
              <Input
                type="number"
                value={roomDimensions.realHeight}
                onChange={(e) => handleRoomDimensionChange('realHeight', parseFloat(e.target.value) || 0)}
                className="h-8"
                placeholder="0"
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Scale: 1 pixel = {roomDimensions.realWidth > 0 && settings.width > 0 
              ? ((roomDimensions.realWidth / settings.width)).toFixed(2)
              : '0'} {roomDimensions.unit}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Selected Object Properties */}
      {selectedObject && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Object Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Type</Label>
              <div className="text-sm text-muted-foreground capitalize">
                {selectedObject.type || 'Unknown'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">X Position</Label>
                <Input
                  type="number"
                  value={Math.round(selectedObject.left || 0)}
                  onChange={(e) => handleObjectPropertyChange('left', parseInt(e.target.value) || 0)}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Y Position</Label>
                <Input
                  type="number"
                  value={Math.round(selectedObject.top || 0)}
                  onChange={(e) => handleObjectPropertyChange('top', parseInt(e.target.value) || 0)}
                  className="h-8"
                />
              </div>
            </div>

            {selectedObject.type === 'rect' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Width</Label>
                  <Input
                    type="number"
                    value={Math.round((selectedObject as any).width || 0)}
                    onChange={(e) => handleObjectPropertyChange('width', parseInt(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Height</Label>
                  <Input
                    type="number"
                    value={Math.round((selectedObject as any).height || 0)}
                    onChange={(e) => handleObjectPropertyChange('height', parseInt(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
              </div>
            )}

            {selectedObject.type === 'circle' && (
              <div>
                <Label className="text-xs">Radius</Label>
                <Input
                  type="number"
                  value={Math.round((selectedObject as any).radius || 0)}
                  onChange={(e) => handleObjectPropertyChange('radius', parseInt(e.target.value) || 0)}
                  className="h-8"
                />
              </div>
            )}

            {selectedObject.type === 'text' && (
              <>
                <div>
                  <Label className="text-xs">Text</Label>
                  <Input
                    value={(selectedObject as any).text || ''}
                    onChange={(e) => handleObjectPropertyChange('text', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Font Size</Label>
                  <Input
                    type="number"
                    value={(selectedObject as any).fontSize || 16}
                    onChange={(e) => handleObjectPropertyChange('fontSize', parseInt(e.target.value) || 16)}
                    className="h-8"
                  />
                </div>
              </>
            )}

            <div>
              <Label className="text-xs">Fill Color</Label>
              <Input
                type="color"
                value={(selectedObject as any).fill || '#000000'}
                onChange={(e) => handleObjectPropertyChange('fill', e.target.value)}
                className="h-8"
              />
            </div>

            <div>
              <Label className="text-xs">Stroke Color</Label>
              <Input
                type="color"
                value={(selectedObject as any).stroke || '#000000'}
                onChange={(e) => handleObjectPropertyChange('stroke', e.target.value)}
                className="h-8"
              />
            </div>

            <div>
              <Label className="text-xs">Stroke Width</Label>
              <Input
                type="number"
                value={(selectedObject as any).strokeWidth || 1}
                onChange={(e) => handleObjectPropertyChange('strokeWidth', parseInt(e.target.value) || 1)}
                className="h-8"
                min="0"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedObject && (
        <div className="text-center text-muted-foreground text-sm py-8">
          Select an object to view its properties
        </div>
      )}
    </div>
  );
};