import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Unlock, RotateCw, Trash2, StickyNote } from 'lucide-react';

import { PinchZoomContainer } from '@/components/ui/PinchZoomContainer';
import type { ReceptionTable } from '@/hooks/useReceptionTables';
import type {
  ReceptionFloorPlan,
  TablePosition,
  Fixture,
  ReceptionBackground,
} from '@/hooks/useReceptionFloorPlan';
import { FIXTURE_CATALOG, FIXTURE_BY_TYPE, type FixtureType } from './fixtures';
import { snapPoint, buildRoomSnapTargets, type SnapTarget } from '@/lib/floorPlanSnap';
import { polygonToSvgPath } from '@/lib/floorPlanShapes';
import { AlignmentGuides } from './AlignmentGuides';


const PX_PER_M = 50; // visual scale

type SelectedKind = 'table' | 'fixture' | 'background';
interface Selection {
  kind: SelectedKind;
  id: string;
}

interface Props {
  plan: ReceptionFloorPlan;
  tables: ReceptionTable[];
  backgroundUrl: string | null;
  onChange: (mutator: (p: ReceptionFloorPlan) => ReceptionFloorPlan) => void;
}

export const ReceptionFloorPlanCanvas = ({
  plan,
  tables,
  backgroundUrl,
  onChange,
}: Props) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [guides, setGuides] = useState<SnapTarget[]>([]);
  const altDownRef = useRef(false);
  const dragState = useRef<
    | { kind: SelectedKind; id: string; offsetX: number; offsetY: number }
    | null
  >(null);
  const resizeState = useRef<
    | {
        startClientX: number;
        startClientY: number;
        startW: number;
        startH: number;
        aspect: number;
      }
    | null
  >(null);

  // Track Alt key globally so snapping can be disabled mid-drag.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Alt') altDownRef.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Alt') altDownRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

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
  const polygonPath = plan.room_polygon ? polygonToSvgPath(plan.room_polygon, PX_PER_M) : '';

  // ---- palette → canvas drop (tables + fixtures)
  const handleTableDragStart = (e: React.DragEvent, tableId: string) => {
    e.dataTransfer.setData('text/reception-table-id', tableId);
    e.dataTransfer.effectAllowed = 'copy';
  };
  const handleFixtureDragStart = (e: React.DragEvent, type: FixtureType) => {
    e.dataTransfer.setData('text/reception-fixture-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };
  const handleCanvasDragOver = (e: React.DragEvent) => {
    const types = e.dataTransfer.types;
    if (
      types.includes('text/reception-table-id') ||
      types.includes('text/reception-fixture-type')
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };
  const handleCanvasDrop = (e: React.DragEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / PX_PER_M;
    const y = (e.clientY - rect.top) / PX_PER_M;

    const tableId = e.dataTransfer.getData('text/reception-table-id');
    if (tableId) {
      e.preventDefault();
      onChange((p) => ({
        ...p,
        table_positions: [
          ...p.table_positions,
          {
            table_id: tableId,
            x: clamp(x, 0.5, p.room_width_m - 0.5),
            y: clamp(y, 0.5, p.room_length_m - 0.5),
            rotation: 0,
            locked: false,
          },
        ],
      }));
      return;
    }

    const fxType = e.dataTransfer.getData('text/reception-fixture-type') as FixtureType;
    if (fxType && FIXTURE_BY_TYPE[fxType]) {
      e.preventDefault();
      const spec = FIXTURE_BY_TYPE[fxType];
      onChange((p) => ({
        ...p,
        fixtures: [
          ...p.fixtures,
          {
            id: crypto.randomUUID(),
            type: fxType,
            x: clamp(x, spec.width_m / 2, p.room_width_m - spec.width_m / 2),
            y: clamp(y, spec.height_m / 2, p.room_length_m - spec.height_m / 2),
            width_m: spec.width_m,
            height_m: spec.height_m,
            rotation: 0,
            locked: false,
          },
        ],
      }));
    }
  };

  // ---- pointer drag (tables + fixtures + background)
  const handlePointerDown = (
    e: React.PointerEvent,
    kind: SelectedKind,
    id: string,
    refX: number,
    refY: number,
    locked: boolean
  ) => {
    setSelection({ kind, id });
    if (locked) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragState.current = {
      kind,
      id,
      offsetX: e.clientX - (rect.left + refX * PX_PER_M),
      offsetY: e.clientY - (rect.top + refY * PX_PER_M),
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    // Resize background?
    if (resizeState.current) {
      const r = resizeState.current;
      const dxPx = e.clientX - r.startClientX;
      // Drive by horizontal delta, derive height from aspect ratio
      const newWPx = Math.max(40, r.startW + dxPx);
      const newHPx = newWPx / r.aspect;
      onChange((p) => ({
        ...p,
        background: {
          ...p.background,
          width: newWPx / PX_PER_M,
          height: newHPx / PX_PER_M,
        },
      }));
      return;
    }
    const d = dragState.current;
    if (!d) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left - d.offsetX) / PX_PER_M;
    const y = (e.clientY - rect.top - d.offsetY) / PX_PER_M;
    if (d.kind === 'table') {
      const snap = computeSnap(
        x,
        y,
        plan,
        { excludeTableId: d.id },
        altDownRef.current
      );
      setGuides(snap.guides);
      onChange((p) => ({
        ...p,
        table_positions: p.table_positions.map((tp) =>
          tp.table_id === d.id
            ? {
                ...tp,
                x: clamp(snap.x, 0.5, p.room_width_m - 0.5),
                y: clamp(snap.y, 0.5, p.room_length_m - 0.5),
              }
            : tp
        ),
      }));
    } else if (d.kind === 'fixture') {
      const snap = computeSnap(
        x,
        y,
        plan,
        { excludeFixtureId: d.id },
        altDownRef.current
      );
      setGuides(snap.guides);
      onChange((p) => ({
        ...p,
        fixtures: p.fixtures.map((fx) =>
          fx.id === d.id
            ? {
                ...fx,
                x: clamp(snap.x, fx.width_m / 2, p.room_width_m - fx.width_m / 2),
                y: clamp(snap.y, fx.height_m / 2, p.room_length_m - fx.height_m / 2),
              }
            : fx
        ),
      }));
    } else {
      // background — top-left positioning with generous bounds (no snapping)
      onChange((p) => ({
        ...p,
        background: {
          ...p.background,
          x: clamp(x, -p.room_width_m, p.room_width_m * 2),
          y: clamp(y, -p.room_length_m, p.room_length_m * 2),
        },
      }));
    }
  };
  const handlePointerUp = () => {
    dragState.current = null;
    resizeState.current = null;
    setGuides([]);
  };

  // Build snap candidates from plan; returns x/y snapped + visible guides.
  const computeSnap = (
    rawX: number,
    rawY: number,
    p: ReceptionFloorPlan,
    opts: { excludeTableId?: string; excludeFixtureId?: string },
    disabled: boolean
  ) => {
    if (disabled) return { x: rawX, y: rawY, guides: [] as SnapTarget[] };
    const threshold = 0.15; // 15cm
    const extraX: number[] = [];
    const extraY: number[] = [];
    p.table_positions.forEach((tp) => {
      if (tp.table_id === opts.excludeTableId) return;
      extraX.push(tp.x);
      extraY.push(tp.y);
    });
    p.fixtures.forEach((fx) => {
      if (fx.id === opts.excludeFixtureId) return;
      extraX.push(fx.x);
      extraY.push(fx.y);
    });
    const { targetsX, targetsY } = buildRoomSnapTargets(
      {
        width: p.room_width_m,
        height: p.room_length_m,
        gridSizeM: p.grid_size_cm / 100,
        extraTargetsX: extraX,
        extraTargetsY: extraY,
      },
      { x: rawX, y: rawY },
      threshold
    );
    return snapPoint({ x: rawX, y: rawY, targetsX, targetsY, threshold });
  };

  // ---- table actions
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
  const toggleLockTable = useCallback(
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

  // ---- fixture actions
  const rotateFixture = useCallback(
    (id: string) =>
      onChange((p) => ({
        ...p,
        fixtures: p.fixtures.map((fx) =>
          fx.id === id ? { ...fx, rotation: (fx.rotation + 15) % 360 } : fx
        ),
      })),
    [onChange]
  );
  const toggleLockFixture = useCallback(
    (id: string) =>
      onChange((p) => ({
        ...p,
        fixtures: p.fixtures.map((fx) =>
          fx.id === id ? { ...fx, locked: !fx.locked } : fx
        ),
      })),
    [onChange]
  );
  const removeFixture = useCallback(
    (id: string) =>
      onChange((p) => ({
        ...p,
        fixtures: p.fixtures.filter((fx) => fx.id !== id),
      })),
    [onChange]
  );

  // ---- background actions
  const rotateBackground = useCallback(
    () =>
      onChange((p) => ({
        ...p,
        background: { ...p.background, rotation: (p.background.rotation + 15) % 360 },
      })),
    [onChange]
  );
  const toggleLockBackground = useCallback(
    () =>
      onChange((p) => ({
        ...p,
        background: { ...p.background, locked: !p.background.locked },
      })),
    [onChange]
  );

  const startBackgroundResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (plan.background.locked || !plan.background.width || !plan.background.height) return;
    const wPx = plan.background.width * PX_PER_M;
    const hPx = plan.background.height * PX_PER_M;
    resizeState.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startW: wPx,
      startH: hPx,
      aspect: wPx / hPx,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const bg = plan.background;
  const showBackground =
    !!backgroundUrl && bg.visible && bg.width != null && bg.height != null;
  const bgSelected = selection?.kind === 'background';

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left palettes */}
      <aside className="lg:w-64 shrink-0 space-y-4">
        {/* Tables palette */}
        <div className="rounded-lg border border-border bg-card p-3 max-lg:p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Tables to place ({unplacedTables.length})
          </h3>
          {unplacedTables.length === 0 ? (
            <p className="text-xs text-muted-foreground">All synced tables placed.</p>
          ) : (
            <ul className="space-y-2 max-lg:grid max-lg:grid-cols-2 max-lg:gap-2 max-lg:space-y-0">
              {unplacedTables.map((t) => (
                <li
                  key={t.id}
                  draggable
                  onDragStart={(e) => handleTableDragStart(e, t.id)}
                  className="cursor-grab active:cursor-grabbing rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary transition-colors select-none min-h-[44px]"
                >
                  <div className="font-medium truncate">
                    {t.name || `Table ${t.table_no}`}
                  </div>
                  <div className="text-xs text-muted-foreground">{t.limit_seats} seats</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Fixtures palette */}
        <div className="rounded-lg border border-border bg-card p-3 max-lg:p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Fixtures</h3>
          <p className="text-xs text-muted-foreground mb-2">
            Drag onto the room. Click a fixture to rotate, lock, or remove.
          </p>
          <ul className="grid grid-cols-2 max-lg:grid-cols-3 gap-2">
            {FIXTURE_CATALOG.map((spec) => {
              const Icon = spec.icon;
              return (
                <li
                  key={spec.type}
                  draggable
                  onDragStart={(e) => handleFixtureDragStart(e, spec.type)}
                  title={`${spec.label} · ${spec.width_m}×${spec.height_m}m`}
                  className="cursor-grab active:cursor-grabbing rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground hover:border-primary transition-colors select-none flex flex-col items-center gap-1 text-center min-h-[44px]"
                >
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded"
                    style={{ backgroundColor: spec.color, color: spec.textColor }}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="leading-tight">{spec.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* Canvas */}
      <div className="flex-1 min-w-0 overflow-hidden rounded-lg border border-border bg-muted/20 p-4 max-lg:p-2">
        <PinchZoomContainer naturalWidth={roomW} className="w-full">
          <div className="overflow-auto">
            <div
              ref={canvasRef}
              onDragOver={handleCanvasDragOver}
              onDrop={handleCanvasDrop}
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelection(null);
              }}
              className="relative bg-white border-2 border-foreground/70 shadow-inner mx-auto"
              style={{
                width: roomW,
                height: roomH,
                backgroundImage:
                  'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
                backgroundSize: `${gridPx}px ${gridPx}px`,
                ...(polygonPath
                  ? ({
                      clipPath: `path('${polygonPath}')`,
                      WebkitClipPath: `path('${polygonPath}')`,
                    } as React.CSSProperties)
                  : {}),
              }}
            >
              {/* Background image (rendered first, sits under everything) */}
              {showBackground && (
                <PlacedBackground
                  bg={bg}
                  url={backgroundUrl!}
                  selected={bgSelected}
                  onPointerDown={(e) =>
                    handlePointerDown(e, 'background', 'bg', bg.x, bg.y, bg.locked)
                  }
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onResizePointerDown={startBackgroundResize}
                  onRotate={rotateBackground}
                  onToggleLock={toggleLockBackground}
                />
              )}

              {/* Fixtures so tables sit above */}
              {plan.fixtures.map((fx) => (
                <PlacedFixture
                  key={fx.id}
                  fx={fx}
                  selected={selection?.kind === 'fixture' && selection.id === fx.id}
                  onPointerDown={(e) =>
                    handlePointerDown(e, 'fixture', fx.id, fx.x, fx.y, fx.locked)
                  }
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onRotate={() => rotateFixture(fx.id)}
                  onToggleLock={() => toggleLockFixture(fx.id)}
                  onRemove={() => removeFixture(fx.id)}
                />
              ))}

              {plan.table_positions.map((pos) => {
                const t = tableById.get(pos.table_id);
                if (!t) return null;
                return (
                  <PlacedTable
                    key={pos.table_id}
                    pos={pos}
                    table={t}
                    selected={selection?.kind === 'table' && selection.id === pos.table_id}
                    onPointerDown={(e) =>
                      handlePointerDown(e, 'table', pos.table_id, pos.x, pos.y, pos.locked)
                    }
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onRotate={() => rotateTable(pos.table_id)}
                    onToggleLock={() => toggleLockTable(pos.table_id)}
                    onRemove={() => removeTable(pos.table_id)}
                  />
                );
              })}
              <AlignmentGuides guides={guides} roomW={roomW} roomH={roomH} pxPerM={PX_PER_M} />
              {polygonPath && (
                <svg
                  className="pointer-events-none absolute inset-0"
                  width={roomW}
                  height={roomH}
                  style={{ zIndex: 4 }}
                >
                  <path d={polygonPath} fill="none" stroke="#1D1D1F" strokeWidth={2} />
                </svg>
              )}
            </div>
          </div>
        </PinchZoomContainer>
        <p className="mt-2 text-xs text-muted-foreground">
          Room: {plan.room_width_m}m × {plan.room_length_m}m · grid {plan.grid_size_cm}cm · scale{' '}
          {PX_PER_M}px/m
        </p>
      </div>
    </div>
  );
};


const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

// ---------- PlacedBackground ----------
interface PlacedBackgroundProps {
  bg: ReceptionBackground;
  url: string;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onResizePointerDown: (e: React.PointerEvent) => void;
  onRotate: () => void;
  onToggleLock: () => void;
}

const PlacedBackground = ({
  bg,
  url,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onResizePointerDown,
  onRotate,
  onToggleLock,
}: PlacedBackgroundProps) => {
  const w = (bg.width ?? 0) * PX_PER_M;
  const h = (bg.height ?? 0) * PX_PER_M;
  return (
    <div
      style={{
        position: 'absolute',
        left: bg.x * PX_PER_M,
        top: bg.y * PX_PER_M,
        width: w,
        height: h,
        transform: `rotate(${bg.rotation}deg)`,
        transformOrigin: 'center center',
        opacity: bg.opacity,
        touchAction: 'none',
        zIndex: 0,
      }}
    >
      <img
        src={url}
        alt="Venue floor plan background"
        draggable={false}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`block w-full h-full object-contain pointer-events-auto select-none ${
          bg.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
        } ${selected ? 'outline outline-2 outline-primary outline-offset-2' : ''}`}
      />
      {selected && (
        <>
          <BackgroundToolbar
            rotation={bg.rotation}
            locked={bg.locked}
            onRotate={onRotate}
            onToggleLock={onToggleLock}
          />
          {!bg.locked && (
            <div
              onPointerDown={onResizePointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              title="Drag to resize (keeps aspect ratio)"
              style={{
                position: 'absolute',
                right: -8,
                bottom: -8,
                width: 18,
                height: 18,
                touchAction: 'none',
              }}
              className="bg-primary border-2 border-white rounded-sm shadow cursor-se-resize"
            />
          )}
        </>
      )}
    </div>
  );
};

const BackgroundToolbar = ({
  rotation,
  locked,
  onRotate,
  onToggleLock,
}: {
  rotation: number;
  locked: boolean;
  onRotate: () => void;
  onToggleLock: () => void;
}) => (
  <div
    style={{
      position: 'absolute',
      top: -44,
      left: '50%',
      transform: `translateX(-50%) rotate(${-rotation}deg)`,
    }}
    className="flex items-center gap-1 bg-card border border-border rounded-md shadow-md px-1 py-1"
  >
    <button
      type="button"
      onClick={onRotate}
      className="lv-premium-shade p-1 rounded hover:bg-muted text-foreground min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
      title="Rotate 15°"
    >
      <RotateCw className="w-4 h-4" />
    </button>
    <button
      type="button"
      onClick={onToggleLock}
      className="lv-premium-shade p-1 rounded hover:bg-muted text-foreground min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
      title={locked ? 'Unlock' : 'Lock'}
    >
      {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
    </button>
  </div>
);

// ---------- PlacedTable ----------
interface PlacedTableProps {
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
}: PlacedTableProps) => {
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
        zIndex: 2,
      }}
      className="group"
    >
      {Array.from({ length: table.limit_seats }).map((_, i) => {
        const angle = (i / table.limit_seats) * 2 * Math.PI - Math.PI / 2;
        const cx = diameterPx / 2 + Math.cos(angle) * chairOffset - chairSize / 2;
        const cy = diameterPx / 2 + Math.sin(angle) * chairOffset - chairSize / 2;
        return (
          <div
            key={i}
            style={{ position: 'absolute', left: cx, top: cy, width: chairSize, height: chairSize }}
            className="rounded-sm bg-[#967A59]/70 border border-[#7a6347]"
          />
        );
      })}

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

      {selected && (
        <SelectionToolbar
          rotation={pos.rotation}
          locked={pos.locked}
          onRotate={onRotate}
          onToggleLock={onToggleLock}
          onRemove={onRemove}
        />
      )}
    </div>
  );
};

// ---------- PlacedFixture ----------
interface PlacedFixtureProps {
  fx: Fixture;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onRotate: () => void;
  onToggleLock: () => void;
  onRemove: () => void;
}

const PlacedFixture = ({
  fx,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRotate,
  onToggleLock,
  onRemove,
}: PlacedFixtureProps) => {
  const spec = FIXTURE_BY_TYPE[fx.type];
  const Icon = spec.icon;
  const w = fx.width_m * PX_PER_M;
  const h = fx.height_m * PX_PER_M;
  const rounded = spec.shape === 'round' ? 'rounded-full' : 'rounded-md';

  return (
    <div
      style={{
        position: 'absolute',
        left: fx.x * PX_PER_M,
        top: fx.y * PX_PER_M,
        transform: `translate(-50%, -50%) rotate(${fx.rotation}deg)`,
        width: w,
        height: h,
        touchAction: 'none',
        zIndex: 1,
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`absolute inset-0 ${rounded} flex items-center justify-center text-[10px] font-semibold shadow-sm border border-black/10 ${
          fx.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
        } ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
        style={{ backgroundColor: spec.color, color: spec.textColor }}
      >
        <div className="flex items-center gap-1 px-1 pointer-events-none text-center leading-tight">
          <Icon className="w-3 h-3 shrink-0" />
          <span className="truncate">{fx.label || spec.label}</span>
        </div>
      </div>

      {selected && (
        <SelectionToolbar
          rotation={fx.rotation}
          locked={fx.locked}
          onRotate={onRotate}
          onToggleLock={onToggleLock}
          onRemove={onRemove}
        />
      )}
    </div>
  );
};

// ---------- shared toolbar ----------
interface ToolbarProps {
  rotation: number;
  locked: boolean;
  onRotate: () => void;
  onToggleLock: () => void;
  onRemove: () => void;
}

const SelectionToolbar = ({ rotation, locked, onRotate, onToggleLock, onRemove }: ToolbarProps) => (
  <div
    style={{
      position: 'absolute',
      top: -44,
      left: '50%',
      transform: `translateX(-50%) rotate(${-rotation}deg)`,
    }}
    className="flex items-center gap-1 bg-card border border-border rounded-md shadow-md px-1 py-1"
  >
    <button
      onClick={onRotate}
      className="lv-premium-shade p-1 rounded hover:bg-muted text-foreground min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
      title="Rotate 15°"
    >
      <RotateCw className="w-4 h-4" />
    </button>
    <button
      onClick={onToggleLock}
      className="lv-premium-shade p-1 rounded hover:bg-muted text-foreground min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
      title={locked ? 'Unlock' : 'Lock'}
    >
      {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
    </button>
    <button
      onClick={onRemove}
      className="lv-premium-shade p-1 rounded hover:bg-destructive/10 text-destructive min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
      title="Remove"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
);
