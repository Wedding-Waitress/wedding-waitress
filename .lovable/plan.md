

## Reposition Master Card Guide Labels Outside A4 Preview

### Problem
The "Back of card", "Fold", and "Front of card" labels with arrows are currently positioned inside the card cell using `left: -30mm`, which places them on top of the A4 preview area. They need to sit in the purple gap between the customizer panel and the A4 page.

### Approach
Move the labels from inside the individual card's `renderPlaceCard` function to the A4 container level, positioned absolutely to the left of the A4 paper. This way they sit in the purple background area outside the white A4 sheet.

### Changes — `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`

**1. Remove labels from `renderPlaceCard`** (lines 436-454)
Delete the entire `{isFirstCard && !isExporting && (...)}` block that renders the three guide labels inside the card cell.

**2. Add labels at the A4 container level** (around line 729)
Change the `<div className="flex justify-center">` wrapper to `position: relative` and insert a new absolutely-positioned label column to the left of the A4 paper:

```tsx
<div className="flex justify-center relative">
  {/* Guide labels — outside A4, in purple gap */}
  {!isExporting && (
    <div
      className="absolute pointer-events-none hidden lg:flex flex-col"
      style={{
        right: 'calc(50% + 105mm + 8px)',
        top: 0,
        height: '297mm',
      }}
    >
      {/* Back of card — at 25% of first card (≈24.75mm) */}
      <div className="absolute flex items-center gap-1.5" style={{ top: '24.75mm', transform: 'translateY(-50%)' }}>
        <span className="text-[10px] ...">Back of card</span>
        <span>→</span>
      </div>
      {/* Fold — at 49.5mm */}
      <div className="absolute flex items-center gap-1.5" style={{ top: '49.5mm', transform: 'translateY(-50%)' }}>
        <span className="text-[10px] ...">Fold</span>
        <span>→</span>
      </div>
      {/* Front of card — at 74.25mm */}
      <div className="absolute flex items-center gap-1.5" style={{ top: '74.25mm', transform: 'translateY(-50%)' }}>
        <span className="text-[10px] ...">Front of card</span>
        <span>→</span>
      </div>
    </div>
  )}
  <div style={{ width: '210mm', height: '297mm' }} ...>
```

The labels align to the first card's sections (0-99mm): back at 25%, fold at 50%, front at 75%. Positioned using `right: calc(50% + 105mm + 8px)` to sit just left of the A4 sheet. Hidden on small screens via `hidden lg:flex`.

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`

