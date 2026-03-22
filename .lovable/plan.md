

## Improve Place Cards Layout Spacing & Readability

### Changes — `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`

**1. Remove purple instruction banner (lines 680-683)**
Delete the `bg-primary/10` banner that says "✏️ Customize this master card to sync with all other cards".

**2. Shift A4 preview to the right (line 711)**
Change `<div className="flex justify-center relative">` to `<div className="flex justify-center relative" style={{ marginLeft: '40px' }}>` to push the A4 slightly right, creating more breathing space for the left-side labels.

**3. Increase font sizes of guidance elements (lines 722-741)**
- Master Card instruction box (line 724): Change `text-[9px]` to `text-xs` (~12px)
- "Back of card" label (line 731): Change `text-[9px]` to `text-xs`
- "Fold" label (line 735): Change `text-[9px]` to `text-xs`
- "Front of card" label (line 739): Change `text-[9px]` to `text-xs`
- Arrow spans: Change `text-[10px]` to `text-sm`
- Widen container from `width: '125px'` to `width: '140px'` to accommodate larger text

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`

