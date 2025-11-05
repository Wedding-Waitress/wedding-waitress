import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, Send, Loader2, Bot, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIKnowledgeTesterProps {
  eventId: string;
}

export const AIKnowledgeTester = ({ eventId }: AIKnowledgeTesterProps) => {
  const [testQuestion, setTestQuestion] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResponse, setTestResponse] = useState('');
  const { toast } = useToast();

  const sampleQuestions = [
    "What's the parking situation?",
    "What time should I arrive?",
    "Can I bring my kids?",
    "What's the dress code?"
  ];

  const testKnowledge = async () => {
    if (!testQuestion.trim()) return;

    setTesting(true);
    setTestResponse('');

    try {
      const response = await fetch(
        `https://xytxkidpourwdbzzwcdp.supabase.co/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5dHhraWRwb3Vyd2Rienp3Y2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMTMzNTMsImV4cCI6MjA3Mjg4OTM1M30.37m5PSVqAjo51n8CYfDAu0gZr9lGCaAy3NU3PPYxMmI`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: testQuestion }],
            event_id: eventId,
            user_type: 'guest'
          })
        }
      );

      if (!response.ok) throw new Error('Failed to get AI response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  setTestResponse(fullResponse);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Test failed:', error);
      toast({
        title: 'Test failed',
        description: 'Could not get AI response',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Test AI Knowledge
        </CardTitle>
        <CardDescription>
          Ask questions to see if the AI understands your event information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {sampleQuestions.map((q) => (
            <Badge
              key={q}
              variant="outline"
              className="cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900"
              onClick={() => setTestQuestion(q)}
            >
              💬 {q.replace('?', '')}?
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Ask a test question..."
            value={testQuestion}
            onChange={(e) => setTestQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !testing && testKnowledge()}
          />
          <Button onClick={testKnowledge} disabled={testing || !testQuestion.trim()}>
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {testResponse && (
          <Alert>
            <Bot className="h-4 w-4" />
            <AlertTitle>AI Response</AlertTitle>
            <AlertDescription className="mt-2 whitespace-pre-wrap">
              {testResponse}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
