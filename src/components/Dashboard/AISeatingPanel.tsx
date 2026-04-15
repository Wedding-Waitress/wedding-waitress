import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, CheckCheck } from 'lucide-react';
import { useAISeatingsuggestions } from '@/hooks/useAISeatingsuggestions';
import { AISeatingCard } from './AISeatingCard';
import { Skeleton } from '@/components/ui/skeleton';

interface AISeatingPanelProps {
  eventId: string;
  tables: any[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AISeatingPanel: React.FC<AISeatingPanelProps> = ({ eventId, tables, isOpen, onOpenChange }) => {
  const {
    suggestions,
    loading,
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    acceptBatch
  } = useAISeatingsuggestions(eventId);

  const highConfidenceSuggestions = suggestions.filter(s => (s.confidence_score || 0) >= 80);

  const handleAcceptAll = async () => {
    const ids = highConfidenceSuggestions.map(s => s.id);
    await acceptBatch(ids);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#F5F0EB]0" />
            AI Seating Suggestions
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={generateSuggestions}
              disabled={loading}
              variant="default"
              className="flex-1"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Generate New
            </Button>
            {highConfidenceSuggestions.length > 0 && (
              <Button
                onClick={handleAcceptAll}
                variant="outline"
                className="flex-1"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Accept All High ({highConfidenceSuggestions.length})
              </Button>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
              <p className="text-center text-sm text-muted-foreground">
                AI analyzing guests and tables...
              </p>
            </div>
          )}

          {/* Suggestions List */}
          {!loading && suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <AISeatingCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={acceptSuggestion}
                  onReject={rejectSuggestion}
                  currentTables={tables}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && suggestions.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No suggestions yet</p>
              <Button onClick={generateSuggestions} variant="default">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Suggestions
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
