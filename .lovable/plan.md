

# Plan: Full App Colour Theme Change — Purple to Brown (#967A59)

## Summary
Replace the entire purple brand colour system with a warm luxury brown (#967A59) palette across the full app. Update logos to the uploaded brown versions. Update favicon. No layout, spacing, or structural changes.

## New Brown Palette (derived from #967A59)

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| primary | 30 25% 47% | #967A59 | Main brand |
| primary-hover | 30 25% 52% | #A6896A | Hover states |
| primary-glow | 30 25% 57% | #B69A7B | Glow/focus |
| accent bg | 30 20% 95% | #F5F0EB | Soft tint fills |
| card-border | 30 20% 90% | #E8DED4 | Card/input borders |
| muted accent | 30 15% 89% | #E3DCD5 | Secondary bg |

## Files to Modify

### 1. Logo & Favicon Assets
- Copy `user-uploads://Favicon._Brown._PNG.png` → `public/favicon-brown.png` (new favicon)
- Copy `user-uploads://Wedding_Waitress._Brown._PNG.png` → `src/assets/wedding-waitress-brown-logo.png` and `public/wedding-waitress-logo-full.png` (overwrite)
- Delete old `public/favicon.ico`, update `index.html` to use new favicon

### 2. `index.html`
- Change `theme-color` from `#A56EFF` → `#967A59`
- Update favicon link to new brown PNG

### 3. `public/manifest.json`
- Change `theme_color` from `#A56EFF` → `#967A59`
- Change `background_color` from `#F5F3FF` → `#FAF8F5`

### 4. `src/index.css` — CSS Variables (lines 59-130)
- Replace all `262 83%` hue/sat values with `30 25%` brown equivalents
- Update `--gradient-primary`, `--gradient-hero`, `--gradient-card`, `--gradient-subtle` from purple to warm brown tones
- Update `--shadow-*` from purple hues to brown hues
- Update `.glass-purple` → brown-tinted glass
- Update `.event-row--new` from `#F6F0FF`/`#7C3AED` → `#F5F0EB`/`#967A59`
- Update `.shadow-purple-glow` utility to brown glow
- Update `.full-seating-chart-dark-purple` override class to brown

### 5. `tailwind.config.ts`
- Rename `shadow-purple-glow` reference (already maps to CSS var, so no change needed if CSS var is updated)

### 6. `src/components/Layout/Header.tsx`
- Line 160: Change hamburger `backgroundColor: '#6D28D9'` → `'#967A59'`
- Line 173, 177: Change `color: '#6D28D9'` → `'#967A59'`
- Line 80: Logo `src` will auto-update since we overwrite the public file

### 7. `src/pages/Landing.tsx`
- Lines 343, 354: Change `text-purple-400` → a brown accent class (e.g., `text-[#C4A882]`)
- Footer logo (line 527): already uses `/wedding-waitress-logo-full.png` which we overwrite

### 8. `src/components/Dashboard/AppSidebar.tsx`
- Line 123: Change `!bg-purple-100 border-purple-700 hover:!bg-purple-200` → `!bg-[#F5F0EB] border-[#967A59] hover:!bg-[#EDE5DB]`
- Line 145: Change `bg-purple-100` → `bg-[#F5F0EB]`
- Lines 160-163: Change `#6D28D9` → `#967A59` (Admin Panel)

### 9. Hardcoded purple hex across ~42 files
Systematic find-and-replace for:
- `#6D28D9` / `#6d28d9` → `#967A59` (primary brand)
- `#7C3AED` → `#967A59` (drag-drop indicators)
- `#5B21B6` → `#7A6347` (darker active)
- `#7248e6` / `#7248E6` → `#967A59` (form borders, dots)
- `rgba(114, 72, 230, ...)` → `rgba(150, 122, 89, ...)` (glow shadows)
- `rgba(124, 58, 237, ...)` → `rgba(150, 122, 89, ...)` (DnD glow)
- `#F6F0FF` → `#F5F0EB` (highlight backgrounds)
- `purple-100` → custom brown-100 equivalent
- `purple-200` → custom brown-200 equivalent  
- `purple-400` → custom brown-400 equivalent
- `purple-700` → custom brown-700 equivalent
- `purple-950` → custom brown-950 equivalent

Key files with hardcoded purple:
- `src/components/Dashboard/GuestListTable.tsx` — row borders, dots, hover states
- `src/components/Dashboard/CreateTableModal.tsx` — form border colors
- `src/components/Dashboard/TimePicker.tsx` — border colors
- `src/components/Dashboard/Tables/TableGuestList.tsx` — DnD drop indicator
- `src/components/Dashboard/IndividualTableChart/IndividualTableChartPreview.tsx` — header colors
- `src/pages/SeatingChartPublicView.tsx` — header/divider colors
- `src/lib/djMCQuestionnairePdfExporter.ts` — PDF branding color constant
- `src/lib/dietaryChartPdfExporter.ts` — PDF purple constant
- `src/lib/runningSheetPdfExporter.ts` — divider color
- `src/lib/individualTableChartEngine.ts` — header HTML
- `src/lib/fullSeatingChartDocxExporter.ts` — purple reference
- `src/components/Admin/AdminSystemSettings.tsx` — admin card headers
- `src/components/Dashboard/QRCode/QRCodeFeatureGrid.tsx` — glow class
- All other files from the search results

### 10. `src/App.css`
- No purple references to change

### 11. Memory update
- Update `mem://design/design-system` and `mem://index.md` core line with new brand color

## What stays the same
- All layout, spacing, typography, section order
- All functionality and features
- Status colors (success green, destructive red, warning amber)
- The color picker palette in `color-picker-popover.tsx` (those are user-facing palette options)

## Execution order
1. Copy logo assets (favicon + full logo)
2. Update `index.html` and `manifest.json`
3. Update `src/index.css` CSS variables (single source of truth)
4. Systematic search-and-replace across all 42+ files with hardcoded purple
5. Update `Landing.tsx`, `Header.tsx`, `AppSidebar.tsx` specific classes
6. Build check
7. Update memory

