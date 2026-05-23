/**
 * Phase 2B — Alignment guides rendered over the room canvas while dragging.
 * Receives meter coords + scale; renders 1px purple dashed lines.
 */
import type { SnapTarget } from '@/lib/floorPlanSnap';

interface Props {
  guides: SnapTarget[];
  roomW: number; // px
  roomH: number; // px
  pxPerM: number;
}

export const AlignmentGuides = ({ guides, roomW, roomH, pxPerM }: Props) => {
  if (!guides.length) return null;
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={roomW}
      height={roomH}
      style={{ zIndex: 5 }}
    >
      {guides.map((g, i) =>
        g.axis === 'x' ? (
          <line
            key={`x-${i}`}
            x1={g.value * pxPerM}
            x2={g.value * pxPerM}
            y1={0}
            y2={roomH}
            stroke="#967A59"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        ) : (
          <line
            key={`y-${i}`}
            x1={0}
            x2={roomW}
            y1={g.value * pxPerM}
            y2={g.value * pxPerM}
            stroke="#967A59"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )
      )}
    </svg>
  );
};
