## Phase 1B — Reception Floor Plan background upload

Scope: **Reception Floor Plan only.** Zero changes to Ceremony, Tables, Guest List, Landing, dashboard shell, or any other page.

## What gets built

### 1. Database (migration)

Extend the existing `reception_floor_plans` row with optional background fields (no new table, no breaking change):

- `background_path` text — storage path inside the private bucket (null = no background)
- `background_mime` text — `'image/png' | 'image/jpeg'` (PDFs are rasterised to PNG on upload, so the stored asset is always an image)
- `background_x_m` numeric default 0 — centre X in metres
- `background_y_m` numeric default 0 — centre Y in metres
- `background_width_m` numeric — rendered width in metres
- `background_height_m` numeric — rendered height in metres
- `background_rotation` numeric default 0 — degrees
- `background_opacity` numeric default 0.6 — 0.1 to 1
- `background_locked` boolean default false
- `background_visible` boolean default true

No RLS changes — existing event‑owner policies cover the new columns automatically.

### 2. Storage (migration)

Create a **private** bucket `reception-floor-plan-backgrounds`. Files stored under `{auth.uid()}/{event_id}/{uuid}.png|jpg`. RLS on `storage.objects`:

- Only the owner (folder name === `auth.uid()`) can `select`, `insert`, `update`, `delete`.
- No public reads. The client fetches a short‑lived signed URL on demand.

### 3. Hook updates — `src/hooks/useReceptionFloorPlan.ts`

- Extend `ReceptionFloorPlan` type with the new background fields.
- `fromRow` reads them; `persist` writes them.
- Add `uploadBackground(file: File)` helper:
  - Accept `image/png`, `image/jpeg`, `application/pdf`.
  - For PDF: load `pdfjs-dist`, render **page 1 only** to an offscreen canvas at 2× scale, export PNG blob.
  - For PNG/JPG: use as‑is.
  - Upload to `reception-floor-plan-backgrounds/{uid}/{eventId}/{uuid}.{ext}` via `supabase.storage`.
  - On success, save `background_path` + `background_mime`; default geometry to centre of room at half room width preserving aspect ratio; reset opacity to 0.6, visible true, locked false.
  - Delete previous file when replacing.
- Add `removeBackground()` → delete from storage + null out fields.
- Add `signedBackgroundUrl` state (re‑signed every 50 min while page is open).

### 4. UI — `ReceptionFloorPlanPage.tsx`

New "Venue background" panel (collapsible card under Room dimensions, above the canvas), visible only on the Reception tab:

- Upload button (`lv-premium-shade`, h-11 on mobile) → hidden `<input type="file" accept=".png,.jpg,.jpeg,.pdf">`.
- "Replace" / "Remove" buttons when a background is loaded.
- Opacity slider (0.1 → 1.0).
- Visible toggle (pill style, gray/green, per mobile rules).
- Lock/Unlock toggle.
- Reset size to room toggle button.
- Loading spinner during upload / PDF rasterisation.
- All controls touch‑target ≥ 44px, full‑width single column on mobile.

### 5. Canvas — `ReceptionFloorPlanCanvas.tsx`

- Render the background as the **first absolutely‑positioned child** of the room div (so grid lines from the parent `backgroundImage` sit *under* it, and fixtures/tables sit *above* it — z‑index unchanged).
- Geometry uses `position:absolute; left/top` in metres × `PX_PER_M`, `transform: translate(-50%,-50%) rotate(Xdeg)`, `opacity`, `pointer-events: auto` only when selected and unlocked.
- New selection kind `'background'`:
  - Click on background image (when unlocked + not in a table/fixture hit) selects it.
  - Pointer drag moves it (clamped so its centre stays inside the room ± 2 m).
  - Corner resize handle (bottom‑right) — scales width/height preserving aspect ratio.
  - Same `SelectionToolbar` style: Rotate +15°, Lock/Unlock, Reset to room‑fit. (No Remove here — Remove lives in the Venue background panel to avoid accidents.)
- Tables and fixtures continue to render after the background → always on top.

### 6. PDF page 1 rasterisation

- Add `pdfjs-dist` dependency. Use the worker via `?url` import (`import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'` and `GlobalWorkerOptions.workerSrc = workerUrl`).
- Render only `getPage(1)` at viewport scale 2.0 → PNG blob via `canvas.toBlob`.
- Hard fail with a toast if PDF is encrypted/empty.

### 7. Mobile / tablet

- Background panel matches mobile rules: full‑width inputs, ≥44 px controls, pill toggles green/gray, sticky upload button at the bottom of the panel.
- Drag/resize works with `pointer-events` (already used for tables) — same touch behaviour.
- `PinchZoomContainer` already wraps the canvas; background is inside it so it pinches with the room.

### 8. PDF export parity

`receptionFloorPlanPdfExporter.ts` is **not** modified in this phase. The exported PDF will continue to show only the white room + grid + fixtures + tables. Including the background in PDF export is **out of scope** for Phase 1B (per the request: "appear as a background layer behind the reception canvas").

## Files touched (Reception scope only)

- `supabase/migrations/<ts>_reception_floor_plan_background.sql` (new)
- `src/integrations/supabase/types.ts` (regenerated by migration approval — not hand‑edited)
- `src/hooks/useReceptionFloorPlan.ts` (extend)
- `src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanPage.tsx` (add panel)
- `src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanCanvas.tsx` (render + select + drag/resize background layer)
- `src/components/Dashboard/FloorPlan/ReceptionFloorPlan/VenueBackgroundPanel.tsx` (new)
- `src/lib/pdfFirstPageToPng.ts` (new helper)
- `package.json` (add `pdfjs-dist`)

## Verification before stopping

1. Upload PNG → renders behind tables, opacity slider, drag, rotate, lock all work.
2. Upload JPG → same.
3. Upload PDF (multi‑page) → only page 1 rasterised, uploaded as PNG, renders.
4. Refresh page → background persists with same geometry/opacity.
5. Lock → drag/resize disabled; tables still draggable.
6. Remove → file deleted from storage, row cleared.
7. Tablet + mobile preview: controls full‑width, pinch‑zoom still works.
8. Ceremony tab opens unchanged (sanity check).

After verification I stop and report. No Phase 1C.
