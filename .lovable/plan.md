

# Match DJ-MC Questionnaire Row Styling to Running Sheet

## Summary

Three visual changes to the DJ-MC Questionnaire rows to match the Running Sheet's look and feel:

1. **Always-visible drag handles** -- The six-dot grip icon will always be shown, not just on hover.
2. **Purple hover background** -- Hovering over a row will show the same dark purple background (`bg-purple-200`) as the Running Sheet.
3. **Gray background on fields** -- All value/text display areas will have a subtle gray background (matching the Running Sheet's input styling) for better visibility.

## Technical Details

### File: `src/components/Dashboard/DJMCQuestionnaire/DJMCSectionRow.tsx`

**1. Drag handle always visible**
- Line 156 (do_not_play layout): Remove `opacity-0 group-hover:opacity-100 transition-opacity` from the drag handle wrapper.
- Line 241 (standard layout): Same removal.

**2. Purple hover on rows**
- Line 150 (do_not_play layout): Change `hover:bg-muted/50` to `hover:bg-purple-200`.
- Line 235 (standard layout): Change `hover:bg-muted/50` to `hover:bg-purple-200`.

**3. Gray background on display fields**
- Update all non-editing display `<div>` elements (the "click to add" text areas) to use `bg-muted` (gray) background instead of transparent, matching the Running Sheet's `bg-background border border-input` textarea styling. This affects approximately 10-12 display divs across the various section type layouts (speeches, introductions, ceremony, traditional, cocktail, etc.).

No other files need to change.

