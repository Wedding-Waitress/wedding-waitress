import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar, Mail, Heart, Gift } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useInvitationTemplates, type InvitationTemplate, type CardType } from '@/hooks/useInvitationTemplates';
import { useInvitationDesign } from '@/hooks/useInvitationDesign';
import { TemplateGallery } from './TemplateGallery';
import { InvitationCustomizer } from './InvitationCustomizer';
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils';

interface InvitationsPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

const TAB_CONFIG: Record<CardType, { label: string; icon: React.ReactNode; title: string; description: string }> = {
  save_the_date: {
    label: 'Save The Date',
    icon: <Heart className="w-4 h-4" />,
    title: 'Save The Date Cards',
    description: 'Send beautiful Save The Date cards to your guests months before the wedding.',
  },
  invitation: {
    label: 'Invitation',
    icon: <Mail className="w-4 h-4" />,
    title: 'Invitations',
    description: 'Choose a template, customise your text, and export beautiful invitations for your guests.',
  },
  thank_you: {
    label: 'Thank You',
    icon: <Gift className="w-4 h-4" />,
    title: 'Thank You Cards',
    description: 'Send heartfelt Thank You cards to your guests after the wedding.',
  },
};

export const InvitationsPage: React.FC<InvitationsPageProps> = ({
  selectedEventId,
  onEventSelect,
}) => {
  const { events, loading: eventsLoading } = useEvents();
  const [activeCardType, setActiveCardType] = useState<CardType>('invitation');
  const { templates, loading: templatesLoading } = useInvitationTemplates(activeCardType);
  const { design, saveDesign } = useInvitationDesign(selectedEventId);
  const [selectedTemplate, setSelectedTemplate] = useState<InvitationTemplate | null>(null);

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);
  const tabConfig = TAB_CONFIG[activeCardType];

  const eventData = useMemo(() => {
    if (!selectedEvent) return {};
    const p1 = selectedEvent.partner1_name || '';
    const p2 = selectedEvent.partner2_name || '';
    const coupleNames = p1 && p2 ? `${p1} & ${p2}` : p1 || p2 || selectedEvent.name;
    return {
      couple_names: coupleNames,
      date: selectedEvent.date ? formatDisplayDate(selectedEvent.date) : '',
      venue: selectedEvent.venue || '',
      time: selectedEvent.start_time ? formatDisplayTime(selectedEvent.start_time) : '',
    };
  }, [selectedEvent]);

  const handleSelectTemplate = (template: InvitationTemplate) => {
    setSelectedTemplate(template);
  };

  const handleSaveDesign = async (customText: Record<string, string>, customStyles: Record<string, any>, qrConfig?: any) => {
    if (!selectedTemplate) return;
    await saveDesign({
      template_id: selectedTemplate.id,
      custom_text: customText,
      custom_styles: customStyles,
      qr_position: qrConfig || null,
    });
  };

  // If customizing, show the customizer full-width
  if (selectedTemplate && selectedEventId) {
    return (
      <div className="space-y-4">
        <InvitationCustomizer
          template={selectedTemplate}
          eventData={eventData}
          eventId={selectedEventId}
          eventSlug={selectedEvent?.slug || undefined}
          initialCustomText={design?.template_id === selectedTemplate.id ? design.custom_text : {}}
          initialCustomStyles={design?.template_id === selectedTemplate.id ? design.custom_styles : {}}
          initialQrConfig={design?.template_id === selectedTemplate.id && design.qr_position ? design.qr_position as any : undefined}
          onSave={handleSaveDesign}
          onBack={() => setSelectedTemplate(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="ww-box">
        <CardHeader className="flex flex-col gap-4 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <Mail className="w-10 h-10 sm:w-16 sm:h-16 text-primary flex-shrink-0" />
              <div className="flex flex-col">
                <CardTitle className="text-xl sm:text-2xl">Invitations & Cards</CardTitle>
                <CardDescription className="mt-1">
                  {tabConfig.description}
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Event Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              Choose Event:
            </label>
            <Select value={selectedEventId || "no-event"} onValueChange={onEventSelect}>
              <SelectTrigger className="w-full sm:w-[300px] border-primary focus:ring-primary [&>span]:font-bold [&>span]:text-[#7248E6]">
                <SelectValue placeholder="Choose Event" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {events.length > 0 ? events.map(event => (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>{event.name}</span>
                    </div>
                  </SelectItem>
                )) : (
                  <SelectItem value="no-events" disabled>
                    {eventsLoading ? "Loading events..." : "No events found"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {/* Sub-tab navigation */}
          <Tabs value={activeCardType} onValueChange={(v) => { setActiveCardType(v as CardType); setSelectedTemplate(null); }}>
            <TabsList className="mb-6">
              <TabsTrigger value="save_the_date" className="gap-1.5">
                <Heart className="w-3.5 h-3.5" /> Save The Date
              </TabsTrigger>
              <TabsTrigger value="invitation" className="gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Invitation
              </TabsTrigger>
              <TabsTrigger value="thank_you" className="gap-1.5">
                <Gift className="w-3.5 h-3.5" /> Thank You
              </TabsTrigger>
            </TabsList>

            {(['save_the_date', 'invitation', 'thank_you'] as CardType[]).map(ct => (
              <TabsContent key={ct} value={ct}>
                {!selectedEventId ? (
                  <div className="text-center py-12">
                    <Mail className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Select an Event</h3>
                    <p className="text-muted-foreground">
                      Choose an event above to start designing your {TAB_CONFIG[ct].label.toLowerCase()} cards.
                    </p>
                  </div>
                ) : (
                  <TemplateGallery
                    templates={templates}
                    loading={templatesLoading}
                    cardType={ct}
                    onSelect={handleSelectTemplate}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
