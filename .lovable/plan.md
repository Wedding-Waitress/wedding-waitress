

# Plan: Replace Font Size with Bold/Italic/Underline in Full Seating Chart Typography Settings

## What Changes

In the Chart Settings panel under Typography, the Font Size dropdown will be removed and replaced with a "Text Style" dropdown containing Bold, Italic, and Underline options -- each with icons, checkmarks when active, and light purple hover with dark purple text (matching Running Sheet styling).

These text styles will apply only to guest names and table text in the preview and PDF downloads. Display option items (dietary, relationship info) remain unaffected.

## Files to Change

### 1. Database Migration
Add three new columns to `full_seating_chart_settings`:
- `is_bold` (boolean, default true -- currently guest names are already bold)
- `is_italic` (boolean, default false)
- `is_underline` (boolean, default false)

### 2. `src/hooks/useFullSeatingChartSettings.ts`
- Add `isBold`, `isItalic`, `isUnderline` to the `FullSeatingChartSettings` interface
- Set defaults: `isBold: true`, `isItalic: false`, `isUnderline: false`
- Map these to/from DB columns `is_bold`, `is_italic`, `is_underline` in load/save
- Keep `fontSize` in the interface hardcoded to `'small'` (always 13px) but remove it from user-facing controls

### 3. `src/components/Dashboard/FullSeatingChart/FullSeatingChartCustomizer.tsx`
- Remove the Font Size `<Select>` dropdown entirely
- Replace with a "Text Style" dropdown using `DropdownMenu` (matching Running Sheet row actions)
- Three items: Bold (with `<Bold>` icon), Italic (with `<Italic>` icon), Underline (with `<Underline>` icon)
- Each shows a checkmark (`✓`) when active, toggling on click
- Icons and text are black by default
- On hover: light purple background, dark purple text (using `hover:bg-primary/10 hover:text-primary`)

### 4. `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx`
- In `ScreenGuestRow`: apply `font-bold`/`italic`/`underline` classes to guest name and table text based on settings
- Info line (dietary/relation) remains unaffected
- In `PrintGuestRow`: apply same formatting via inline styles
- Print CSS: conditionally apply `font-style: italic` and `text-decoration: underline` to `.print-guest-name` and `.print-table`

### 5. `src/lib/fullSeatingChartPdfExporter.ts`
- Read `isBold`, `isItalic`, `isUnderline` from settings
- Apply jsPDF font style (`bold`, `italic`, `bolditalic`, `normal`) to guest name and table text rendering
- For underline: manually draw a line under text using `pdf.line()`
- Info line (dietary/relation) remains unaffected

### 6. `src/integrations/supabase/types.ts`
- Regenerate or manually add `is_bold`, `is_italic`, `is_underline` fields to the `full_seating_chart_settings` type

## Dropdown Styling Detail

The dropdown will look like this, matching the Running Sheet:

```text
┌──────────────────────┐
│ 𝐁  Bold          ✓  │  ← black icon + text, checkmark if active
│ 𝐼  Italic            │
│ U̲  Underline         │
└──────────────────────┘
   hover: light purple bg, dark purple text
```

## What Stays the Same
- Font size remains hardcoded at 13px (small) for preview and PDF -- no user control
- Display options (dietary, relationship) text styling unchanged
- All existing layout, pagination, footer, and header measurements untouched

