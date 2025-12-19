import React from 'react';
import { Button } from "@/components/ui/enhanced-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Users } from "lucide-react";
import { TableWithGuestCount } from '@/hooks/useTables';

interface BulkMoveBarProps {
  selectedCount: number;
  tables: TableWithGuestCount[];
  onMove: (destTableId: string | null) => Promise<void>;
  onClear: () => void;
  isMoving: boolean;
}

export const BulkMoveBar: React.FC<BulkMoveBarProps> = ({
  selectedCount,
  tables,
  onMove,
  onClear,
  isMoving,
}) => {
  const [selectedDestination, setSelectedDestination] = React.useState<string>('');

  const handleMove = async () => {
    if (!selectedDestination) return;
    const destTableId = selectedDestination === 'unassigned' ? null : selectedDestination;
    await onMove(destTableId);
    setSelectedDestination('');
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-3 bg-card/95 backdrop-blur-sm border-2 border-primary shadow-xl rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-primary" />
          <span>{selectedCount} guest{selectedCount !== 1 ? 's' : ''} selected</span>
        </div>
        
        <div className="h-6 w-px bg-border" />
        
        <Select 
          value={selectedDestination} 
          onValueChange={setSelectedDestination}
          disabled={isMoving}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Move to..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">
              <span className="flex items-center gap-2">
                Unassigned
              </span>
            </SelectItem>
            {tables.map(table => (
              <SelectItem key={table.id} value={table.id}>
                <span className="flex items-center justify-between gap-2 w-full">
                  <span>{table.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({table.guest_count}/{table.limit_seats})
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button 
          size="sm" 
          onClick={handleMove}
          disabled={!selectedDestination || isMoving}
          className="h-9"
        >
          {isMoving ? 'Moving...' : 'Move'}
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClear}
          disabled={isMoving}
          className="h-9 w-9 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
