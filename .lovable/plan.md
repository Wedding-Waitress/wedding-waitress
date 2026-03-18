

## Rename "Table, Seat & Message" to "Table & Seat" + Add Message Styling Box to Messages Tab

### What Changes

**1. Design Tab — Rename only**
- Line 364 in `PlaceCardCustomizer.tsx`: Change `"Table, Seat & Message"` to `"Table & Seat"`

**2. Messages Tab — Add a styling box at the top**
Add a new purple-bordered styling box (identical structure to the "Table & Seat" box in the Design tab) at the top of the Messages tab content (before the Mass Message section). This box will be titled **"Message Styling"** and contain:
- Row 1: Font picker + Font Size dropdown
- Row 2: Bold/Italic/Underline toggles + Color picker

This requires **new database columns** for message-specific styling since messages currently share `info_font_family`/`info_font_size`/`info_font_color` with table & seat text.

**3. Database Migration** — Add 6 new columns to `place_card_settings`:
- `message_font_family` (TEXT, default `'Beauty Mountains'`)
- `message_font_size` (INTEGER, default `16`)
- `message_font_color` (TEXT, default `'#000000'`)
- `message_bold` (BOOLEAN, default `false`)
- `message_italic` (BOOLEAN, default `false`)
- `message_underline` (BOOLEAN, default `false`)

**4. `src/hooks/usePlaceCardSettings.ts`** — Add the 6 new fields to `PlaceCardSettings` interface.

**5. `src/integrations/supabase/types.ts`** — Add the 6 new fields to the `place_card_settings` type.

**6. `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`**
- Add message defaults to fallback settings
- Update the message rendering (lines 223-235) to use `message_font_family`, `message_font_size`, `message_font_color`, `message_bold`, `message_italic`, `message_underline` instead of `info_font_family`/`info_font_size`/`info_font_color`

**7. `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`**
- Add message defaults to `currentSettings` and `handleResetMessagesDefaults`
- Insert the styling box at line 900 (top of Messages tab), before Mass Message section

