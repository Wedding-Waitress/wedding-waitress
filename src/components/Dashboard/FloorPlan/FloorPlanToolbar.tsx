import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  MousePointer2, 
  Square, 
  Circle, 
  Type, 
  Minus,
  DoorOpen,
  RectangleHorizontal,
  Home,
  Utensils,
  Armchair,
  Stars
} from 'lucide-react';

interface FloorPlanToolbarProps {
  currentTool: string;
  onToolChange: (tool: string) => void;
}

export const FloorPlanToolbar: React.FC<FloorPlanToolbarProps> = ({
  currentTool,
  onToolChange,
}) => {
  const toolGroups = [
    {
      name: 'Selection',
      tools: [
        { id: 'select', name: 'Select', icon: MousePointer2 },
      ],
    },
    {
      name: 'Room & Structure',
      tools: [
        { id: 'room', name: 'Room', icon: Home },
        { id: 'wall', name: 'Wall', icon: Minus },
        { id: 'door', name: 'Door', icon: DoorOpen },
        { id: 'window', name: 'Window', icon: RectangleHorizontal },
        { id: 'stairs', name: 'Stairs', icon: Stars },
      ],
    },
    {
      name: 'Tables & Furniture',
      tools: [
        { id: 'table-round', name: 'Round Table', icon: Circle },
        { id: 'table-square', name: 'Square Table', icon: Square },
        { id: 'chair', name: 'Chair', icon: Armchair },
        { id: 'bar', name: 'Bar', icon: Utensils },
      ],
    },
    {
      name: 'Drawing Tools',
      tools: [
        { id: 'text', name: 'Text', icon: Type },
        { id: 'line', name: 'Line', icon: Minus },
        { id: 'rectangle', name: 'Rectangle', icon: Square },
        { id: 'circle', name: 'Circle', icon: Circle },
      ],
    },
  ];

  return (
    <div className="w-16 bg-background border-r border-border p-2 space-y-2">
      {toolGroups.map((group, groupIndex) => (
        <div key={group.name}>
          {groupIndex > 0 && <Separator className="my-2" />}
          <div className="space-y-1">
            {group.tools.map((tool) => (
              <Button
                key={tool.id}
                variant={currentTool === tool.id ? "default" : "ghost"}
                size="sm"
                className="w-full h-10 p-0 flex flex-col items-center gap-1 text-xs"
                onClick={() => onToolChange(tool.id)}
                title={tool.name}
              >
                <tool.icon className="w-4 h-4" />
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};