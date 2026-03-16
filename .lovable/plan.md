

## Change Maximum Zoom to 100%

**File**: `src/components/Dashboard/Invitations/InvitationCardPreview.tsx`

Three changes to cap zoom at 100% instead of 110%:

1. **`handleZoomChange`** — change `Math.min(110, value)` → `Math.min(100, value)`
2. **Zoom in button** — change `disabled={zoom >= 110}` → `disabled={zoom >= 100}`
3. **Slider max prop** — change `max={110}` → `max={100}`

