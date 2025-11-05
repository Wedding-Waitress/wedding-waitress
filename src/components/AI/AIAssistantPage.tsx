import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, BookOpen } from 'lucide-react';
import { AITextChat } from './AITextChat';
import { StandardEventSelector } from '../Dashboard/StandardEventSelector';
import { useEvents } from '@/hooks/useEvents';
import { AIKnowledgeBaseEditor } from './AIKnowledgeBaseEditor';

export const AIAssistantPage = () => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { events, loading } = useEvents();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🤖 AI Assistant</h1>
          <p className="text-muted-foreground mt-2">
            Your intelligent event planning companion
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <StandardEventSelector
            events={events}
            selectedEventId={selectedEventId}
            onEventSelect={setSelectedEventId}
            loading={loading}
          />
        </CardContent>
      </Card>

      {selectedEventId ? (
        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Text Chat
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Knowledge Base
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <AITextChat eventId={selectedEventId} userType="host" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4">
            <AIKnowledgeBaseEditor
              eventId={selectedEventId}
              eventVenue={events.find(e => e.id === selectedEventId)?.venue}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium">Select an event to start</p>
              <p className="text-sm">Choose an event above to use the AI assistant</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};