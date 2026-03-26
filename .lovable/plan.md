

## Replace Text Styling Switches with Dropdown Menus

### Problem
The Place Cards customizer uses three toggle switches (Bold, Italic, Underline) for text styling, while the Invitations page uses a single dropdown with options: Default, Bold, Italic, Underline. The user wants them to match.

### Changes — `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`

**1. Guest Name section (lines 316-330)**
Replace the three Switch toggles with a single `<Select>` dropdown labeled "Text Style" with options: Default, Bold, Italic, Underline. On change, set the corresponding bold/italic/underline flags (only one active at a time, matching Invitations behavior).

**2. Table & Seat section (lines 378-391)**
Same replacement — swap the three Switch toggles for an identical dropdown.

**3. Helper logic**
Add a helper to derive the current style value from the three boolean flags, and a handler that sets the correct combination when a dropdown option is selected:
- "Default" → bold=false, italic=false, underline=false
- "Bold" → bold=true, italic=false, underline=false
- "Italic" → bold=false, italic=true, underline=false
- "Underline" → bold=false, italic=false, underline=true

**4. Layout adjustment**
The "Text Styling" label + dropdown replaces the vertical switch list, sitting side-by-side with "Color" in the existing `grid-cols-2` row — matching the Invitations layout where "Font Color" and "Text Style" sit in a two-column grid.

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`

