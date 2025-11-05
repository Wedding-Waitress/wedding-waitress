import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, CheckCircle2, XCircle, Lightbulb, Loader2 } from 'lucide-react';
import { FAQSuggestion } from '@/hooks/useAIKnowledgeSuggestions';
import { Separator } from '@/components/ui/separator';

interface AIKnowledgeSuggestionsProps {
  suggestions: FAQSuggestion[];
  context: {
    name: string;
    guest_count: number;
    days_until_event: number;
    existing_faq_count: number;
  } | null;
  generating: boolean;
  onToggleSuggestion: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAcceptSelected: () => void;
  onDismiss: () => void;
  selectedCount: number;
}

const priorityConfig = {
  high: { color: 'bg-red-500', label: 'High Priority', icon: '🔥' },
  medium: { color: 'bg-yellow-500', label: 'Medium', icon: '⚡' },
  low: { color: 'bg-blue-500', label: 'Low', icon: '💡' }
};

const categoryConfig = {
  venue: { label: 'Venue', icon: '📍', color: 'bg-green-100 text-green-800' },
  timing: { label: 'Timing', icon: '⏰', color: 'bg-purple-100 text-purple-800' },
  attire: { label: 'Attire', icon: '👔', color: 'bg-pink-100 text-pink-800' },
  food: { label: 'Food', icon: '🍽️', color: 'bg-orange-100 text-orange-800' },
  policies: { label: 'Policies', icon: '📋', color: 'bg-red-100 text-red-800' },
  logistics: { label: 'Logistics', icon: '🚗', color: 'bg-blue-100 text-blue-800' },
  other: { label: 'Other', icon: '💬', color: 'bg-gray-100 text-gray-800' }
};

export const AIKnowledgeSuggestions = ({
  suggestions,
  context,
  generating,
  onToggleSuggestion,
  onSelectAll,
  onDeselectAll,
  onAcceptSelected,
  onDismiss,
  selectedCount
}: AIKnowledgeSuggestionsProps) => {
  if (generating) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
            <div className="text-center">
              <p className="text-lg font-medium">Analyzing your event...</p>
              <p className="text-sm text-muted-foreground">
                AI is generating personalized FAQ suggestions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI-Generated FAQ Suggestions
            </CardTitle>
            <CardDescription>
              Based on your event details: {context?.name} • {context?.guest_count} guests • {context?.days_until_event} days away
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Context Alert */}
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            Found <strong>{suggestions.length} relevant FAQs</strong> your guests might ask.
            {context && context.existing_faq_count > 0 && ` (Already have ${context.existing_faq_count} FAQs)`}
          </AlertDescription>
        </Alert>

        {/* Bulk Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onSelectAll}>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Select All
            </Button>
            <Button size="sm" variant="outline" onClick={onDeselectAll}>
              <XCircle className="w-3 h-3 mr-1" />
              Deselect All
            </Button>
          </div>
          <Badge variant="secondary">
            {selectedCount} of {suggestions.length} selected
          </Badge>
        </div>

        <Separator />

        {/* Suggestions List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {suggestions.map((suggestion, index) => {
            const priority = priorityConfig[suggestion.priority];
            const category = categoryConfig[suggestion.category];

            return (
              <Card 
                key={index} 
                className={`transition-all ${suggestion.selected ? 'border-purple-300 bg-white' : 'opacity-60'}`}
              >
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <Checkbox
                      checked={suggestion.selected}
                      onCheckedChange={() => onToggleSuggestion(index)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">
                          {priority.icon} {suggestion.question}
                        </p>
                        <div className="flex gap-1 flex-shrink-0">
                          <Badge className={category.color} variant="secondary">
                            {category.icon} {category.label}
                          </Badge>
                          <div className={`w-2 h-2 rounded-full ${priority.color} mt-1.5`} />
                        </div>
                      </div>

                      {/* Answer */}
                      <p className="text-sm text-muted-foreground">
                        {suggestion.answer}
                      </p>

                      {/* AI Reasoning */}
                      <div className="bg-purple-50 border border-purple-100 rounded-lg p-2">
                        <p className="text-xs text-purple-800">
                          <strong>Why this FAQ?</strong> {suggestion.reasoning}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={onAcceptSelected} 
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            disabled={selectedCount === 0}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Add {selectedCount} Selected FAQ{selectedCount !== 1 ? 's' : ''}
          </Button>
          <Button variant="outline" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
