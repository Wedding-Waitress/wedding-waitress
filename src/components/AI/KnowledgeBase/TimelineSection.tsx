import { useState, useEffect } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Plus, Trash2, Save } from 'lucide-react';
import { KnowledgeBaseEntry } from '@/hooks/useKnowledgeBase';
import { TIMELINE_TEMPLATES } from '@/lib/knowledgeTemplates';

interface TimelineSectionProps {
  timelineEntry: KnowledgeBaseEntry | undefined;
  onSave: (entry: Partial<KnowledgeBaseEntry>) => Promise<boolean>;
}

interface TimelineItem {
  id: string;
  startTime: string;
  endTime: string;
  type: string;
  details: string;
}

export const TimelineSection = ({ timelineEntry, onSave }: TimelineSectionProps) => {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  useEffect(() => {
    if (timelineEntry?.answer) {
      try {
        const parsed = JSON.parse(timelineEntry.answer);
        setTimeline(parsed);
      } catch (e) {
        console.error('Failed to parse timeline:', e);
      }
    }
  }, [timelineEntry]);

  const addItem = () => {
    setTimeline([
      ...timeline,
      {
        id: crypto.randomUUID(),
        startTime: '',
        endTime: '',
        type: 'other',
        details: ''
      }
    ]);
  };

  const updateItem = (id: string, field: keyof TimelineItem, value: string) => {
    setTimeline(timeline.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const deleteItem = (id: string) => {
    setTimeline(timeline.filter((item) => item.id !== id));
  };

  const loadTemplate = (templateKey: keyof typeof TIMELINE_TEMPLATES) => {
    const template = TIMELINE_TEMPLATES[templateKey];
    setTimeline(template.map((t) => ({ ...t, id: crypto.randomUUID() })));
  };

  const saveTimeline = async () => {
    await onSave({
      id: timelineEntry?.id,
      category: 'timeline',
      answer: JSON.stringify(timeline),
      sort_order: 0,
      is_active: true
    });
  };

  const getEventIcon = (type: string) => {
    const icons: Record<string, string> = {
      ceremony: '💒',
      cocktails: '🍸',
      reception: '🎉',
      dinner: '🍽️',
      speeches: '🎤',
      dancing: '💃',
      cake: '🎂',
      other: '📋'
    };
    return icons[type] || '📋';
  };

  return (
    <AccordionItem value="timeline">
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          <span>Event Timeline</span>
          <Badge variant="secondary">{timeline.length} items</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => loadTemplate('traditionalWedding')}>
              📋 Traditional Wedding
            </Button>
            <Button size="sm" variant="outline" onClick={() => loadTemplate('cocktailReception')}>
              🍸 Cocktail Reception
            </Button>
            <Button size="sm" variant="outline" onClick={() => loadTemplate('gardenParty')}>
              🌸 Garden Party
            </Button>
          </div>

          <div className="space-y-3">
            {timeline.map((item, index) => (
              <Card key={item.id} className="relative">
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      {index < timeline.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border mt-2" />
                      )}
                    </div>

                    <div className="flex-1 space-y-3 pb-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Start Time</Label>
                          <Input
                            type="time"
                            value={item.startTime}
                            onChange={(e) => updateItem(item.id, 'startTime', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">End Time</Label>
                          <Input
                            type="time"
                            value={item.endTime}
                            onChange={(e) => updateItem(item.id, 'endTime', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Event</Label>
                          <Select value={item.type} onValueChange={(v) => updateItem(item.id, 'type', v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ceremony">💒 Ceremony</SelectItem>
                              <SelectItem value="cocktails">🍸 Cocktail Hour</SelectItem>
                              <SelectItem value="reception">🎉 Reception</SelectItem>
                              <SelectItem value="dinner">🍽️ Dinner</SelectItem>
                              <SelectItem value="speeches">🎤 Speeches</SelectItem>
                              <SelectItem value="dancing">💃 Dancing</SelectItem>
                              <SelectItem value="cake">🎂 Cake Cutting</SelectItem>
                              <SelectItem value="other">📋 Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Details</Label>
                        <Textarea
                          placeholder="Additional details guests should know..."
                          rows={2}
                          value={item.details}
                          onChange={(e) => updateItem(item.id, 'details', e.target.value)}
                        />
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button onClick={addItem} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Timeline Item
          </Button>

          <Button onClick={saveTimeline} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save Timeline
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
