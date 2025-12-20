import { useState, KeyboardEvent } from 'react';
import { CeremonyFloorPlan } from '@/hooks/useCeremonyFloorPlan';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CeremonyFloorPlanVisualProps {
  floorPlan: CeremonyFloorPlan;
  onSeatUpdate: (side: 'left' | 'right', row: number, seat: number, name: string) => Promise<boolean>;
  getSeatName: (side: 'left' | 'right', row: number, seat: number) => string;
}

interface EditingSeat {
  side: 'left' | 'right';
  row: number;
  seat: number;
}

export const CeremonyFloorPlanVisual = ({
  floorPlan,
  onSeatUpdate,
  getSeatName,
}: CeremonyFloorPlanVisualProps) => {
  const [editingSeat, setEditingSeat] = useState<EditingSeat | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const handleSeatClick = (side: 'left' | 'right', row: number, seat: number) => {
    if (row > floorPlan.assigned_rows) return; // Only allow editing assigned rows
    
    const currentName = getSeatName(side, row, seat);
    setEditingSeat({ side, row, seat });
    setEditingValue(currentName);
  };

  const handleSeatSave = async () => {
    if (!editingSeat) return;
    
    await onSeatUpdate(editingSeat.side, editingSeat.row, editingSeat.seat, editingValue);
    setEditingSeat(null);
    setEditingValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSeatSave();
    } else if (e.key === 'Escape') {
      setEditingSeat(null);
      setEditingValue('');
    }
  };

  const renderSeat = (side: 'left' | 'right', row: number, seat: number) => {
    const isEditing = editingSeat?.side === side && editingSeat?.row === row && editingSeat?.seat === seat;
    const name = getSeatName(side, row, seat);
    const isAssignedRow = row <= floorPlan.assigned_rows;
    
    if (isEditing) {
      return (
        <Input
          key={`${side}-${row}-${seat}`}
          autoFocus
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={handleSeatSave}
          onKeyDown={handleKeyDown}
          className="w-16 h-8 text-xs p-1 text-center"
          placeholder="Name"
        />
      );
    }

    return (
      <div
        key={`${side}-${row}-${seat}`}
        onClick={() => handleSeatClick(side, row, seat)}
        className={cn(
          "w-16 h-8 rounded border text-xs flex items-center justify-center transition-all",
          isAssignedRow 
            ? "cursor-pointer hover:border-primary hover:bg-primary/5"
            : "cursor-not-allowed",
          name 
            ? "bg-primary/10 border-primary text-primary font-medium" 
            : isAssignedRow 
              ? "bg-muted/30 border-border text-muted-foreground"
              : "bg-muted/10 border-border/50 text-muted-foreground/50"
        )}
        title={isAssignedRow ? (name || 'Click to assign') : 'General seating'}
      >
        {name ? (
          <span className="truncate px-1">{name}</span>
        ) : (
          <span className="text-[10px]">
            {floorPlan.show_seat_numbers ? seat : '—'}
          </span>
        )}
      </div>
    );
  };

  const renderRow = (side: 'left' | 'right', rowNum: number) => {
    const seats = [];
    for (let s = 1; s <= floorPlan.chairs_per_row; s++) {
      seats.push(renderSeat(side, rowNum, s));
    }
    
    return (
      <div key={`${side}-row-${rowNum}`} className="flex items-center gap-1 mb-1">
        {/* Row number on LEFT for left side (Groom's Family) */}
        {floorPlan.show_row_numbers && side === 'left' && (
          <span className="w-6 text-xs text-muted-foreground text-right mr-1">
            {rowNum}
          </span>
        )}
        <div className="flex gap-1">
          {seats}
        </div>
        {/* Row number on RIGHT for right side (Bride's Family) */}
        {floorPlan.show_row_numbers && side === 'right' && (
          <span className="w-6 text-xs text-muted-foreground text-left ml-1">
            {rowNum}
          </span>
        )}
      </div>
    );
  };

  const renderSide = (side: 'left' | 'right') => {
    const rows = [];
    for (let r = 1; r <= floorPlan.total_rows; r++) {
      rows.push(renderRow(side, r));
    }
    
    return (
      <div className="flex flex-col items-center">
        <h4 className="text-sm font-semibold text-foreground mb-3">
          {side === 'left' ? floorPlan.left_side_label : floorPlan.right_side_label}
        </h4>
        <div>
          {rows}
        </div>
        {/* Separator for assigned vs general seating */}
        {floorPlan.assigned_rows < floorPlan.total_rows && (
          <div className="w-full mt-1 mb-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-[10px] text-muted-foreground">General Seating</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Altar */}
      <div className="w-full max-w-md">
        <div className="bg-primary text-primary-foreground rounded-lg py-3 px-6 text-center shadow-md">
          <span className="text-sm font-semibold uppercase tracking-wide">
            {floorPlan.altar_label}
          </span>
          <p className="text-xs opacity-80 mt-1">Celebrant, Bride & Groom</p>
        </div>
      </div>

      {/* Aisle indicator */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="w-8 h-px bg-border" />
        <span className="text-xs">Aisle</span>
        <div className="w-8 h-px bg-border" />
      </div>

      {/* Seating Area */}
      <div className="flex items-start justify-center gap-4 lg:gap-8">
        {/* Left Side */}
        {renderSide('left')}

        {/* Center Aisle */}
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-px bg-border h-full min-h-[200px]" />
          <span className="text-xs text-muted-foreground rotate-90 whitespace-nowrap mt-4">
            ↑ Bride's Walkway ↑
          </span>
        </div>

        {/* Right Side */}
        {renderSide('right')}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 pt-4 border-t border-border w-full justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/10 border border-primary" />
          <span className="text-xs text-muted-foreground">Assigned Seat</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted/30 border border-border" />
          <span className="text-xs text-muted-foreground">Click to Assign</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted/10 border border-border/50" />
          <span className="text-xs text-muted-foreground">General Seating</span>
        </div>
      </div>
    </div>
  );
};
