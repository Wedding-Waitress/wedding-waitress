## Phase 1C — Plan only: Background in PDF export

Goal: Render the uploaded venue background inside the existing Reception Floor Plan PDF export (A4 / A3 / A2) so the printed plan matches what's on screen. No other behaviour changes. Phase 1B stays untouched.

### Scope
- File touched: `src/lib/receptionFloorPlanPdfExporter.ts` only.
- Page touched: Reception Floor Plan only. Ceremony, exporters of other pages, and all other modules are untouched.
- No DB, storage, RLS, hook, or UI changes.

### Behaviour
- If `plan.background.path` is set AND `plan.background.visible` is true AND `width`/`height` are present → draw the image as the bottom layer of the room (under grid lines? → **above** the white room fill and **below** the grid + fixtures + tables, matching the on-screen stacking which keeps tables/fixtures above the image).
- Honour `opacity`, `rotation`, and `x / y / width / height` (meters → mm using existing `mmPerM`).
- If no background, or `visible = false`, the PDF renders exactly as today (zero visual diff).
- Locked / unlocked state has no effect on the export (locking is editor-only).

### Technical steps (in `receptionFloorPlanPdfExporter.ts`)
1. Add a small helper `fetchBackgroundDataUrl(path)`:
   - Resolve a fresh **signed URL** from the private bucket `reception-floor-plan-backgrounds` (1 h TTL, generated at export time — never embed long-lived URLs).
   - `fetch` it, read as Blob, convert to data URL via `FileReader`.
   - Detect format from blob `type` ('image/png' → 'PNG', 'image/jpeg' → 'JPEG'). PDFs were already converted to PNG on upload, so only PNG/JPEG appear here.
   - Return `{ dataUrl, format, naturalW, naturalH }` (natural size via an offscreen `Image` for rotation bounds — optional).
2. Extend `generateReceptionFloorPlanPDF(...)`:
   - Before calling the existing draw sequence, `await fetchBackgroundDataUrl(plan.background.path)` if eligible.
   - Pass the result into a new `drawBackground(ctx, bg, image)` step, invoked **after** `drawRoom` (white fill) and **before** `drawFixtures` / `drawTables`.
3. New `drawBackground(ctx, bg, image)`:
   - Compute `xMm = roomX + bg.x * mmPerM`, `yMm = roomY + bg.y * mmPerM`, `wMm = bg.width * mmPerM`, `hMm = bg.height * mmPerM`.
   - Apply opacity using jsPDF `GState`:
     ```ts
     const gs = pdf.GState({ opacity: bg.opacity });
     pdf.setGState(gs);
     ```
     and reset to `opacity: 1` immediately after the image draw.
   - Apply rotation using `pdf.addImage(dataUrl, format, xMm, yMm, wMm, hMm, undefined, 'FAST', bg.rotation)` (jsPDF rotates around the image's top-left; matches on-screen `transform-origin: center`? → confirm in QA. If mismatch, pre-translate by half-size, rotate, draw, restore, using `pdf.saveGraphicsState()` / `pdf.restoreGraphicsState()` with a rotation matrix).
   - Clip drawing to the room rectangle so any portion of the background outside the room (allowed by the editor) does not bleed onto the page margins:
     ```ts
     pdf.saveGraphicsState();
     pdf.rect(roomX, roomY, roomW, roomH).clip();
     // draw image
     pdf.restoreGraphicsState();
     ```
4. Error handling:
   - If signing or fetch fails, log a console warning, skip the background, and continue exporting (never break the export).
   - Show no toast — silent fallback keeps parity with today's behaviour.

### QA checklist (post-implementation, not now)
- A4 export with: no background → identical to current output (byte-level diff acceptable only in metadata).
- A4 / A3 / A2 each with PNG, JPEG, and PDF-derived PNG backgrounds.
- Opacity 0.1, 0.6, 1.0 all visibly correct.
- Rotation 0°, 15°, 90°, 180° render in the expected position with correct centre.
- Background extending outside the room is clipped at the room border in the PDF.
- `visible = false` produces the same PDF as "no background".
- Tables and fixtures always sit above the background in the rendered PDF.

### Estimate
~80–120 lines added to one file. No other code paths affected.

### Out of scope (future, if requested)
- Multi-page PDF backgrounds (only page 1 already supported via Phase 1B upload).
- Vector PDF embedding (we rasterise to PNG at upload time — fine for print at 2× scale).
- Background in the on-screen Ceremony tab.
