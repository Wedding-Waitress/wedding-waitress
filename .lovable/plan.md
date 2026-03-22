

## Remove Asymmetric Padding from `buildAbsoluteStyle`

### Change
**File: `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`** (lines 355-359)

Delete the padding spread block:
```tsx
// DELETE these 5 lines:
        // Shift text horizontally via asymmetric padding when not at center
        ...(Math.abs(xShift) > 0.01 ? {
          paddingLeft: xShift > 0 ? `${xShift * 2}%` : '0',
          paddingRight: xShift < 0 ? `${Math.abs(xShift) * 2}%` : '0',
        } : {}),
```

The `xShift` variable declaration above can also be removed since it's no longer referenced.

No other changes to the file.

