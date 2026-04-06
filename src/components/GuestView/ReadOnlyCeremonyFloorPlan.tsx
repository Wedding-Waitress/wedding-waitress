import React from 'react';
import { cn } from '@/lib/utils';

interface FloorPlanData {
  chairs_per_row: number;
  total_rows: number;
  assigned_rows: number;
  left_side_label: string;
  right_side_label: string;
  altar_label: string;
  seat_assignments: any[];
  show_row_numbers: boolean;
  show_seat_numbers: boolean;
  bridal_party_left: any[] | null;
  bridal_party_right: any[] | null;
  bridal_party_count_left: number | null;
  bridal_party_count_right: number | null;
  bridal_party_roles_left: any[] | null;
  bridal_party_roles_right: any[] | null;
  couple_side_arrangement: string | null;
  person_left_name: string | null;
  person_right_name: string | null;
}

interface ReadOnlyCeremonyFloorPlanProps {
  data: FloorPlanData;
}

export const ReadOnlyCeremonyFloorPlan: React.FC<ReadOnlyCeremonyFloorPlanProps> = ({ data }) => {
  const getSeatName = (side: 'left' | 'right', row: number, seat: number): string => {
    if (!data.seat_assignments || !Array.isArray(data.seat_assignments)) return '';
    const assignment = data.seat_assignments.find(
      (a: any) => a.side === side && a.row === row && a.seat === seat
    );
    return assignment?.name || '';
  };

  const getBridalPartyName = (side: 'left' | 'right', index: number): string => {
    const arr = side === 'left' ? data.bridal_party_left : data.bridal_party_right;
    if (!arr || !Array.isArray(arr)) return '';
    return (arr[index] as string) || '';
  };

  const getBridalPartyRole = (side: 'left' | 'right', index: number): string => {
    const arr = side === 'left' ? data.bridal_party_roles_left : data.bridal_party_roles_right;
    if (!arr || !Array.isArray(arr)) return '';
    return (arr[index] as string) || '';
  };

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
    const name = getSeatName(side, row, seat);
    const isAssignedRow = row <= data.assigned_rows;

    return (
      <div
        key={`${side}-${row}-${seat}`}
        className={cn(
          "w-[72px] h-14 rounded border text-xs flex items-center justify-center",
          name
            ? "bg-primary/5 border-primary font-medium"
            : isAssignedRow
              ? "bg-primary/10 border-primary/30 text-muted-foreground"
              : "bg-muted/10 border-border/50 text-muted-foreground/50"
        )}
      >
        {name ? renderName(name) : (
          <span className="text-[11px]">
            {data.show_seat_numbers ? seat : '—'}
          </span>
        )}
      </div>
    );
  };

  const renderBridalPartyBox = (side: 'left' | 'right', index: number) => {
    const name = getBridalPartyName(side, index);
    const role = getBridalPartyRole(side, index);

    return (
      <div key={`bridal-${side}-${index}`} className="flex flex-col items-center">
        <div
          className={cn(
            "w-[72px] h-14 rounded border text-xs flex items-center justify-center",
            name
              ? "bg-transparent border-primary font-medium"
              : "bg-muted/30 border-border text-muted-foreground"
          )}
        >
          {name ? renderName(name) : <span className="text-[11px]">{index + 1}</span>}
        </div>
        {role && (
          <span className="text-[10px] text-foreground mt-0.5 truncate max-w-[72px] text-center">
            {role}
          </span>
        )}
      </div>
    );
  };

  const renderRow = (side: 'left' | 'right', rowNum: number) => {
    const seats = [];
    for (let s = 1; s <= data.chairs_per_row; s++) {
      seats.push(renderSeat(side, rowNum, s));
    }

    return (
      <div key={`${side}-row-${rowNum}`} className="flex items-center gap-1 mb-1">
        {data.show_row_numbers && side === 'left' && (
          <span className="w-6 text-xs text-muted-foreground text-right mr-1">{rowNum}</span>
        )}
        <div className="flex gap-1">{seats}</div>
        {data.show_row_numbers && side === 'right' && (
          <span className="w-6 text-xs text-muted-foreground text-left ml-1">{rowNum}</span>
        )}
      </div>
    );
  };

  const renderSide = (side: 'left' | 'right') => {
    const rows = [];
    for (let r = 1; r <= data.total_rows; r++) {
      rows.push(renderRow(side, r));
    }

    return (
      <div className="flex flex-col items-center">
        <h4 className="text-sm font-semibold text-primary mb-3">
          {side === 'left' ? data.left_side_label : data.right_side_label} ({data.total_rows * data.chairs_per_row})
        </h4>
        <div>{rows}</div>
        {data.assigned_rows < data.total_rows && (
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
    const leftCount = data.bridal_party_count_left || 0;
    const rightCount = data.bridal_party_count_right || 0;
    const isGroomLeft = data.couple_side_arrangement !== 'bride_left';
    const leftLabel = isGroomLeft ? 'Groomsmen' : 'Bridesmaids';
    const rightLabel = isGroomLeft ? 'Bridesmaids' : 'Groomsmen';

    const defaultNames = ['Groom', 'Bride', 'groom', 'bride'];
    const leftPersonName = (data.person_left_name && !defaultNames.includes(data.person_left_name))
      ? data.person_left_name
      : (isGroomLeft ? 'Groom' : 'Bride');
    const rightPersonName = (data.person_right_name && !defaultNames.includes(data.person_right_name))
      ? data.person_right_name
      : (isGroomLeft ? 'Bride' : 'Groom');

    const MAX_PER_ROW = 6;
    const leftFirstRow = Math.min(leftCount, MAX_PER_ROW);
    const leftSecondRow = Math.max(0, leftCount - MAX_PER_ROW);
    const rightFirstRow = Math.min(rightCount, MAX_PER_ROW);
    const rightSecondRow = Math.max(0, rightCount - MAX_PER_ROW);

    return (
      <div className="flex items-start justify-center gap-4">
        {leftCount > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-primary mb-2">{leftLabel} ({leftCount})</span>
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: leftFirstRow }).map((_, i) => renderBridalPartyBox('left', i))}
              </div>
              {leftSecondRow > 0 && (
                <div className="flex gap-1">
                  {Array.from({ length: leftSecondRow }).map((_, i) => renderBridalPartyBox('left', i + MAX_PER_ROW))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 px-2">
          <div className="flex flex-col items-center">
            <div className="w-[72px] h-[72px] rounded-full bg-transparent border-2 border-primary flex items-center justify-center">
              <span className="text-[15px] text-foreground font-medium text-center leading-tight px-1">
                {leftPersonName}
              </span>
            </div>
          </div>

          <div className="w-16 h-16 rounded-full bg-transparent border border-border flex items-center justify-center">
            <span className="text-xs text-muted-foreground text-center">Celebrant</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-[72px] h-[72px] rounded-full bg-transparent border-2 border-primary flex items-center justify-center">
              <span className="text-[15px] text-foreground font-medium text-center leading-tight px-1">
                {rightPersonName}
              </span>
            </div>
          </div>
        </div>

        {rightCount > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-primary mb-2">{rightLabel} ({rightCount})</span>
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: rightFirstRow }).map((_, i) => renderBridalPartyBox('right', i))}
              </div>
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
    <div className="overflow-x-auto pb-4">
      <div className="flex flex-col items-center space-y-16 min-w-fit">
        {renderBridalParty()}

        <div className="flex items-start justify-center gap-1 lg:gap-2">
          {renderSide('left')}

          <div className="flex flex-col items-center justify-center h-full px-4 relative min-h-[300px]">
            <div className="absolute inset-y-0 left-1/2 w-px bg-border -translate-x-1/2" />
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

          {renderSide('right')}
        </div>
      </div>
    </div>
  );
};
