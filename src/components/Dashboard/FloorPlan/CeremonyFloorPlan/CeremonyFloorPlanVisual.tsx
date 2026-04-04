/**
 * ⚠️ WARNING: PRODUCTION LOCKED - DO NOT MODIFY ⚠️
 * 
 * This file is part of the Ceremony Floor Plan feature which has been
 * finalized and locked for production use as of 2025-12-21.
 * 
 * ANY MODIFICATIONS require explicit written approval from the project owner.
 * 
 * See CEREMONY_FLOOR_PLAN_SPECS.md for complete technical specifications.
 */

import { useState, KeyboardEvent } from 'react';
import { CeremonyFloorPlan, getDefaultBridalRole } from '@/hooks/useCeremonyFloorPlan';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CeremonyFloorPlanVisualProps {
  floorPlan: CeremonyFloorPlan;
  onSeatUpdate: (side: 'left' | 'right', row: number, seat: number, name: string) => Promise<boolean>;
  getSeatName: (side: 'left' | 'right', row: number, seat: number) => string;
  onBridalPartyUpdate: (side: 'left' | 'right', index: number, name: string) => Promise<boolean>;
  getBridalPartyName: (side: 'left' | 'right', index: number) => string;
  onBridalPartyRoleUpdate: (side: 'left' | 'right', index: number, role: string) => Promise<boolean>;
  getBridalPartyRole: (side: 'left' | 'right', index: number) => string;
}

interface EditingSeat {
  side: 'left' | 'right';
  row: number;
  seat: number;
}

interface EditingBridalParty {
  side: 'left' | 'right';
  index: number;
}

interface EditingRole {
  side: 'left' | 'right';
  index: number;
}

export const CeremonyFloorPlanVisual = ({
  floorPlan,
  onSeatUpdate,
  getSeatName,
  onBridalPartyUpdate,
  getBridalPartyName,
  onBridalPartyRoleUpdate,
  getBridalPartyRole,
}: CeremonyFloorPlanVisualProps) => {
  const [editingSeat, setEditingSeat] = useState<EditingSeat | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingBridalParty, setEditingBridalParty] = useState<EditingBridalParty | null>(null);
  const [editingBridalValue, setEditingBridalValue] = useState('');
  const [editingRole, setEditingRole] = useState<EditingRole | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState('');

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

  const handleBridalPartyClick = (side: 'left' | 'right', index: number) => {
    const currentName = getBridalPartyName(side, index);
    setEditingBridalParty({ side, index });
    setEditingBridalValue(currentName);
  };

  const handleBridalPartySave = async () => {
    if (!editingBridalParty) return;
    
    await onBridalPartyUpdate(editingBridalParty.side, editingBridalParty.index, editingBridalValue);
    setEditingBridalParty(null);
    setEditingBridalValue('');
  };

  const handleBridalPartyKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBridalPartySave();
    } else if (e.key === 'Escape') {
      setEditingBridalParty(null);
      setEditingBridalValue('');
    }
  };

  const handleRoleClick = (side: 'left' | 'right', index: number) => {
    const currentRole = getBridalPartyRole(side, index);
    setEditingRole({ side, index });
    setEditingRoleValue(currentRole);
  };

  const handleRoleSave = async () => {
    if (!editingRole) return;
    
    await onBridalPartyRoleUpdate(editingRole.side, editingRole.index, editingRoleValue);
    setEditingRole(null);
    setEditingRoleValue('');
  };

  const handleRoleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRoleSave();
    } else if (e.key === 'Escape') {
      setEditingRole(null);
      setEditingRoleValue('');
    }
  };

  // Render name with first/surname on two lines if there's a space - BLACK text
  const renderName = (name: string) => {
    if (!name) return null;
    
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return (
        <span className="text-xs leading-tight text-center px-0.5 flex flex-col items-center justify-center text-foreground">
          <span>{parts[0]}</span>
          <span>{parts.slice(1).join(' ')}</span>
        </span>
      );
    }
    return <span className="text-xs leading-tight text-center px-0.5 text-foreground">{name}</span>;
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
          className="w-[72px] h-14 text-xs p-1 text-center"
          placeholder="Name"
        />
      );
    }

    return (
      <div
        key={`${side}-${row}-${seat}`}
        onClick={() => handleSeatClick(side, row, seat)}
        className={cn(
          "w-[72px] h-14 rounded border text-xs flex items-center justify-center transition-all",
          isAssignedRow 
            ? "cursor-pointer hover:border-primary hover:bg-primary/5"
            : "cursor-not-allowed",
          name 
            ? "bg-transparent border-primary font-medium" 
            : isAssignedRow 
              ? "bg-muted/30 border-border text-muted-foreground"
              : "bg-muted/10 border-border/50 text-muted-foreground/50"
        )}
        title={isAssignedRow ? (name || 'Click to assign') : 'General seating'}
      >
        {name ? (
          renderName(name)
        ) : (
          <span className="text-[11px]">
            {floorPlan.show_seat_numbers ? seat : '—'}
          </span>
        )}
      </div>
    );
  };

  const renderBridalPartyBox = (side: 'left' | 'right', index: number) => {
    const isEditingName = editingBridalParty?.side === side && editingBridalParty?.index === index;
    const isEditingRoleLabel = editingRole?.side === side && editingRole?.index === index;
    const name = getBridalPartyName(side, index);
    const role = getBridalPartyRole(side, index);

    return (
      <div key={`bridal-${side}-${index}`} className="flex flex-col items-center">
        {/* Name box */}
        {isEditingName ? (
          <Input
            autoFocus
            value={editingBridalValue}
            onChange={(e) => setEditingBridalValue(e.target.value)}
            onBlur={handleBridalPartySave}
            onKeyDown={handleBridalPartyKeyDown}
          className="w-[72px] h-14 text-xs p-1 text-center"
            placeholder="Name"
          />
        ) : (
          <div
            onClick={() => handleBridalPartyClick(side, index)}
            className={cn(
              "w-[72px] h-14 rounded border text-xs flex items-center justify-center transition-all cursor-pointer hover:border-primary hover:bg-primary/5",
              name 
                ? "bg-transparent border-primary font-medium" 
                : "bg-muted/30 border-border text-muted-foreground"
            )}
            title={name || 'Click to assign'}
          >
            {name ? (
              renderName(name)
            ) : (
              <span className="text-[11px]">{index + 1}</span>
            )}
          </div>
        )}
        
        {/* Role label */}
        {isEditingRoleLabel ? (
          <Input
            autoFocus
            value={editingRoleValue}
            onChange={(e) => setEditingRoleValue(e.target.value)}
            onBlur={handleRoleSave}
            onKeyDown={handleRoleKeyDown}
            className="w-[72px] h-5 text-[10px] p-0.5 text-center mt-0.5"
            placeholder="Role"
          />
        ) : (
          <span
            onClick={() => handleRoleClick(side, index)}
            className="text-[10px] text-muted-foreground italic mt-0.5 cursor-pointer hover:text-primary transition-colors truncate max-w-[72px] text-center"
            title="Click to edit role"
          >
            {role}
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
        <h4 className="text-sm font-semibold text-primary mb-3">
          {side === 'left' ? floorPlan.left_side_label : floorPlan.right_side_label} ({floorPlan.total_rows * floorPlan.chairs_per_row})
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

  const renderBridalParty = () => {
    const leftCount = floorPlan.bridal_party_count_left || 0;
    const rightCount = floorPlan.bridal_party_count_right || 0;

    // Determine labels based on couple arrangement
    const isGroomLeft = floorPlan.couple_side_arrangement !== 'bride_left';
    const leftLabel = isGroomLeft ? 'Groomsmen' : 'Bridesmaids';
    const rightLabel = isGroomLeft ? 'Bridesmaids' : 'Groomsmen';

    // Check if stored names are truly custom (not defaults like "Groom"/"Bride")
    const defaultNames = ['Groom', 'Bride', 'groom', 'bride'];
    const isLeftCustomName = floorPlan.person_left_name && !defaultNames.includes(floorPlan.person_left_name);
    const isRightCustomName = floorPlan.person_right_name && !defaultNames.includes(floorPlan.person_right_name);

    // Derive couple names: use custom names if set, otherwise derive from arrangement
    const leftPersonName = isLeftCustomName 
      ? floorPlan.person_left_name 
      : (isGroomLeft ? 'Groom' : 'Bride');
    const rightPersonName = isRightCustomName 
      ? floorPlan.person_right_name 
      : (isGroomLeft ? 'Bride' : 'Groom');

    // Max 6 per row
    const MAX_PER_ROW = 6;
    const leftFirstRow = Math.min(leftCount, MAX_PER_ROW);
    const leftSecondRow = Math.max(0, leftCount - MAX_PER_ROW);
    const rightFirstRow = Math.min(rightCount, MAX_PER_ROW);
    const rightSecondRow = Math.max(0, rightCount - MAX_PER_ROW);

    return (
      <div className="flex items-start justify-center gap-4">
        {/* Left side bridal party */}
        {leftCount > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-primary mb-2">{leftLabel} ({leftCount})</span>
            <div className="flex flex-col items-center gap-2">
              {/* First row - up to 6 members */}
              <div className="flex gap-1">
                {Array.from({ length: leftFirstRow }).map((_, i) => renderBridalPartyBox('left', i))}
              </div>
              {/* Second row - members 7-12 if they exist */}
              {leftSecondRow > 0 && (
                <div className="flex gap-1">
                  {Array.from({ length: leftSecondRow }).map((_, i) => renderBridalPartyBox('left', i + MAX_PER_ROW))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Center - Left person + Celebrant + Right person */}
        <div className="flex items-center justify-center gap-3 px-2">
          {/* Left person (Groom or Bride depending on arrangement) */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-transparent border-2 border-primary flex items-center justify-center">
              <span className="text-[14px] text-foreground font-medium text-center leading-tight px-1">
                {leftPersonName}
              </span>
            </div>
          </div>
          
          {/* Celebrant (center, stationary) */}
          <div className="w-14 h-14 rounded-full bg-transparent border border-border flex items-center justify-center">
            <span className="text-[11px] text-muted-foreground text-center">Celebrant</span>
          </div>
          
          {/* Right person (Bride or Groom depending on arrangement) */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-transparent border-2 border-primary flex items-center justify-center">
              <span className="text-[14px] text-foreground font-medium text-center leading-tight px-1">
                {rightPersonName}
              </span>
            </div>
          </div>
        </div>

        {/* Right side bridal party */}
        {rightCount > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-primary mb-2">{rightLabel} ({rightCount})</span>
            <div className="flex flex-col items-center gap-2">
              {/* First row - up to 6 members */}
              <div className="flex gap-1">
                {Array.from({ length: rightFirstRow }).map((_, i) => renderBridalPartyBox('right', i))}
              </div>
              {/* Second row - members 7-12 if they exist */}
              {rightSecondRow > 0 && (
                <div className="flex gap-1">
                  {Array.from({ length: rightSecondRow }).map((_, i) => renderBridalPartyBox('right', i + MAX_PER_ROW))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center space-y-16">
      {/* Bridal Party Area */}
      {renderBridalParty()}

      {/* Seating Area */}
      <div className="flex items-start justify-center gap-1 lg:gap-2">
        {/* Left Side */}
        {renderSide('left')}

        {/* Center Aisle with vertical line and walkway text */}
        <div className="flex flex-col items-center justify-center h-full px-4 relative min-h-[300px]">
          {/* Vertical aisle line */}
          <div className="absolute inset-y-0 left-1/2 w-px bg-border -translate-x-1/2" />
          {/* Walkway text - rotated to match PDF style */}
          <span 
            className="text-sm font-bold whitespace-nowrap relative z-10"
            style={{ 
              writingMode: 'vertical-rl', 
              transform: 'rotate(180deg)',
              color: 'hsl(262, 83%, 58%)',
              letterSpacing: '0.5px'
            }}
          >
            Bride's Walkway - Aisle
          </span>
        </div>

        {/* Right Side */}
        {renderSide('right')}
      </div>

    </div>
  );
};