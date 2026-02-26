

# Center Action Buttons, Add Icon Circles, and Match Font Size

## Changes (all in `src/components/GuestLookup/EnhancedGuestCard.tsx`)

### 1. Center the three buttons
Change the button container from `flex gap-2` to `flex gap-2 justify-center` so Accept, Decline, and Add Guest are horizontally centered within the card. Remove `flex-1` from each button so they size to their content rather than stretching edge-to-edge.

### 2. Add white circles around icons
- **Accept**: Replace `<CheckCircle2 className="w-4 h-4 mr-2" />` -- the `CheckCircle2` icon already renders as a circle with a checkmark, so this is fine as-is.
- **Decline**: Replace `<X className="w-4 h-4 mr-2" />` with `<XCircle className="w-4 h-4 mr-2" />` so the X has a circle around it (matching Accept's style). Import `XCircle` from lucide-react.
- **Add Guest**: Replace `<Plus className="w-4 h-4 mr-1" />` with `<PlusCircle className="w-4 h-4 mr-1" />` so the plus has a circle around it. Import `PlusCircle` from lucide-react.

### 3. Match button text size to tab buttons
The tab buttons ("Update Your Details", "Table View") use `text-sm` sizing. Update the three action buttons from `size="sm"` (which gives `h-9 rounded-md px-3`) to include explicit `text-sm` in the className for consistent font sizing. The current `size="sm"` already uses a similar size, but we will add `text-sm font-medium` explicitly to match the tab styling precisely.

### 4. Clean up imports
- Add `XCircle` and `PlusCircle` to lucide-react imports
- Remove `X` and `Plus` if no longer used elsewhere in the file (will check -- `X` is also used for the "Not Attending" icon in `getRsvpIcon`, so keep it; `Plus` can be replaced)

### Summary of visual result
- Three buttons centered in the card (not stretching to edges)
- Each button icon has a circle around it (CheckCircle2, XCircle, PlusCircle)
- Button text matches the font size of the tab navigation buttons above

