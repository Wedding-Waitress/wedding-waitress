

# Add Text Position Controls to Place Cards

## Overview
Add the ability to adjust the vertical and horizontal position of three text elements on place cards: **Guest Name**, **Table Number**, and **Seat Number**. Changing the position on one card automatically applies to all cards (stored in settings, not per-guest).

## How It Works
- Three new pairs of offset values are added to the place card settings: X and Y offsets for Guest Name, Table, and Seat
- Default position is 0/0 (current layout behavior)
- Users adjust via sliders in the Customizer panel on the left
- All cards update in real-time as the sliders move

## Technical Details

### 1. Database Migration
Add 6 new columns to `place_card_settings`:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `guest_name_offset_x` | numeric | 0 | Horizontal shift (mm) for guest name |
| `guest_name_offset_y` | numeric | 0 | Vertical shift (mm) for guest name |
| `table_offset_x` | numeric | 0 | Horizontal shift (mm) for table number |
| `table_offset_y` | numeric | 0 | Vertical shift (mm) for table number |
| `seat_offset_x` | numeric | 0 | Horizontal shift (mm) for seat number |
| `seat_offset_y` | numeric | 0 | Vertical shift (mm) for seat number |

### 2. Update PlaceCardSettings Interface
Add the 6 new fields to the TypeScript interface in `usePlaceCardSettings.ts`.

### 3. Update PlaceCardCustomizer
Add a new section (e.g., under a "Position" icon tab or within the existing Typography tab) with 6 sliders:
- **Guest Name**: X offset (-15mm to +15mm), Y offset (-15mm to +15mm)
- **Table Number**: X offset (-15mm to +15mm), Y offset (-15mm to +15mm)
- **Seat Number**: X offset (-15mm to +15mm), Y offset (-15mm to +15mm)

Each slider defaults to 0 and shows the current mm value.

### 4. Update PlaceCardPreview
Apply `transform: translate(Xmm, Ymm)` to each text element using the offset values from settings. This shifts elements visually without breaking the existing layout flow. The offsets are applied in both standard and decorative modes.

### 5. Update PlaceCardExporter
Ensure the same offsets are applied during 300 DPI export so printed cards match the preview exactly.

### Files Modified
- `supabase/migrations/` -- new migration for 6 columns
- `src/integrations/supabase/types.ts` -- regenerated types
- `src/hooks/usePlaceCardSettings.ts` -- add 6 offset fields to interface
- `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx` -- add position sliders UI
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` -- apply transform offsets to text elements

