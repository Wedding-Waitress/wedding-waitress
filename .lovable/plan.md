

## Reposition Guide Labels Under Master Card Box

### Problem
The three labels ("Back of card", "Fold", "Front of card") are anchored to `right: 0` implicitly (default), while the Master Card box uses `right: 0` explicitly. The labels need to shift left to center under the instruction box.

### Change — `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` (lines 730-741)

Add `right: 0` to each of the three label divs so they right-align with the Master Card box (which also uses `right: 0`). Then wrap each label's content in a container that centers it relative to the 125px-wide instruction box above.

Specifically, add `right: 0` and `width: '125px'` plus `justifyContent: 'center'` to each label row, so they match the horizontal extent of the instruction box and their text appears centered beneath it. The arrows stay at the end via a slight layout tweak.

**Simpler approach**: Just add `right: 0` and `width: '125px'` to each label's absolute div, and change from `gap-1.5` to `justify-between` so the text sits left-centered and arrow sits at the right edge pointing into the card.

### Concrete edits (lines 730-741)

For each of the three label divs, change:
```tsx
// Before
<div className="absolute flex items-center gap-1.5" style={{ top: '24.75mm', transform: 'translateY(-50%)' }}>
```
To:
```tsx
// After
<div className="absolute flex items-center justify-between" style={{ top: '24.75mm', transform: 'translateY(-50%)', right: 0, width: '125px' }}>
```

Apply the same pattern to all three labels (lines 730, 734, 738). This anchors them to `right: 0` with `width: 125px` — identical to the instruction box — so they center directly below it.

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`

