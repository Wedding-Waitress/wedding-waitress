

## Add Visual Guide Labels to Master Place Card

### Overview
Add instructional heading above the A4 preview and three labeled arrows (Back / Fold / Front) on the top-left master card only, visible in the editor but not in exports.

### Changes — `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`

**1. Instructional heading above top pagination (line ~676)**

Insert a centered text block just above the existing "Previous / Page X of Y / Next" controls:
```
"✏️ Customize this master card to sync with all other cards"
```
Styled with `bg-primary/10 text-primary text-sm font-medium rounded-lg px-4 py-2 text-center mb-3`.

**2. Three guide labels on the master card only (index === 0, non-export)**

Inside `renderPlaceCard`, when `isFirstCard && !isExporting`, render an absolutely-positioned overlay on the left edge of the card with three labels + arrows pointing right:

- **"Back of card" →** positioned at ~25% height (middle of top half / back section)
- **"Fold" →** positioned at ~50% height (the crease line at 49.5mm)  
- **"Front of card" →** positioned at ~75% height (middle of bottom half / front section)

Each label: small text + a right-pointing arrow (`→`), styled with `text-[10px] text-muted-foreground font-medium bg-white/80 rounded px-1.5 py-0.5 shadow-sm`. Positioned with `left: -28mm` so they sit outside the card content area but inside the grid cell (using negative positioning with overflow visible on the wrapper).

**3. Scope restrictions**
- Only render when `isFirstCard === true` and `isExporting === false`
- Does not affect print/export output
- Does not appear on cards 2-6

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` only

