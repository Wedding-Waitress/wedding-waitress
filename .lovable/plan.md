

## Style Text Edit Mode Toggle — Red OFF State

### Change
Add a `className` to the Switch on line 425-428 of `PlaceCardCustomizer.tsx` that overrides the unchecked background color to use the existing `destructive` color (same as the "Reset to Default" button).

### File: `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`

**Line 425-428** — Add className to the Switch:
```tsx
<Switch
  checked={textEditMode}
  onCheckedChange={(checked) => onTextEditModeChange?.(checked)}
  className="data-[state=unchecked]:bg-destructive"
/>
```

This uses the same `hsl(var(--destructive))` color token that the destructive button variant uses. No new colors, no logic changes.

