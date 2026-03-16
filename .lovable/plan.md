
## Change Maximum Zoom to 110%

**Current State**: The zoom slider in the Invitations & Cards page currently has a range of 25% to 200%.

**Required Change**: Update the maximum zoom value from 200% to 110% while keeping the minimum at 25%.

**File**: `src/components/Dashboard/Invitations/InvitationCardPreview.tsx`

**Changes Required**:

1. **Line 42** - Update the `Math.min()` value in `handleZoomChange`:
   - Change from: `setZoom(Math.max(25, Math.min(200, value)));`
   - Change to: `setZoom(Math.max(25, Math.min(110, value)));`

2. **Line 287** - Update the zoom in button disabled condition:
   - Change from: `disabled={zoom >= 200}`
   - Change to: `disabled={zoom >= 110}`

3. **Line 296** - Update the Slider component's max prop:
   - Change from: `max={200}`
   - Change to: `max={110}`

**Result**: The zoom control will now cap at 110%, preventing users from zooming beyond that level. The plus button will disable at 110%, and the slider track will end at 110%.
