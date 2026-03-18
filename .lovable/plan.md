

## Redesign the Design Tab into Two Self-Contained Styled Boxes

### What Changes

The Design tab currently has scattered controls (font pickers, styling boxes, font sizes, single color picker). The target layout groups everything into **two purple-bordered boxes stacked vertically**, each fully self-contained:

**Box 1 — "Guest Name"**
- Row 1: Font picker (left) + Font Size dropdown (right) — side by side
- Row 2: Text Styling toggles (Bold, Italic, Underline) on left + Color picker on right — side by side

**Box 2 — "Table & Seat"**
- Identical layout to Box 1 but controlling `info_font_family`, `info_font_size`, `info_bold/italic/underline`, and a **new** `info_font_color`

**Reset to Default** button remains below both boxes.

### Technical Details

**1. Database Migration (new file)**
Add one new column for independent table/seat color:
```sql
ALTER TABLE place_card_settings
  ADD COLUMN IF NOT EXISTS info_font_color TEXT NOT NULL DEFAULT '#000000';
```

**2. `src/hooks/usePlaceCardSettings.ts`**
Add `info_font_color: string` to the `PlaceCardSettings` interface.

**3. `src/integrations/supabase/types.ts`**
Add `info_font_color` to the `place_card_settings` row/insert/update types.

**4. `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`**
Replace lines 299-451 (the entire Design tab content) with:
- Two `border-[1.5px] border-primary rounded-xl bg-white p-4` boxes, stacked vertically with `gap-4`
- Each box title ("Guest Name", "Table & Seat") as a bold label
- Inside each box: a 2-column grid for Font + Font Size, then a 2-column grid for Text Styling (B/I/U toggles) + Color picker
- Guest Name box uses: `guest_font_family`, `guest_name_font_size`, `guest_name_bold/italic/underline`, `font_color`
- Table & Seat box uses: `info_font_family`, `info_font_size`, `info_bold/italic/underline`, `info_font_color` (new)
- Reset button resets `info_font_color` to `'#000000'` as well

**5. `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`**
- Add `info_font_color` to defaults (fallback `'#000000'`)
- Use `info_font_color` for table/seat text color instead of `font_color`

