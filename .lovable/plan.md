

## Reorganize Design Tab into Two Styled Sections

### Current State
The Design tab has controls scattered vertically: Guest Name Font, Table/Seat Font, two styling boxes side-by-side, two font size dropdowns, one shared color picker, and a reset button.

### Proposed Layout

Two purple-bordered rounded sections stacked vertically, each containing two rows of controls:

```text
┌─────────────────────────────────────────────────┐
│  Guest Name                                     │
│  [Font Dropdown        ] [Font Size Dropdown   ]│
│  Bold ○ Italic ○ Underline ○    [Color Picker  ]│
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Table, Seat & Message                          │
│  [Font Dropdown        ] [Font Size Dropdown   ]│
│  Bold ○ Italic ○ Underline ○    [Color Picker  ]│
└─────────────────────────────────────────────────┘

        [ Reset to Default ]
```

### Changes Required

**1. Database Migration**
Add `info_font_color` column (TEXT, default `'#000000'`) to `place_card_settings` so each section has its own color.

**2. `src/hooks/usePlaceCardSettings.ts`**
Add `info_font_color: string` to the `PlaceCardSettings` interface.

**3. `src/integrations/supabase/types.ts`**
Add `info_font_color` to the place_card_settings type (auto-regenerated after migration).

**4. `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`** (lines 299-451)
Replace the entire Design tab content with the new two-section layout:
- **Section 1 "Guest Name"**: `border-[1.5px] border-primary rounded-xl p-3`
  - Row 1: Font picker + font size dropdown side-by-side (`grid grid-cols-1 sm:grid-cols-2 gap-3`)
  - Row 2: Bold/Italic/Underline toggles on the left, ColorPickerPopover on the right
- **Section 2 "Table, Seat & Message"**: Same border styling
  - Row 1: Info font picker + info font size dropdown
  - Row 2: Info bold/italic/underline toggles + info color picker (new `info_font_color` field)
- Reset button remains at the bottom
- Update `initialDefaults` and `handleResetDesignDefaults` to include `info_font_color: '#000000'`

**5. `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`**
- Add `info_font_color: '#000000'` to defaults
- Replace `currentSettings.font_color` with `currentSettings.info_font_color` on all table/seat text elements (keep `font_color` for guest name only)

### Responsive
On small screens, each row's two columns stack vertically via `grid-cols-1 sm:grid-cols-2`.

### No Functional Changes
All existing toggles, font pickers, and settings persist. Only layout is reorganized and a separate info color is added.

