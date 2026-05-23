
# Phase 2 — Reception Floor Plan: Calibration, Snap, Shapes, Share Link

Phase 2 is large. To stay safe (no other-page regressions) I'm splitting it into 4 self-contained sub-phases, all scoped to the Reception Floor Plan. I will execute 2A → 2B → 2C → 2D in one go after you approve, only stopping at the end.

## Scope (Reception Floor Plan only)

- 2A. **Background 2-point calibration** — user clicks two points on the uploaded background and enters the real-world distance; we auto-resize the background so it matches the room's metric scale.
- 2B. **Alignment guides + snap-to-walls/grid** — when dragging tables/fixtures/background, show purple guide lines and snap to: room walls, room center lines, grid step, and other table/fixture centers.
- 2C. **Room shape: Rectangle / L-shape / T-shape / Custom polygon** — new shape selector; floor render + grid + clipping respect the new polygon; PDF export draws the new outline + clips background to the polygon.
- 2D. **Read-only share link** — generate a tokenised URL like `/share/reception/:token` for venue coordinators. Public page renders a read-only view (no edits, no toolbar, no upload). Token revocable from the Reception page.

## Files I will touch (all new or already-Phase-1 owned)

New
- `src/components/Dashboard/FloorPlan/ReceptionFloorPlan/BackgroundCalibrationOverlay.tsx`
- `src/components/Dashboard/FloorPlan/ReceptionFloorPlan/AlignmentGuides.tsx`
- `src/components/Dashboard/FloorPlan/ReceptionFloorPlan/RoomShapePanel.tsx`
- `src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ShareLinkPanel.tsx`
- `src/lib/floorPlanSnap.ts` — pure snap math
- `src/lib/floorPlanShapes.ts` — polygon helpers (rect / L / T / custom → SVG path + point-in-poly + bounds)
- `src/pages/ReceptionFloorPlanShareView.tsx` — public read-only page
- `src/hooks/useReceptionFloorPlanShare.ts` — fetch via public RPC by token

Updated
- `src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanCanvas.tsx` — guide overlay, snap on drag/resize, polygon clipping, calibration mode hook
- `src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanPage.tsx` — mount RoomShapePanel, ShareLinkPanel, calibration trigger on VenueBackgroundPanel
- `src/components/Dashboard/FloorPlan/ReceptionFloorPlan/VenueBackgroundPanel.tsx` — "Calibrate scale" button
- `src/hooks/useReceptionFloorPlan.ts` — new fields: `room_polygon` (json), `share_token`
- `src/lib/receptionFloorPlanPdfExporter.ts` — draw + clip to polygon; background clipped to polygon (still excludes header/legend/footer change)
- `src/App.tsx` — add public route `/share/reception/:token` (only this one route added; nothing else touched)

NOT touched
- Ceremony floor plan, any other dashboard tab, all locked public pages, locked dashboard pages, GuestListTable, any shared UI primitive.

## Database (one migration)

`reception_floor_plans` add columns:
- `room_polygon jsonb` — `{ kind: 'rect' | 'L' | 'T' | 'custom', points: [{x,y}] }` in meters from top-left bounding box. Null = legacy rectangle from `room_width_m`/`room_length_m`.
- `share_token text unique` — opaque random 32-char token; null = sharing disabled.
- `share_enabled boolean default false`

RLS unchanged on the table (owner-only). For the public page, add SECURITY DEFINER RPC `get_reception_floor_plan_by_share_token(_token text)` returning the plan row + minimal event fields + minimal tables (id, name, table_no, limit_seats) + a 5-minute signed URL for the background. No write RPC.

No storage policy change — signed URL minted server-side in the RPC's caller, so the bucket stays private.

## Technical notes

- **Calibration math:** user picks point A and B on the on-canvas background image; we capture their image-local px coordinates and real distance D meters. New `background.width = (image.naturalWidth / pxAB) * D * (background.width / image.naturalWidth ratio held constant)`. Implemented as: scale = D / distance_in_current_meters_between_A_and_B; multiply background.width/height by scale around the midpoint to keep the two clicked points stationary relative to the room.
- **Snap-to-walls:** threshold 0.15 m at default zoom (scaled by zoom). Guides drawn in `#967A59` at 1px. Snap targets: 4 room walls, vertical+horizontal centerlines, every grid line within ±threshold, and the centers/edges of other tables and fixtures. Re-uses existing drag handlers — additive.
- **Polygon clipping:** SVG `<clipPath>` on the canvas root. PDF export uses jsPDF path + clip (already used for background); for L/T shapes we draw the polygon outline instead of `roomBorder`.
- **Snap toggle:** holding Alt while dragging disables snap.
- **Share link UX:** Generate → copy URL + revoke. URL: `${origin}/share/reception/${token}`.

## Out of scope (deferred)
- Editing room polygon by dragging individual vertices (Phase 2C ships with preset L / T sizes via inputs + free-form points-list textarea; vertex dragging Phase 3).
- Multi-room / multi-floor.
- Share-link guests list or analytics.

## QA checklist I will run after build

- Calibration: place known-width door on background, calibrate to 0.9 m → tables to scale.
- Snap: drag table near wall → snaps with guide; Alt disables.
- L-shape room: grid clips to polygon, fixtures outside polygon allowed but background clips correctly; PDF outline matches.
- Share link: open in incognito → read-only canvas renders identically; no toolbar; revoke disables URL.
- Desktop 1338×853, tablet 820×1180, mobile 390×844 — all panels stack, touch targets ≥44px, PinchZoomContainer respected.
- No regressions on other tabs (smoke test: My Events, Tables, Guest List load).

## Approval

Approve and I'll execute 2A → 2D in order without stopping, then return with a final diff summary and QA notes.
