import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Save, Download, FileText, Image } from 'lucide-react';
import { Object as FabricObject } from 'fabric';

import { useEvents } from '@/hooks/useEvents';
import { useFloorPlans } from '@/hooks/useFloorPlans';
import { FloorPlanCanvas } from './FloorPlanCanvas';
import { FloorPlanToolbar } from './FloorPlanToolbar';
import { FloorPlanPropertiesPanel } from './FloorPlanPropertiesPanel';
import { useToast } from '@/hooks/use-toast';

interface FloorPlanPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export const FloorPlanPage: React.FC<FloorPlanPageProps> = ({
  selectedEventId,
  onEventSelect,
}) => {
  const { events } = useEvents();
  const { 
    floorPlans, 
    activeFloorPlan, 
    setActiveFloorPlan,
    createFloorPlan, 
    updateFloorPlan,
    loading 
  } = useFloorPlans(selectedEventId);
  
  const [currentTool, setCurrentTool] = useState('select');
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFloorPlanName, setNewFloorPlanName] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();

  // Default settings
  const defaultSettings = {
    width: 800,
    height: 600,
    gridSize: 20,
    showGrid: true,
    snapToGrid: true,
    measurementUnit: 'feet' as const,
  };

  const defaultRoomDimensions = {
    width: 0,
    height: 0,
    realWidth: 0,
    realHeight: 0,
    unit: 'feet',
  };

  const currentSettings = activeFloorPlan?.settings || defaultSettings;
  const currentRoomDimensions = activeFloorPlan?.room_dimensions || defaultRoomDimensions;

  const selectedEvent = events.find(event => event.id === selectedEventId);

  const handleCreateFloorPlan = async () => {
    if (!newFloorPlanName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a floor plan name",
        variant: "destructive",
      });
      return;
    }

    const success = await createFloorPlan({
      name: newFloorPlanName,
      description: `Floor plan for ${selectedEvent?.name || 'event'}`,
    });

    if (success) {
      setNewFloorPlanName('');
      setIsCreateModalOpen(false);
    }
  };

  const handleCanvasChange = useCallback(async (canvasData: any) => {
    if (!activeFloorPlan) return;
    
    // Auto-save the canvas data
    await updateFloorPlan(activeFloorPlan.id, {
      canvas_data: canvasData,
    });
    
    setLastSaved(new Date());
  }, [activeFloorPlan, updateFloorPlan]);

  const handleSettingsChange = useCallback(async (newSettings: any) => {
    if (!activeFloorPlan) return;
    
    await updateFloorPlan(activeFloorPlan.id, {
      settings: newSettings,
    });
  }, [activeFloorPlan, updateFloorPlan]);

  const handleRoomDimensionsChange = useCallback(async (newDimensions: any) => {
    if (!activeFloorPlan) return;
    
    await updateFloorPlan(activeFloorPlan.id, {
      room_dimensions: newDimensions,
    });
  }, [activeFloorPlan, updateFloorPlan]);

  const handleObjectChange = useCallback((object: FabricObject, properties: any) => {
    if (!object) return;
    
    object.set(properties);
    object.canvas?.renderAll();
  }, []);

  const handleExport = () => {
    toast({
      title: "Export",
      description: "Export functionality will be implemented in the next version",
    });
  };

  if (!selectedEventId) {
    return (
      <Card className="p-8 text-center">
        <CardTitle className="mb-4">Select an Event</CardTitle>
        <p className="text-muted-foreground mb-6">
          Choose an event to start designing your floor plan
        </p>
        <Select onValueChange={onEventSelect}>
          <SelectTrigger className="w-64 mx-auto">
            <SelectValue placeholder="Select an event" />
          </SelectTrigger>
          <SelectContent>
            {events.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {event.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-4">
          <Select value={selectedEventId} onValueChange={onEventSelect}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {floorPlans.length > 0 && (
            <Select 
              value={activeFloorPlan?.id || ''} 
              onValueChange={(value) => {
                const plan = floorPlans.find(p => p.id === value);
                if (plan) setActiveFloorPlan(plan);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select floor plan" />
              </SelectTrigger>
              <SelectContent>
                {floorPlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {lastSaved && (
            <span className="text-xs text-muted-foreground">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Floor Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Floor Plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Floor Plan Name</Label>
                  <Input
                    value={newFloorPlanName}
                    onChange={(e) => setNewFloorPlanName(e.target.value)}
                    placeholder="Enter floor plan name"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateFloorPlan}>
                    Create Floor Plan
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <FloorPlanToolbar
          currentTool={currentTool}
          onToolChange={setCurrentTool}
        />

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col">
          {activeFloorPlan ? (
            <div className="flex-1 p-4">
              <FloorPlanCanvas
                canvasData={activeFloorPlan.canvas_data}
                settings={currentSettings}
                currentTool={currentTool}
                onCanvasChange={handleCanvasChange}
                onObjectSelected={setSelectedObject}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Card className="p-8 text-center max-w-md">
                <CardHeader>
                  <CardTitle>No Floor Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Create your first floor plan to get started
                  </p>
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Floor Plan
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Properties Panel */}
        {activeFloorPlan && (
          <FloorPlanPropertiesPanel
            selectedObject={selectedObject}
            settings={currentSettings}
            roomDimensions={currentRoomDimensions}
            onSettingsChange={handleSettingsChange}
            onRoomDimensionsChange={handleRoomDimensionsChange}
            onObjectChange={handleObjectChange}
          />
        )}
      </div>
    </div>
  );
};