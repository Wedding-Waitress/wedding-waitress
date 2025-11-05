import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, ArrowRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface AISeatingCardProps {
  suggestion: {
    id: string;
    confidence_score: number | null;
    reasoning: string | null;
    guest?: {
      first_name: string;
      last_name: string;
      table_id: string | null;
    };
    suggested_table?: {
      name: string;
      table_no: number;
    };
  };
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  currentTables: any[];
}

export const AISeatingCard: React.FC<AISeatingCardProps> = ({
  suggestion,
  onAccept,
  onReject,
  currentTables
}) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const currentTable = currentTables.find(t => t.id === suggestion.guest?.table_id);
  const guestName = suggestion.guest 
    ? `${suggestion.guest.first_name} ${suggestion.guest.last_name}`
    : 'Unknown Guest';

  return (
    <Card className="ww-box">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Guest and Confidence */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{guestName}</p>
              <p className="text-sm text-muted-foreground">
                {currentTable ? currentTable.name : 'Unassigned'}
              </p>
            </div>
            <Badge className={`${getConfidenceColor(suggestion.confidence_score || 0)} text-white`}>
              {suggestion.confidence_score || 0}%
            </Badge>
          </div>

          {/* Arrow and Suggested Table */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {currentTable ? currentTable.name : 'No table'}
            </span>
            <ArrowRight className="w-4 h-4 text-primary" />
            <span className="font-medium text-primary">
              {suggestion.suggested_table?.name || 'Table'}
            </span>
          </div>

          {/* Reasoning */}
          <Collapsible>
            <CollapsibleTrigger className="text-sm text-muted-foreground hover:text-foreground">
              View reasoning →
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                {suggestion.reasoning}
              </p>
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onAccept(suggestion.id)}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(suggestion.id)}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
