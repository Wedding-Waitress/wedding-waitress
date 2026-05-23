import { useCallback, useMemo, useRef, useState } from 'react';
import { Lock, Unlock, RotateCw, Trash2 } from 'lucide-react';
import type { ReceptionTable } from '@/hooks/useReceptionTables';
import type { ReceptionFloorPlan, TablePosition } from '@/hooks/useReceptionFloorPlan';

const PX_PER_M = 50; // visual scale

interface Props {
  plan: ReceptionFloorPlan;
  tables: ReceptionTable[];
  onChange: (mutator: (p: ReceptionFloorPlan) => ReceptionFloorPlan) => void;
}

export const ReceptionFloorPlanCanvas = ({ plan, tables, onChange }: Props) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragState = useRef<{ table_id: string; offsetX: number; offsetY: number } | null>(null);

  const placedIds = useMemo(
    () => new Set(plan.table_positions.map((p) => p.table_id)),
    [plan.table_positions]
  );
  const unplacedTables = tables.filter((t) => !placedIds.has(t.id));
  const tableById = useMemo(() => {
    const m = new Map<string, ReceptionTable>();
    tables.forEach((t) => m.set(t.id, t));
    return m;
  }, [tables]);

  const roomW = plan.room_width_m * PX_PER_M;
  const roomH = plan.room_length_m * PX_PER_M;
  const gridPx = (plan.grid_size_cm / 100) * PX_PER_M;

  // ---- palette → canvas drop
  const handlePaletteDragStart = (e: React.DragEvent, tableId: string) => {
    e.dataTransfer.setData('text/reception-table-id', tableId);
    e.dataTransfer.effectAllowed = 'copy';
  };
  const handleCanvasDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('text/reception-table-id')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };
  const handleCanvasDrop = (e: React.DragEvent) => {
    const tableId = e.dataTransfer.getData('text/reception-table-id');
    if (!tableId) return;
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / PX_PER_M;
    const y = (e.clientY - rect.top) / PX_PER_M;
    onChange((p) => ({
      ...p,
      table_positions: [
        ...p.table_positions,
        {
          table_id: tableId,
          x: Math.max(0.5, Math.min(p.room_width_m - 0.5, x)),
          y: Math.max(0.5, Math.min(p.room_length_m - 0.5, y)),
          rotation: 0,
          locked: false,
        },
      ],
    }));
  };

  // ---- placed table pointer drag
  const handleTablePointerDown = (
    e: React.PointerEvent,
    pos: TablePosition
  ) => {
    if (pos.locked) {
      setSelectedId(pos.table_id);
      return;
    }
    setSelectedId(pos.table_id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragState.current = {
      table_id: pos.table_id,
      offsetX: e.clientX - (rect.left + pos.x * PX_PER_M),
      offsetY: e.clientY - (rect.top + pos.y * PX_PER_M),
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const handleTablePointerMove = (e: React.PointerEvent) => {
    const d = dragState.current;
    if (!d) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left - d.offsetX) / PX_PER_M;
    const y = (e.clientY - rect.top - d.offsetY) / PX_PER_M;
    onChange((p) => ({
      ...p,
      table_positions: p.table_positions.map((tp) =>
        tp.table_id === d.table_id
          ? {
              ...tp,
              x: Math.max(0.5, Math.min(p.room_width_m - 0.5, x)),
              y: Math.max(0.5, Math.min(p.room_length_m - 0.5, y)),
            }
          : tp
      ),
    }));
  };
  const handleTablePointerUp = () => {
    dragState.current = null;
  };

  const rotateTable = useCallback(
    (id: string) =>
      onChange((p) => ({
        ...p,
        table_positions: p.table_positions.map((tp) =>
          tp.table_id === id ? { ...tp, rotation: (tp.rotation + 15) % 360 } : tp
        ),
      })),
    [onChange]
  );
  const toggleLock = useCallback(
    (id: string) =>
      onChange((p) => ({
        ...p,
        table_positions: p.table_positions.map((tp) =>
          tp.table_id === id ? { ...tp, locked: !tp.locked } : tp
        ),
      })),
    [onChange]
  );
  const removeTable = useCallback(
    (id: string) =>
      onChange((p) => ({
        ...p,
        table_positions: p.table_positions.filter((tp) => tp.table_id !== id),
      })),
    [onChange]
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Palette */}
      <aside className="lg:w-56 shrink-0 rounded-lg border border-border bg-card p-3">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Tables to place ({unplacedTables.length})
        </h3>
        {unplacedTables.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            All synced tables placed.
          </p>
        ) : (
          <ul className="space-y-2">
            {unplacedTables.map((t) => (
              <li
                key={t.id}
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, t.id)}
                className="cursor-grab active:cursor-grabbing rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary transition-colors select-none"
              >
                <div className="font-medium truncate">
                  {t.name || `Table ${t.table_no}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.limit_seats} seats
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Canvas */}
      <div className="flex-1 overflow-auto rounded-lg border border-border bg-muted/20 p-4">
        <div
          ref={canvasRef}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
          className="relative bg-white border-2 border-foreground/70 shadow-inner"
          style={{
            width: roomW,
            height: roomH,
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
            backgroundSize: `${gridPx}px ${gridPx}px`,
          }}
        >
          {plan.table_positions.map((pos) => {
            const t = tableById.get(pos.table_id);
            if (!t) return null;
            return (
              <PlacedTable
                key={pos.table_id}
                pos={pos}
                table={t}
                selected={selectedId === pos.table_id}
                onPointerDown={(e) => handleTablePointerDown(e, pos)}
                onPointerMove={handleTablePointerMove}
                onPointerUp={handleTablePointerUp}
                onRotate={() => rotateTable(pos.table_id)}
                onToggleLock={() => toggleLock(pos.table_id)}
                onRemove={() => removeTable(pos.table_id)}
              />
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Room: {plan.room_width_m}m × {plan.room_length_m}m · grid{' '}
          {plan.grid_size_cm}cm · scale {PX_PER_M}px/m
        </p>
      </div>
    </div>
  );
};

// ---------- PlacedTable ----------
interface PlacedProps {
  pos: TablePosition;
  table: ReceptionTable;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onRotate: () => void;
  onToggleLock: () => void;
  onRemove: () => void;
}

const PlacedTable = ({
  pos,
  table,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRotate,
  onToggleLock,
  onRemove,
}: PlacedProps) => {
  // Round table sized by seat count; min 1.2m, +0.12m per seat above 6
  const diameterM = Math.max(1.2, 1.2 + Math.max(0, table.limit_seats - 6) * 0.12);
  const diameterPx = diameterM * PX_PER_M;
  const chairSize = 16;
  const chairOffset = diameterPx / 2 + 10;

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x * PX_PER_M,
        top: pos.y * PX_PER_M,
        transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
        width: diameterPx,
        height: diameterPx,
        touchAction: 'none',
      }}
      className="group"
    >
      {/* Chairs */}
      {Array.from({ length: table.limit_seats }).map((_, i) => {
        const angle = (i / table.limit_seats) * 2 * Math.PI - Math.PI / 2;
        const cx = diameterPx / 2 + Math.cos(angle) * chairOffset - chairSize / 2;
        const cy = diameterPx / 2 + Math.sin(angle) * chairOffset - chairSize / 2;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: cx,
              top: cy,
              width: chairSize,
              height: chairSize,
            }}
            className="rounded-sm bg-[#967A59]/70 border border-[#7a6347]"
          />
        );
      })}

      {/* Table body */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`absolute inset-0 rounded-full flex items-center justify-center text-xs font-semibold text-white shadow-md ${
          pos.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
        } ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
        style={{ backgroundColor: '#967A59' }}
      >
        <span className="px-1 text-center leading-tight pointer-events-none">
          {table.name || `T${table.table_no}`}
        </span>
      </div>

      {/* Controls */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: -36,
            left: '50%',
            transform: `translateX(-50%) rotate(${-pos.rotation}deg)`,
          }}
          className="flex items-center gap-1 bg-card border border-border rounded-md shadow-md px-1 py-1"
        >
          <button
            onClick={onRotate}
            className="lv-premium-shade p-1 rounded hover:bg-muted text-foreground"
            title="Rotate 15°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleLock}
            className="lv-premium-shade p-1 rounded hover:bg-muted text-foreground"
            title={pos.locked ? 'Unlock' : 'Lock'}
          >
            {pos.locked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={onRemove}
            className="lv-premium-shade p-1 rounded hover:bg-destructive/10 text-destructive"
            title="Remove from floor"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
