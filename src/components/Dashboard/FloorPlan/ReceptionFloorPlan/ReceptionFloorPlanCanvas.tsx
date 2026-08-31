import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Unlock, RotateCw, RotateCcw, Trash2, StickyNote } from 'lucide-react';

import { PinchZoomContainer } from '@/components/ui/PinchZoomContainer';
import { Button } from '@/components/ui/button';
import type { ReceptionTable } from '@/hooks/useReceptionTables';
import type {
  ReceptionFloorPlan,
  TablePosition,
  Fixture,
  ReceptionBackground,
} from '@/hooks/useReceptionFloorPlan';
import { FIXTURE_PALETTE_CATALOG, FIXTURE_BY_TYPE, type FixtureType } from './fixtures';
import { snapPoint, buildRoomSnapTargets, type SnapTarget } from '@/lib/floorPlanSnap';
import { polygonToSvgPath } from '@/lib/floorPlanShapes';
import {
  clientPointToReceptionRoom,
  createReceptionLandscapePresentation,
  getReceptionCanvasMetrics as calculateReceptionCanvasMetrics,
  receptionLandscapePointToRoom,
  receptionRoomPointToLandscape,
  receptionRoomPolygonToLandscape,
  type ReceptionLandscapePresentation,
} from '@/lib/receptionFloorPlanCoordinates';
import { AlignmentGuides } from './AlignmentGuides';
import {
  ReceptionFloorPlanA4Preview,
  type ReceptionA4Event,
} from './ReceptionFloorPlanA4';
import workspaceStyles from './ReceptionFloorPlanTheme.module.css';
import {
  getReceptionChairPoints,
  getReceptionTableDimensions,
  getHeadTableChairPoints,
  getHeadTableDimensions,
  isReceptionChairOccupied,
} from '@/lib/receptionTableGeometry';


const PX_PER_M = 50; // visual scale

type SelectedKind = 'table' | 'fixture' | 'background';
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
interface Selection {
  kind: SelectedKind;
  id: string;
}

interface Props {
  plan: ReceptionFloorPlan;
  tables: ReceptionTable[];
  event: ReceptionA4Event;
  attendingCount: number;
  generatedAt: Date;
  a4Ref: React.RefObject<HTMLDivElement>;
  backgroundUrl: string | null;
  onChange: (mutator: (p: ReceptionFloorPlan) => ReceptionFloorPlan) => void;
  /** Notifies parent when the selected table changes (for Table Note panel). */
  onSelectedTableChange?: (id: string | null) => void;
  onResetRequest?: () => void;
  resetDisabled?: boolean;
  readOnly?: boolean;
}

export const ReceptionFloorPlanCanvas = ({
  plan,
  tables,
  event,
  attendingCount,
  generatedAt,
  a4Ref,
  backgroundUrl,
  onChange,
  onSelectedTableChange,
  onResetRequest,
  resetDisabled = false,
  readOnly = false,
}: Props) => {

  const canvasRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [guides, setGuides] = useState<SnapTarget[]>([]);
  const [draggingFixtureType, setDraggingFixtureType] = useState<FixtureType | null>(null);
  const altDownRef = useRef(false);
  const dragState = useRef<
    | { kind: SelectedKind; id: string; offsetX: number; offsetY: number }
    | null
  >(null);
  const resizeState = useRef<
    | {
        kind: 'background';
        startClientX: number;
        startClientY: number;
        startW: number;
        startH: number;
        displayWidth: number;
        displayHeight: number;
      }
    | {
        kind: 'fixture' | 'table';
        id: string;
        handle: ResizeHandle;
        startClientX: number;
        startClientY: number;
        startDisplayWidth: number;
        startDisplayHeight: number;
        startDisplayX: number;
        startDisplayY: number;
        rotation: number;
        minDisplayHeight?: number;
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
  // Notify parent of selected table changes (for the Table Note panel).
  useEffect(() => {
    if (!onSelectedTableChange) return;
    onSelectedTableChange(
      selection?.kind === 'table' ? selection.id : null
    );
  }, [selection, onSelectedTableChange]);


  const placedIds = useMemo(
    () => new Set([
      ...plan.table_positions.map((p) => p.table_id),
      ...plan.fixtures.flatMap((fixture) => fixture.linked_table_id ? [fixture.linked_table_id] : []),
    ]),
    [plan.fixtures, plan.table_positions]
  );
  const unplacedTables = tables.filter((t) => !placedIds.has(t.id));
  const tableById = useMemo(() => {
    const m = new Map<string, ReceptionTable>();
    tables.forEach((t) => m.set(t.id, t));
    return m;
  }, [tables]);

  const roomPresentation = useMemo(
    () => createReceptionLandscapePresentation(plan.room_width_m, plan.room_length_m),
    [plan.room_length_m, plan.room_width_m],
  );
  const displayRoomW = roomPresentation.displayWidth * PX_PER_M;
  const displayRoomH = roomPresentation.displayHeight * PX_PER_M;
  const gridPx = (plan.grid_size_cm / 100) * PX_PER_M;
  const displayPolygon = useMemo(() => plan.room_polygon
    ? {
        ...plan.room_polygon,
        points: receptionRoomPolygonToLandscape(plan.room_polygon.points, roomPresentation),
      }
    : null, [plan.room_polygon, roomPresentation]);
  const polygonPath = displayPolygon ? polygonToSvgPath(displayPolygon, PX_PER_M) : '';
  const displayGuides = useMemo<SnapTarget[]>(() => guides.map((guide) => guide.axis === 'x'
    ? { axis: 'y', value: plan.room_width_m - guide.value }
    : { axis: 'x', value: guide.value }), [guides, plan.room_width_m]);

  const getCanvasMetrics = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return calculateReceptionCanvasMetrics({
      rectLeft: rect.left,
      rectTop: rect.top,
      rectWidth: rect.width,
      offsetWidth: canvas.offsetWidth,
      clientLeft: canvas.clientLeft,
      clientTop: canvas.clientTop,
    });
  };

  // ---- palette → canvas drop (tables + fixtures)
  const handleTableDragStart = (e: React.DragEvent, tableId: string) => {
    e.dataTransfer.setData('text/reception-table-id', tableId);
    e.dataTransfer.effectAllowed = 'copy';
  };
  const handleFixtureDragStart = (e: React.DragEvent, type: FixtureType) => {
    e.dataTransfer.setData('text/reception-fixture-type', type);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingFixtureType(type);
  };
  const addFixtureToRoomCentre = (type: FixtureType) => {
    if (readOnly) return;
    const spec = FIXTURE_BY_TYPE[type];
    onChange((p) => ({
      ...p,
      fixtures: [
        ...p.fixtures,
        {
          id: crypto.randomUUID(),
          type,
          x: p.room_width_m / 2,
          y: p.room_length_m / 2,
          width_m: spec.width_m,
          height_m: spec.height_m,
          rotation: 0,
          locked: false,
        },
      ],
    }));
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
    if (readOnly) return;
    const metrics = getCanvasMetrics();
    if (!metrics) return;
    const { x, y } = clientPointToReceptionRoom(
      e.clientX,
      e.clientY,
      metrics,
      PX_PER_M,
      roomPresentation,
    );

    const tableId = e.dataTransfer.getData('text/reception-table-id');
    if (tableId) {
      e.preventDefault();
      onChange((p) => ({
        ...p,
        table_positions: p.table_positions.some((position) => position.table_id === tableId) ? p.table_positions : [
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
            x: clamp(x, -spec.width_m / 2 + 0.15, p.room_width_m + spec.width_m / 2 - 0.15),
            y: clamp(y, -spec.height_m / 2 + 0.15, p.room_length_m + spec.height_m / 2 - 0.15),
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
    if (readOnly) return;
    setSelection({ kind, id });
    if (locked) return;
    const metrics = getCanvasMetrics();
    if (!metrics) return;
    const displayPoint = receptionRoomPointToLandscape({ x: refX, y: refY }, roomPresentation);
    dragState.current = {
      kind,
      id,
      offsetX: e.clientX - (metrics.originX + displayPoint.x * PX_PER_M * metrics.scale),
      offsetY: e.clientY - (metrics.originY + displayPoint.y * PX_PER_M * metrics.scale),
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (resizeState.current) {
      const r = resizeState.current;
      const metrics = getCanvasMetrics();
      if (!metrics) return;
      if (r.kind === 'fixture' || r.kind === 'table') {
        const dx = (e.clientX - r.startClientX) / metrics.scale;
        const dy = (e.clientY - r.startClientY) / metrics.scale;
        const radians = (r.rotation * Math.PI) / 180;
        const localDx = dx * Math.cos(radians) + dy * Math.sin(radians);
        const localDy = -dx * Math.sin(radians) + dy * Math.cos(radians);
        let left = -r.startDisplayWidth / 2;
        let right = r.startDisplayWidth / 2;
        let top = -r.startDisplayHeight / 2;
        let bottom = r.startDisplayHeight / 2;

        if (r.handle.includes('w')) left += localDx;
        if (r.handle.includes('e')) right += localDx;
        if (r.handle.includes('n')) top += localDy;
        if (r.handle.includes('s')) bottom += localDy;

        const minSize = 24;
        const maxWidth = displayRoomW * 0.95;
        const maxHeight = displayRoomH * 0.95;
        const constrainAxis = (
          start: number,
          end: number,
          min: number,
          max: number,
          movingStart: boolean,
        ) => {
          const size = clamp(end - start, min, max);
          return movingStart ? [end - size, end] : [start, start + size];
        };
        [left, right] = constrainAxis(left, right, minSize, maxWidth, r.handle.includes('w'));
        [top, bottom] = constrainAxis(top, bottom, r.minDisplayHeight ?? minSize, maxHeight, r.handle.includes('n'));

        const centreLocalX = (left + right) / 2;
        const centreLocalY = (top + bottom) / 2;
        const centreShiftX = centreLocalX * Math.cos(radians) - centreLocalY * Math.sin(radians);
        const centreShiftY = centreLocalX * Math.sin(radians) + centreLocalY * Math.cos(radians);
        const canonical = receptionLandscapePointToRoom({
          x: (r.startDisplayX + centreShiftX) / PX_PER_M,
          y: (r.startDisplayY + centreShiftY) / PX_PER_M,
        }, roomPresentation);

        onChange((p) => r.kind === 'fixture' ? ({
          ...p,
          fixtures: p.fixtures.map((fixture) => fixture.id === r.id ? {
            ...fixture,
            x: clamp(canonical.x, -fixture.width_m / 2 + 0.15, p.room_width_m + fixture.width_m / 2 - 0.15),
            y: clamp(canonical.y, -fixture.height_m / 2 + 0.15, p.room_length_m + fixture.height_m / 2 - 0.15),
            width_m: (bottom - top) / PX_PER_M,
            height_m: (right - left) / PX_PER_M,
          } : fixture),
        }) : ({
          ...p,
          table_positions: p.table_positions.map((position) => position.table_id === r.id ? {
            ...position,
            x: clamp(canonical.x, 0.5, p.room_width_m - 0.5),
            y: clamp(canonical.y, 0.5, p.room_length_m - 0.5),
            width_m: (bottom - top) / PX_PER_M,
            height_m: (right - left) / PX_PER_M,
          } : position),
        }));
        return;
      }
      const dxPx = (e.clientX - r.startClientX) / metrics.scale;
      // The landscape presentation swaps the background's displayed axes.
      const newDisplayWidth = Math.max(40, r.displayWidth + dxPx);
      const uniformScale = newDisplayWidth / r.displayWidth;
      const newWPx = r.startW * uniformScale;
      const newHPx = r.startH * uniformScale;
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
    const metrics = getCanvasMetrics();
    if (!metrics) return;
    const { x, y } = clientPointToReceptionRoom(
      e.clientX - d.offsetX,
      e.clientY - d.offsetY,
      metrics,
      PX_PER_M,
      roomPresentation,
    );
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
                x: clamp(snap.x, -fx.width_m / 2 + 0.15, p.room_width_m + fx.width_m / 2 - 0.15),
                y: clamp(snap.y, -fx.height_m / 2 + 0.15, p.room_length_m + fx.height_m / 2 - 0.15),
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
          x: clamp(x - (p.background.width ?? 0) / 2, -p.room_width_m, p.room_width_m * 2),
          y: clamp(y - (p.background.height ?? 0) / 2, -p.room_length_m, p.room_length_m * 2),
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
      kind: 'background',
      startClientX: e.clientX,
      startClientY: e.clientY,
      startW: wPx,
      startH: hPx,
      displayWidth: hPx,
      displayHeight: wPx,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const startFixtureResize = (
    e: React.PointerEvent,
    fixture: Fixture,
    handle: ResizeHandle,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly || fixture.locked) return;
    const displayPoint = receptionRoomPointToLandscape(fixture, roomPresentation);
    resizeState.current = {
      kind: 'fixture',
      id: fixture.id,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startDisplayWidth: fixture.height_m * PX_PER_M,
      startDisplayHeight: fixture.width_m * PX_PER_M,
      startDisplayX: displayPoint.x * PX_PER_M,
      startDisplayY: displayPoint.y * PX_PER_M,
      rotation: fixture.rotation,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const startHeadTableResize = (
    e: React.PointerEvent,
    position: TablePosition,
    table: ReceptionTable,
    handle: ResizeHandle,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly || position.locked || table.table_purpose !== 'head') return;
    const defaults = getHeadTableDimensions(table.limit_seats);
    const width = position.width_m ?? defaults.width;
    const height = position.height_m ?? defaults.height;
    const displayPoint = receptionRoomPointToLandscape(position, roomPresentation);
    resizeState.current = {
      kind: 'table',
      id: position.table_id,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startDisplayWidth: height * PX_PER_M,
      startDisplayHeight: width * PX_PER_M,
      startDisplayX: displayPoint.x * PX_PER_M,
      startDisplayY: displayPoint.y * PX_PER_M,
      rotation: position.rotation,
      minDisplayHeight: defaults.width * PX_PER_M,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const bg = plan.background;
  const showBackground =
    !!backgroundUrl && bg.visible && bg.width != null && bg.height != null;
  const bgSelected = selection?.kind === 'background';
  const selectedFixtureType = selection?.kind === 'fixture'
    ? plan.fixtures.find((fixture) => fixture.id === selection.id)?.type ?? null
    : null;

  return (
    <div data-reception-workspace="true" className="flex min-w-0 flex-col gap-4">
      {!readOnly && (
        <>
        <section
          data-reception-fixtures-palette="true"
          data-reception-panel="true"
          className="rounded-lg border border-border bg-card p-3 max-lg:p-4"
        >
          <div className={workspaceStyles.fixtureHeader}>
            <div className={workspaceStyles.fixtureHeaderLeft}>
              <h3 className="text-sm font-semibold text-foreground">Fixtures</h3>
              <p
                className={workspaceStyles.fixturePlacementStatus}
                data-reception-table-placement-status="true"
                aria-live="polite"
              >
                Tables to place: {unplacedTables.length} ·{' '}
                {unplacedTables.length === 0
                  ? 'All synced tables placed'
                  : `${plan.table_positions.length} of ${tables.length} synced tables placed`}
              </p>
            </div>
            {onResetRequest && (
              <Button
                variant="destructive"
                className={`${workspaceStyles.headerResetButton} h-10 shrink-0`}
                onClick={onResetRequest}
                disabled={resetDisabled}
              >
                <RotateCcw className="mr-1.5 h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                Reset layout
              </Button>
            )}
          </div>
          {unplacedTables.length > 0 && (
            <ul
              data-reception-unplaced-tables="true"
              className="mb-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
            >
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
          <p className="text-xs text-muted-foreground mb-2">
            Drag onto the room or tap to add. Click a placed fixture to rotate, lock, or remove.
          </p>
          <ul className={`${workspaceStyles.fixturePaletteGrid} grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7`}>
            {FIXTURE_PALETTE_CATALOG.map((spec) => {
              const Icon = spec.icon;
              const needsStrongOverlay = spec.type === 'dance_floor' || spec.type === 'window';
              return (
                <li
                  key={spec.type}
                  draggable
                  tabIndex={0}
                  role="button"
                  aria-label={`Add or drag ${spec.label} onto the reception floor plan`}
                  onDragStart={(e) => handleFixtureDragStart(e, spec.type)}
                  onDragEnd={() => setDraggingFixtureType(null)}
                  data-selected={selectedFixtureType === spec.type ? 'true' : 'false'}
                  data-dragging={draggingFixtureType === spec.type ? 'true' : 'false'}
                  onClick={() => addFixtureToRoomCentre(spec.type)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      addFixtureToRoomCentre(spec.type);
                    }
                  }}
                  title={`${spec.label} · ${spec.width_m}×${spec.height_m}m`}
                  className={`${workspaceStyles.fixturePaletteCard} cursor-grab active:cursor-grabbing select-none`}
                  style={{
                    backgroundColor: spec.color,
                    backgroundImage: `linear-gradient(${needsStrongOverlay ? 'rgba(22, 10, 6, .46)' : 'rgba(22, 10, 6, .12)'}, ${needsStrongOverlay ? 'rgba(22, 10, 6, .46)' : 'rgba(22, 10, 6, .12)'})`,
                  }}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="leading-tight">{spec.label}</span>
                </li>
              );
            })}
          </ul>
        </section>
        </>
      )}

      <div className="min-w-0" data-reception-document-area="true">
        <PinchZoomContainer minScale={0.75} maxScale={3} showHint>
          <ReceptionFloorPlanA4Preview
            pageRef={a4Ref}
            event={event}
            plan={plan}
            attendingCount={attendingCount}
            generatedAt={generatedAt}
            roomWidthPx={displayRoomW}
            roomHeightPx={displayRoomH}
          >
            <div
              ref={canvasRef}
              data-reception-room-canvas="true"
              data-reception-landscape-presentation="true"
              data-canonical-room-width-m={plan.room_width_m}
              data-canonical-room-length-m={plan.room_length_m}
              data-presentation-width-m={roomPresentation.displayWidth}
              data-presentation-height-m={roomPresentation.displayHeight}
              onDragOver={handleCanvasDragOver}
              onDrop={handleCanvasDrop}
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelection(null);
              }}
                className="relative bg-white border-2 border-foreground/70 shadow-inner mx-auto"
                style={{
                width: displayRoomW,
                height: displayRoomH,
                backgroundImage:
                  'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
                backgroundSize: `${gridPx}px ${gridPx}px`,
              }}
            >
              {/* Background image (rendered first, sits under everything) */}
              {showBackground && (
                <PlacedBackground
                  bg={bg}
                  url={backgroundUrl!}
                  selected={bgSelected}
                  presentation={roomPresentation}
                  onPointerDown={(e) =>
                    handlePointerDown(
                      e,
                      'background',
                      'bg',
                      bg.x + (bg.width ?? 0) / 2,
                      bg.y + (bg.height ?? 0) / 2,
                      bg.locked,
                    )
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
                  linkedTable={fx.linked_table_id ? tableById.get(fx.linked_table_id) ?? null : null}
                  presentation={roomPresentation}
                  selected={selection?.kind === 'fixture' && selection.id === fx.id}
                  onPointerDown={(e) =>
                    handlePointerDown(e, 'fixture', fx.id, fx.x, fx.y, fx.locked)
                  }
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onResizePointerDown={(event, handle) => startFixtureResize(event, fx, handle)}
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
                    presentation={roomPresentation}
                    selected={selection?.kind === 'table' && selection.id === pos.table_id}
                    onPointerDown={(e) =>
                      handlePointerDown(e, 'table', pos.table_id, pos.x, pos.y, pos.locked)
                    }
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onResizePointerDown={(event, handle) => startHeadTableResize(event, pos, t, handle)}
                    onRotate={() => rotateTable(pos.table_id)}
                    onToggleLock={() => toggleLockTable(pos.table_id)}
                    onRemove={() => removeTable(pos.table_id)}
                  />
                );
              })}
              <AlignmentGuides
                guides={displayGuides}
                roomW={displayRoomW}
                roomH={displayRoomH}
                pxPerM={PX_PER_M}
              />
              {polygonPath && (
                <svg
                  className="pointer-events-none absolute inset-0"
                  width={displayRoomW}
                  height={displayRoomH}
                  style={{ zIndex: 4 }}
                >
                  <path d={polygonPath} fill="none" stroke="#1D1D1F" strokeWidth={2} />
                </svg>
              )}
            </div>
          </ReceptionFloorPlanA4Preview>
        </PinchZoomContainer>
        <p hidden>
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
  presentation: ReceptionLandscapePresentation;
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
  presentation,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onResizePointerDown,
  onRotate,
  onToggleLock,
}: PlacedBackgroundProps) => {
  const w = (bg.width ?? 0) * PX_PER_M;
  const h = (bg.height ?? 0) * PX_PER_M;
  const centre = receptionRoomPointToLandscape({
    x: bg.x + (bg.width ?? 0) / 2,
    y: bg.y + (bg.height ?? 0) / 2,
  }, presentation);
  return (
    <div
      data-reception-upright-background-frame="true"
      style={{
        position: 'absolute',
        left: centre.x * PX_PER_M,
        top: centre.y * PX_PER_M,
        width: h,
        height: w,
        transform: `translate(-50%, -50%) rotate(${bg.rotation}deg)`,
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
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: w,
          height: h,
          transform: 'translate(-50%, -50%) rotate(-90deg)',
        }}
        className={`block object-contain pointer-events-auto select-none ${
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
              data-reception-screen-only="true"
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
    data-reception-screen-only="true"
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
  presentation: ReceptionLandscapePresentation;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onResizePointerDown: (e: React.PointerEvent, handle: ResizeHandle) => void;
  onRotate: () => void;
  onToggleLock: () => void;
  onRemove: () => void;
}

const PlacedTable = ({
  pos,
  table,
  selected,
  presentation,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onResizePointerDown,
  onRotate,
  onToggleLock,
  onRemove,
}: PlacedTableProps) => {
  const tableType = table.table_type === 'square' || table.table_type === 'long'
    ? table.table_type
    : 'round';
  const isHeadTable = table.table_purpose === 'head';
  const headDefaults = getHeadTableDimensions(table.limit_seats);
  const dimensions = isHeadTable
    ? { width: pos.width_m ?? headDefaults.width, height: pos.height_m ?? headDefaults.height }
    : getReceptionTableDimensions(tableType);
  const tableWidthPx = dimensions.height * PX_PER_M;
  const tableHeightPx = dimensions.width * PX_PER_M;
  const chairSize = 16;
  const chairPoints = isHeadTable
    ? getHeadTableChairPoints(table.limit_seats, tableWidthPx, tableHeightPx, chairSize)
    : getReceptionChairPoints(tableType, table.limit_seats, tableWidthPx, tableHeightPx, chairSize);
  const displayPoint = receptionRoomPointToLandscape(pos, presentation);
  const occupiedCount = Math.min(table.limit_seats, table.guest_count ?? pos.occupied_count ?? 0);
  const occupiedSeatNumbers = table.occupied_seat_numbers ?? pos.occupied_seat_numbers ?? [];
  const tableShape = tableType === 'round' ? 'rounded-full' : 'rounded-md';

  return (
    <div
      style={{
        position: 'absolute',
        left: displayPoint.x * PX_PER_M,
        top: displayPoint.y * PX_PER_M,
        transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
        width: tableWidthPx,
        height: tableHeightPx,
        touchAction: 'none',
        zIndex: 2,
      }}
      className="group"
    >
      {chairPoints.map((chair, i) => {
        const occupied = isReceptionChairOccupied(
          i,
          occupiedCount,
          occupiedSeatNumbers,
        );
        return (
          <div
            key={i}
            data-reception-chair-status={occupied ? 'occupied' : 'available'}
            style={{
              position: 'absolute',
              left: chair.x,
              top: chair.y,
              width: chairSize,
              height: chairSize,
              backgroundColor: occupied ? '#16a34a' : '#e2b85c',
              borderColor: occupied ? '#15803d' : '#9c7532',
            }}
            className="rounded-sm border"
          />
        );
      })}

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`absolute inset-0 ${tableShape} flex items-center justify-center text-xs font-semibold text-white shadow-md ${
          pos.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
        } ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
        style={{ backgroundColor: '#967A59' }}
      >
        <span
          data-reception-upright-label="table"
          className="px-1 text-center leading-tight pointer-events-none"
          style={{ transform: `rotate(${-pos.rotation}deg)` }}
        >
          <span className="block">{table.name || `T${table.table_no}`}</span>
          <span className="mt-0.5 block text-[9px] font-medium opacity-90">
            {occupiedCount}/{table.limit_seats}
          </span>
        </span>
      </div>

      {pos.note && pos.note.trim().length > 0 && (
        <div
          title={pos.note}
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            transform: `rotate(${-pos.rotation}deg)`,
            transformOrigin: 'center center',
            zIndex: 3,
          }}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-amber-900 border-2 border-white shadow pointer-events-none"
        >
          <StickyNote className="w-3 h-3" />
        </div>
      )}

      {selected && (
        <>
          <SelectionToolbar
            rotation={pos.rotation}
            locked={pos.locked}
            onRotate={onRotate}
            onToggleLock={onToggleLock}
            onRemove={onRemove}
          />
          {isHeadTable && !pos.locked && <FixtureResizeHandles onPointerDown={onResizePointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />}
        </>
      )}
    </div>
  );
};


// ---------- PlacedFixture ----------
interface PlacedFixtureProps {
  fx: Fixture;
  linkedTable: ReceptionTable | null;
  selected: boolean;
  presentation: ReceptionLandscapePresentation;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onResizePointerDown: (e: React.PointerEvent, handle: ResizeHandle) => void;
  onRotate: () => void;
  onToggleLock: () => void;
  onRemove: () => void;
}

const PlacedFixture = ({
  fx,
  linkedTable,
  selected,
  presentation,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onResizePointerDown,
  onRotate,
  onToggleLock,
  onRemove,
}: PlacedFixtureProps) => {
  const spec = FIXTURE_BY_TYPE[fx.type];
  const Icon = spec.icon;
  const w = fx.height_m * PX_PER_M;
  const h = fx.width_m * PX_PER_M;
  const displayPoint = receptionRoomPointToLandscape(fx, presentation);
  const rounded = spec.shape === 'round' ? 'rounded-full' : 'rounded-md';
  const linkedCapacity = linkedTable?.limit_seats ?? 0;
  const linkedOccupied = Math.min(linkedCapacity, linkedTable?.guest_count ?? 0);
  const linkedChairs = linkedTable
    ? getReceptionChairPoints('long', linkedCapacity, w, h, 16)
    : [];

  return (
    <div
      data-reception-placed-fixture={fx.type}
      style={{
        position: 'absolute',
        left: displayPoint.x * PX_PER_M,
        top: displayPoint.y * PX_PER_M,
        transform: `translate(-50%, -50%) rotate(${fx.rotation}deg)`,
        width: w,
        height: h,
        touchAction: 'none',
        zIndex: 1,
      }}
    >
      {linkedChairs.map((chair, index) => {
        const occupied = isReceptionChairOccupied(
          index,
          linkedOccupied,
          linkedTable?.occupied_seat_numbers ?? [],
        );
        return (
          <div
            key={index}
            data-reception-chair-status={occupied ? 'occupied' : 'available'}
            className="absolute rounded-sm border"
            style={{
              left: chair.x,
              top: chair.y,
              width: 16,
              height: 16,
              backgroundColor: occupied ? '#16a34a' : '#e2b85c',
              borderColor: occupied ? '#15803d' : '#9c7532',
            }}
          />
        );
      })}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`absolute inset-0 ${rounded} flex items-center justify-center text-[10px] font-semibold shadow-sm border border-black/10 ${
          fx.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
        }`}
        style={{ backgroundColor: spec.color, color: spec.textColor }}
      >
        <div
          data-reception-upright-label="fixture"
          className="flex flex-col items-center gap-0.5 px-1 pointer-events-none text-center leading-tight"
          style={{
            minWidth: Math.max(56, Math.min(120, w)),
            transform: `rotate(${-fx.rotation}deg)`,
          }}
        >
          <Icon className="w-3 h-3 shrink-0" />
          <span className="whitespace-normal break-words">
            {linkedTable?.name || fx.label || spec.label}
          </span>
          {linkedTable && (
            <span className="text-[9px] font-medium opacity-90">
              {linkedOccupied}/{linkedCapacity}
            </span>
          )}
        </div>
      </div>

      {selected && (
        <div
          data-reception-screen-only="true"
          className={`pointer-events-none absolute inset-0 ${rounded} ring-2 ring-primary ring-offset-2`}
        />
      )}

      {selected && (
        <>
          <SelectionToolbar
            rotation={fx.rotation}
            locked={fx.locked}
            onRotate={onRotate}
            onToggleLock={onToggleLock}
            onRemove={onRemove}
          />
          {!fx.locked && (
            <FixtureResizeHandles
              onPointerDown={onResizePointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
          )}
        </>
      )}
    </div>
  );
};

const RESIZE_HANDLES: Array<{
  handle: ResizeHandle;
  style: React.CSSProperties;
  cursor: string;
}> = [
  { handle: 'nw', style: { left: -7, top: -7 }, cursor: 'nwse-resize' },
  { handle: 'n', style: { left: '50%', top: -7, transform: 'translateX(-50%)' }, cursor: 'ns-resize' },
  { handle: 'ne', style: { right: -7, top: -7 }, cursor: 'nesw-resize' },
  { handle: 'e', style: { right: -7, top: '50%', transform: 'translateY(-50%)' }, cursor: 'ew-resize' },
  { handle: 'se', style: { right: -7, bottom: -7 }, cursor: 'nwse-resize' },
  { handle: 's', style: { left: '50%', bottom: -7, transform: 'translateX(-50%)' }, cursor: 'ns-resize' },
  { handle: 'sw', style: { left: -7, bottom: -7 }, cursor: 'nesw-resize' },
  { handle: 'w', style: { left: -7, top: '50%', transform: 'translateY(-50%)' }, cursor: 'ew-resize' },
];

const FixtureResizeHandles = ({
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  onPointerDown: (event: React.PointerEvent, handle: ResizeHandle) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
}) => (
  <>
    {RESIZE_HANDLES.map(({ handle, style, cursor }) => (
      <button
        key={handle}
        type="button"
        data-reception-screen-only="true"
        data-reception-fixture-resize-handle={handle}
        aria-label={`Resize fixture ${handle}`}
        onPointerDown={(event) => onPointerDown(event, handle)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute z-[6] h-4 w-4 rounded-sm border-2 border-white bg-primary shadow"
        style={{ ...style, cursor, touchAction: 'none' }}
      />
    ))}
  </>
);

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
    data-reception-screen-only="true"
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
