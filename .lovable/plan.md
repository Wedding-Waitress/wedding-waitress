

## Changes to Place Cards Customizer — Position Tab

### 1. Rename "Position" tab to "Text Position"

**File:** `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`
- **Line 273**: Change `<TabsTrigger value="position">Position</TabsTrigger>` to `<TabsTrigger value="position">Text Position</TabsTrigger>`

### 2. Add editable input boxes next to the mm values

For all four offset displays (lines 410, 424, 443, 457), replace the plain `<span>` showing e.g. `0mm` with a small editable `<Input>` box (type="number", width ~70px). The input will:
- Display the current value with "mm" suffix
- Allow the user to type a value directly
- On change, update local state immediately
- On blur or Enter, commit the value to Supabase via `onSettingsChange`
- Stay in sync with the slider (slider moves update the input, input changes move the slider)

Each input will be constrained to the same min/max as its corresponding slider (e.g. -25 to 25 for horizontal, -9 to 25 for guest vertical, -15 to 15 for table vertical).

### 3. Ensure slider smoothness and instant sync

The current implementation already uses the local-state pattern (onValueChange for immediate feedback, onValueCommit for persistence). I will verify the step size (0.5) is appropriate and ensure there are no unnecessary re-renders. The sliders should already be smooth, but the input boxes will give users an alternative for precise control.

### Summary

Three changes in one file: rename the tab label, add four numeric input boxes alongside the mm displays, and keep slider sync working smoothly.

