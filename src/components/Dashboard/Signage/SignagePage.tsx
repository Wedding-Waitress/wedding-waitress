import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Download, Eye, FileImage, Plus } from "lucide-react";
import { useEvents } from '@/hooks/useEvents';
import { SignageTemplateCard } from './SignageTemplateCard';
import { SignageCustomizer } from './SignageCustomizer';
import { SignageTemplate, TemplateType } from '@/lib/signageTemplateEngine';

interface SignagePageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

const TEMPLATE_TYPES: { id: TemplateType; name: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'table-tent',
    name: 'Table Tents',
    description: 'A-frame cards for table displays',
    icon: <FileImage className="w-8 h-8" />
  },
  {
    id: 'welcome-sign',
    name: 'Welcome Signs',
    description: 'Large entrance displays',
    icon: <FileImage className="w-8 h-8" />
  },
  {
    id: 'standing-sign',
    name: 'Standing Signs',
    description: 'Floor-standing QR displays',
    icon: <FileImage className="w-8 h-8" />
  },
  {
    id: 'menu-card',
    name: 'Menu Cards',
    description: 'QR codes for digital menus',
    icon: <FileImage className="w-8 h-8" />
  },
  {
    id: 'place-card',
    name: 'Place Cards',
    description: 'Individual guest cards',
    icon: <FileImage className="w-8 h-8" />
  },
  {
    id: 'poster-sign',
    name: 'Poster Signs',
    description: 'Wall-mounted displays',
    icon: <FileImage className="w-8 h-8" />
  }
];

export const SignagePage: React.FC<SignagePageProps> = ({
  selectedEventId,
  onEventSelect
}) => {
  const { events, loading: eventsLoading } = useEvents();
  const [selectedTemplate, setSelectedTemplate] = useState<SignageTemplate | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;

  const handleTemplateSelect = (templateType: TemplateType) => {
    if (!selectedEvent) return;

    const template: SignageTemplate = {
      id: `${templateType}-${Date.now()}`,
      type: templateType,
      name: TEMPLATE_TYPES.find(t => t.id === templateType)?.name || templateType,
      eventId: selectedEventId!,
      settings: {
        eventName: selectedEvent.name,
        eventDate: selectedEvent.date,
        eventVenue: selectedEvent.venue || '',
        primaryColor: '#6366f1',
        secondaryColor: '#ec4899',
        textColor: '#1f2937',
        backgroundColor: '#ffffff',
        fontSize: 'medium',
        includeQR: true,
        customMessage: '',
        logoUrl: ''
      },
      dimensions: getTemplateDimensions(templateType),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setSelectedTemplate(template);
    setIsCustomizing(true);
  };

  const getTemplateDimensions = (type: TemplateType) => {
    switch (type) {
      case 'table-tent':
        return { width: 148, height: 105, units: 'mm' as const }; // A6 folded
      case 'welcome-sign':
        return { width: 594, height: 420, units: 'mm' as const }; // A2
      case 'standing-sign':
        return { width: 297, height: 420, units: 'mm' as const }; // A3
      case 'menu-card':
        return { width: 105, height: 148, units: 'mm' as const }; // A6
      case 'place-card':
        return { width: 85, height: 55, units: 'mm' as const }; // Business card
      case 'poster-sign':
        return { width: 210, height: 297, units: 'mm' as const }; // A4
      default:
        return { width: 210, height: 297, units: 'mm' as const };
    }
  };

  if (isCustomizing && selectedTemplate) {
    return (
      <SignageCustomizer
        template={selectedTemplate}
        onBack={() => setIsCustomizing(false)}
        onSave={(updatedTemplate) => {
          // TODO: Save template to database
          console.log('Saving template:', updatedTemplate);
          setIsCustomizing(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6">
          <div className="space-y-4 flex-1">
            {/* Event selector */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-foreground">
                Choose Event:
              </label>
              <Select value={selectedEventId || ""} onValueChange={onEventSelect}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
                </SelectTrigger>
                <SelectContent>
                  {events.length > 0 ? (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>{event.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-events" disabled>
                      {eventsLoading ? "Loading events..." : "No events found"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Contextual title */}
            {selectedEvent && (
              <div className="flex items-center space-x-2">
                <span className="text-lg font-medium text-foreground">Signage for</span>
                <span className="text-lg font-bold text-primary">{selectedEvent.name}</span>
              </div>
            )}
          </div>
          
          {/* Right side block */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:ml-auto">
            <div className="flex items-start gap-3">
              <FileImage className="w-16 h-16 text-primary flex-shrink-0" />
              <div className="flex flex-col">
                <CardTitle className="mb-2 text-left">QR Code Signage</CardTitle>
                <CardDescription className="text-left">
                  Create professional print-ready signage with QR codes
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Template Gallery */}
      {selectedEventId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Choose a Template
            </CardTitle>
            <CardDescription>
              Select from our professional signage templates to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {TEMPLATE_TYPES.map((template) => (
                <SignageTemplateCard
                  key={template.id}
                  templateType={template.id}
                  name={template.name}
                  description={template.description}
                  icon={template.icon}
                  onSelect={() => handleTemplateSelect(template.id)}
                  disabled={!selectedEventId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <FileImage className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="mb-2 text-muted-foreground">Select an Event</CardTitle>
          <CardDescription>
            Choose an event to start creating your signage templates
          </CardDescription>
        </Card>
      )}
    </div>
  );
};