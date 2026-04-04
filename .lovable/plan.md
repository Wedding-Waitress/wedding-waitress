

## Plan: Vertically Center Seat Numbers in Circles (Preview + PDF)

### Problem
Seat number text inside the small round seat circles sits slightly too low in both the on-screen preview and the PDF download. The numbers need to shift up slightly to appear perfectly centered.

### Root Cause
In the **preview**, the seat number uses `<span className="font-bold text-xs">` inside a flexbox circle. The default text baseline and line-height cause the number to render slightly below true center.

In the **PDF engine**, the seat circle uses `display: flex; align-items: center; justify-content: center` with `font-size: 12px`, but `html2canvas` renders the text slightly low due to line-height and baseline quirks.

### Changes

**File 1: `src/components/Dashboard/IndividualTableChart/IndividualTableChartPreview.tsx`**

In the seat circle div (around line 881), add a small upward nudge to the span containing the seat number. Change:
```tsx
<span className="font-bold text-xs">{seat.number}</span>
```
to:
```tsx
<span className="font-bold text-xs" style={{ marginTop: '-1px' }}>{seat.number}</span>
```

This shifts the number up by 1px to visually center it within the circle. The guest name labels use `transform: translate(..., -50%)` keyed to the same `seat.y` position, so they will remain aligned.

**File 2: `src/lib/individualTableChartEngine.ts`**

In the seat circle HTML (around line 1180-1181), wrap the seat number in a span with a small upward offset. Change:
```html
${settings.showSeatNumbers ? seat.number : ''}
```
to:
```html
${settings.showSeatNumbers ? `<span style="margin-top: -1px; display: block;">${seat.number}</span>` : ''}
```

This applies the same 1px upward nudge in the PDF engine to match the preview.

### What stays unchanged
- Circle size (44px / w-11 h-11)
- Circle position (x, y coordinates)
- Guest name positions (labelX, labelY)
- Font sizes, spacing, A4 layout, PDF scaling
- All other table shapes (square, long) and their seat circles

