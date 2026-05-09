## Stage 7 — QR Seating Signs (Unified Stationery Engine)

QR Seating Signs is a sibling clone of Invitations & Cards built on **one shared stationery editor core**. Reuse, extract, never duplicate. Invitations and Signage become thin **configuration layers** on top of identical primitives.

### Architecture rule

Refactor the Invitations editor's reusable pieces into a shared core consumed by both pages:

```
src/components/Stationery/core/
  StationeryPreviewShell.tsx     // cream container, inner shadow, A4 stage, scaling
  StationeryEditorCard.tsx       // editor card + tab shell
  StationeryTabs.tsx             // brown pill tab strip
  StationeryStripSelector.tsx    // top brown pill strip (Invitation/SaveTheDate/ThankYou OR Portrait/Landscape)
  StationeryExportPanel.tsx      // header export controls (PDF/PNG)
  StationeryZoomControls.tsx     // right-edge +/- /%
  BackgroundTab.tsx              // upload/gallery/canva, opacity, color picker
  TextZonesTab.tsx               // preset chips, custom zone, empty state
  QRCodeTab.tsx                  // event picker, show toggle, draggable QR
  MessagesTab.tsx                // notes/caption
  CanvasObject.tsx               // unified draggable/resizable object renderer
  ColorSwatchPopover.tsx         // exact swatch popup currently used by Invitations
  hooks/
    useCanvasObjects.ts          // unified text/qr/future object model
    useStationeryExport.ts       // 300 DPI PDF + PNG (jsPDF + html2canvas)
    useImageUpload.ts            // 5MB cap, accepted MIME, compression, preview
    useStationeryAutosave.ts     // debounced per-event persist
```

Invitations and Signage import from `Stationery/core/` and pass configuration:
- field set, preset chips, allowed orientations/sizes, default QR position, file naming, persistence table, etc.

### No Invitations regression (hard guardrail)

Per `mem://standards/no-silent-feature-removal`, the extraction must be **behaviour-preserving** for Invitations:
- Identical rendered DOM, identical export bytes (snapshot before/after), identical mobile behaviour, identical Canva integration, identical QR rendering, identical styling tokens.
- Strategy: keep `InvitationCardCustomizer.tsx` and `InvitationCardPreview.tsx` as the source files; move pure pieces into `Stationery/core/` and have the existing Invitations files re-export/wrap them. No prop renames. No CSS class renames.
- If any divergence is unavoidable, stop and ask before merging.

### Unified canvas object model

Every text zone, QR, and future logo/icon/overlay shares one shape:

```ts
type CanvasObject = {
  id: string;
  type: 'text' | 'qr' | 'image' | 'logo' | 'shape';
  x: number; y: number;          // mm on A4 sheet
  width: number; height: number; // mm
  rotation: number;              // deg
  locked: boolean;
  zIndex: number;
  styles: Record<string, unknown>; // type-specific (font, color, opacity, etc.)
  meta?: Record<string, unknown>;  // type-specific payload (text content, qr url, image src)
};
```

Drag/resize/select/delete handled by the same `CanvasObject` renderer. Future logos, icons, table cards, decorative overlays, and drag/drop templates plug in without rewrites.

### Sidebar + naming

- Sidebar label: **QR Seating Signs**
- Main page header card title: **QR Code Seating Chart Sign**
- Editor card heading: **QR Code Seating Chart & Wedding Sign Designer**
- `AppSidebar.tsx` adds the entry under `qr-code` (icon `Printer`).
- `Dashboard.tsx` `case 'signage'` already wired; add `signage` to stats-bar exclusion.

### Top page (mirrors Invitations exactly)

Header card → green info card (A4-only, 300 DPI, scan-to-find-seat, background <5MB) → `Choose Event:` dropdown (left) + Export Controls (right) with **Download PDF** + **Download PNG** via `StationeryExportPanel`.

### Sign template strip

`StationeryStripSelector` configured with two pills only: **Portrait** | **Landscape**. Same height/spacing/brown active pill animation as Invitations. No third option. No 4-layout selector. No theme cards.

### Editor tabs

`Text Zones | Background | Add QR Code | Messages` rendered via shared `StationeryTabs` + the four shared tab components.

**Text Zones** — preset chips: Couple Names, Event Name, Event Date, Venue, Welcome Message, QR Instructions. Welcome Message default `"Please scan the QR code to find your table."`; QR Instructions default `"Scan to find your seat"`. Custom zone + empty state + Reset.
- **Preset auto-styling**: each preset inserts at a curated default position with centered alignment, readable font size, safe spacing from edges, and never overlapping the default QR zone. Feels professionally designed on first insert.

**Background** — direct reuse: No bg / Full bg radios, Choose File / Image Gallery / Design with Canva, image preview + Remove, "QR Code Sign Customisation" heading (only wording change), Image Opacity dropdown 0–100%, Card Background Colour via `ColorSwatchPopover`. Reset.

**Add QR Code** — heading "Add QR Code to Sign", event picker, Show QR on Canvas toggle, QR preview via existing `AdvancedQRGenerator` + `buildGuestLookupUrl`. Drag + resize on canvas. Reset.

**Messages** — Notes/Caption textarea with signage-specific placeholder + helper. Reset.

### QR safety + default placement

- **Default position**: bottom-center on Portrait, bottom-right safe zone on Landscape. Never inside the text content area.
- **Min size**: ≥ 35mm on the A4 sheet (~413px @ 300 DPI). Resize handles clamp.
- **Contrast**: dark FG on light BG enforced.
- **Render**: 300 DPI in exports — never upscaled from preview bitmap.

### Preview (mirrors Invitations + landscape safety)

`StationeryPreviewShell` — same cream container, inner shadow, scaling, scroll, zoom controls, breathing room.
- A4 portrait (210×297mm) or landscape (297×210mm) per strip.
- **Landscape safety**: never stretch, crop, overflow, or go edge-to-edge. Force extra padding (≥ 32px desktop / 24px mobile) around the A4 stage. Fit via `Math.min((maxW − pad) / sheetW, (maxH − pad) / sheetH)`. Landscape gets *more* whitespace than portrait.
- Wrapped in `<PinchZoomContainer naturalWidth={794}>` per memory rule.

### Export consistency

`useStationeryExport` produces PDF + PNG that **match the live preview exactly**: same scaling, spacing, QR position, opacity, typography, landscape padding. Filenames `WW-Sign-{EventName}-{Orientation}.pdf` / `.png` per `mem://standards/export-filenames`. No "preview vs export" drift.

### Persistence (autosave)

`useStationeryAutosave` debounces (~400ms) and persists per event:
`orientation, textZones[], qr {position, size, enabled}, background {imageUrl, opacity, color}, notes`.

Migration: new table `signage_settings` (event_id PK, jsonb columns, RLS by `auth.uid() = user_id`) following the existing settings-table pattern. Users can leave and return.

### Performance guard

- `CanvasObject` is `React.memo` with shallow-equality on its slice of state.
- Drag/resize updates use refs + `requestAnimationFrame`, only committing to React state on pointer-up.
- Background image kept as a stable URL/blob ref; not re-decoded on every keystroke.
- QR re-renders only when its URL/size/colors change.

### Responsive parity

Tablet/mobile follows Invitations exactly: same stacking, editor/preview collapse, spacing, sidebar, overflow.

### Future-ready, hidden in V1

`CanvasObject` already supports `image | logo | shape`. Hooks/extension points stubbed for logo uploads, image overlays, decorative assets, seating-chart themes, premium templates, sponsor/vendor branding. **Not surfaced in V1 UI.** Existing `signageTemplateEngine.ts`, `SignageTemplateCard.tsx`, and the 10 themes stay on disk untouched.

### Implementation priority order

1. Exact Invitations parity shell (extract `Stationery/core/` + verify zero Invitations regression).
2. Stable shared infrastructure (canvas object model, autosave, export).
3. Live preview correctness (portrait + landscape padding, zoom).
4. Export correctness (PDF + PNG match preview exactly).
5. Mobile responsiveness.
6. Future extensibility hooks (no UI surface).

Do not optimise fancy features before parity + stability are perfect.

### Files

- `src/components/Stationery/core/*` — new shared primitives extracted from Invitations.
- `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx` + `InvitationCardPreview.tsx` + `InvitationExporter.tsx` — refactored to consume the shared core, with **identical rendered output**.
- `src/components/Dashboard/Signage/SignagePage.tsx` — slim composition of the shared core configured for signage.
- `src/components/Dashboard/Signage/SignageEditorTabs.tsx` / `SignagePreview.tsx` / `SignageExporter.tsx` — thin signage-specific wrappers.
- `src/hooks/useSignageSettings.ts` — wraps `useStationeryAutosave` for the new table.
- `src/components/Dashboard/AppSidebar.tsx` — Signage entry.
- `src/pages/Dashboard.tsx` — stats-bar exclusion only.
- New migration: `signage_settings` table with RLS.

### Standards compliance

- All buttons get `lv-premium-shade`.
- Brand tokens `#967A59` brown / cream / Inter preserved.
- PinchZoom on the preview area only.
- `no-silent-feature-removal` applies to every Invitations touchpoint.

### Out of scope (unchanged)

Drag-and-drop full editor beyond Invitations parity, printing fulfillment, checkout, credits redemption, advanced template marketplace, additional fully-rendered themes.
