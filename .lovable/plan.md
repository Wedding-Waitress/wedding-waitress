

## Change Default Table/Seat/Message Font to "Beauty Mountains"

Replace all occurrences of `'ET Emilia Grace Demo'` with `'Beauty Mountains'` in the **Place Cards** files only (not Invitations):

**`src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`** (3 locations)
- Line 109: initial defaults `info_font_family`
- Line 151: reset defaults `info_font_family`
- Line 318: fallback in font picker value

**`src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`** (1 location)
- Line 50: preview fallback `info_font_family`

All four changes are the same: `'ET Emilia Grace Demo'` → `'Beauty Mountains'`.

No database changes needed — the font name is just a string stored in the existing column.

