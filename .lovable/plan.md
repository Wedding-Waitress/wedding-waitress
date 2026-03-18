

## Add Table & Seat Styling Panel to Place Cards Design Tab

### Summary
Replace the single "Guest Name Styling" block with two side-by-side styling boxes: one for guest name (existing), one for table/seat text (new). Requires a database migration for the new fields and updates to the customizer, preview, and settings hook.

### Changes

**1. Database Migration (new file)**
Add three new columns to `place_card_settings`:
```sql
ALTER TABLE place_card_settings
  ADD COLUMN IF NOT EXISTS info_bold BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS info_italic BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS info_underline BOOLEAN NOT NULL DEFAULT false;
```

**2. `src/hooks/usePlaceCardSettings.ts`**
Add `info_bold`, `info_italic`, `info_underline` (all `boolean`) to the `PlaceCardSettings` interface.

**3. `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`**
- Update `currentSettings` defaults to include `info_bold: false`, `info_italic: false`, `info_underline: false`.
- Update `handleResetDesignDefaults` to reset these three fields.
- Replace the single "Guest Name Styling" box (lines 317-346) with a horizontal row (`grid grid-cols-2 gap-4`, stacking on small screens via `grid-cols-1 sm:grid-cols-2`):
  - **Left box**: "Guest Name Styling" — same Bold/Italic/Underline toggles as now, targeting `guest_name_bold`, `guest_name_italic`, `guest_name_underline`.
  - **Right box**: "Table & Seat Styling" — new Bold/Italic/Underline toggles targeting `info_bold`, `info_italic`, `info_underline`.
  - Both boxes: `border border-primary rounded-xl bg-white p-3` styling.

**4. `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`**
- Add `info_bold: false`, `info_italic: false`, `info_underline: false` to fallback defaults.
- Apply `fontWeight`, `fontStyle`, `textDecoration` from `info_bold`/`info_italic`/`info_underline` to all table/seat text elements (both decorative and standard layouts).

**5. `src/integrations/supabase/types.ts`**
Will be auto-regenerated after migration. The three new columns will appear in the `place_card_settings` table type.

