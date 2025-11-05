import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion } from '@/components/ui/accordion';
import { BookOpen } from 'lucide-react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { KnowledgeStatistics } from './KnowledgeBase/KnowledgeStatistics';
import { AIKnowledgeTester } from './KnowledgeBase/AIKnowledgeTester';
import { FAQSection } from './KnowledgeBase/FAQSection';
import { VenueSection } from './KnowledgeBase/VenueSection';
import { VendorsSection } from './KnowledgeBase/VendorsSection';
import { TimelineSection } from './KnowledgeBase/TimelineSection';
import { PoliciesSection } from './KnowledgeBase/PoliciesSection';

interface AIKnowledgeBaseEditorProps {
  eventId: string;
  eventVenue?: string;
}

export const AIKnowledgeBaseEditor = ({ eventId, eventVenue }: AIKnowledgeBaseEditorProps) => {
  const { knowledgeBase, loading, saveEntry, deleteEntry, toggleActive } = useKnowledgeBase(eventId);

  const faqs = knowledgeBase.filter((kb) => kb.category === 'faq');
  const venueEntry = knowledgeBase.find((kb) => kb.category === 'venue');
  const vendors = knowledgeBase.filter((kb) => kb.category === 'vendors');
  const timelineEntry = knowledgeBase.find((kb) => kb.category === 'timeline');
  const policiesEntry = knowledgeBase.find((kb) => kb.category === 'policies');

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading knowledge base...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            AI Knowledge Base
          </CardTitle>
          <CardDescription>
            Teach the AI about your event so it can answer guest questions accurately
          </CardDescription>
        </CardHeader>
      </Card>

      <KnowledgeStatistics knowledgeBase={knowledgeBase} />

      <AIKnowledgeTester eventId={eventId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Knowledge Categories</CardTitle>
          <CardDescription>
            Expand each section to add information about your event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <FAQSection
              faqs={faqs}
              onSave={saveEntry}
              onDelete={deleteEntry}
              onToggle={toggleActive}
            />
            <VenueSection
              venueEntry={venueEntry}
              eventVenue={eventVenue}
              onSave={saveEntry}
            />
            <VendorsSection
              vendors={vendors}
              onSave={saveEntry}
              onDelete={deleteEntry}
            />
            <TimelineSection
              timelineEntry={timelineEntry}
              onSave={saveEntry}
            />
            <PoliciesSection
              policiesEntry={policiesEntry}
              onSave={saveEntry}
            />
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};
