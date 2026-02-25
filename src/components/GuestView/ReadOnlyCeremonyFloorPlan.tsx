import React from 'react';

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
        <span className="text-[10px] leading-tight text-center px-0.5 flex flex-col items-center justify-center text-white">
          <span>{parts[0]}</span>
          <span>{parts.slice(1).join(' ')}</span>
        </span>
      );
    }
    return <span className="text-[10px] leading-tight text-center px-0.5 text-white">{name}</span>;
  };

  const renderSeat = (side: 'left' | 'right', row: number, seat: number) => {
    const name = getSeatName(side, row, seat);
    const isAssignedRow = row <= data.assigned_rows;

    return (
      <div
        key={`${side}-${row}-${seat}`}
        className={`w-12 h-9 rounded border text-[10px] flex items-center justify-center ${
          name
            ? 'border-white/60 font-medium'
            : isAssignedRow
              ? 'border-white/30 text-white/40'
              : 'border-white/15 text-white/25'
        }`}
      >
        {name ? renderName(name) : (
          <span className="text-[9px]">
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
        <div className={`w-12 h-9 rounded border text-[10px] flex items-center justify-center ${
          name ? 'border-white/60 font-medium' : 'border-white/30 text-white/40'
        }`}>
          {name ? renderName(name) : <span className="text-[9px]">{index + 1}</span>}
        </div>
        {role && (
          <span className="text-[8px] text-white/50 italic mt-0.5 truncate max-w-12 text-center">
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
      <div key={`${side}-row-${rowNum}`} className="flex items-center gap-0.5 mb-0.5">
        {data.show_row_numbers && side === 'left' && (
          <span className="w-4 text-[10px] text-white/40 text-right mr-0.5">{rowNum}</span>
        )}
        <div className="flex gap-0.5">{seats}</div>
        {data.show_row_numbers && side === 'right' && (
          <span className="w-4 text-[10px] text-white/40 text-left ml-0.5">{rowNum}</span>
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
        <h4 className="text-xs font-semibold text-white/80 mb-2">
          {side === 'left' ? data.left_side_label : data.right_side_label} ({data.total_rows * data.chairs_per_row})
        </h4>
        <div>{rows}</div>
        {data.assigned_rows < data.total_rows && (
          <div className="w-full mt-1 mb-1">
            <div className="flex items-center gap-1">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-[9px] text-white/40">General Seating</span>
              <div className="flex-1 h-px bg-white/20" />
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

    return (
      <div className="flex items-start justify-center gap-3 flex-wrap">
        {leftCount > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-white/80 mb-1">{leftLabel} ({leftCount})</span>
            <div className="flex flex-col items-center gap-1">
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(leftCount, MAX_PER_ROW) }).map((_, i) => renderBridalPartyBox('left', i))}
              </div>
              {leftCount > MAX_PER_ROW && (
                <div className="flex gap-0.5">
                  {Array.from({ length: leftCount - MAX_PER_ROW }).map((_, i) => renderBridalPartyBox('left', i + MAX_PER_ROW))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 px-1">
          <div className="w-12 h-12 rounded-full border-2 border-white/60 flex items-center justify-center">
            <span className="text-[11px] text-white font-medium text-center leading-tight px-0.5">{leftPersonName}</span>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center">
            <span className="text-[9px] text-white/60 text-center">Celebrant</span>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-white/60 flex items-center justify-center">
            <span className="text-[11px] text-white font-medium text-center leading-tight px-0.5">{rightPersonName}</span>
          </div>
        </div>

        {rightCount > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-white/80 mb-1">{rightLabel} ({rightCount})</span>
            <div className="flex flex-col items-center gap-1">
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(rightCount, MAX_PER_ROW) }).map((_, i) => renderBridalPartyBox('right', i))}
              </div>
              {rightCount > MAX_PER_ROW && (
                <div className="flex gap-0.5">
                  {Array.from({ length: rightCount - MAX_PER_ROW }).map((_, i) => renderBridalPartyBox('right', i + MAX_PER_ROW))}
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
      <div className="flex flex-col items-center space-y-8 min-w-fit">
        {renderBridalParty()}

        <div className="flex items-start justify-center gap-1">
          {renderSide('left')}

          <div className="flex flex-col items-center justify-center px-2 relative min-h-[200px]">
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/20 -translate-x-1/2" />
            <span
              className="text-xs font-bold whitespace-nowrap relative z-10 text-white/60"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.5px' }}
            >
              Aisle
            </span>
          </div>

          {renderSide('right')}
        </div>
      </div>
    </div>
  );
};