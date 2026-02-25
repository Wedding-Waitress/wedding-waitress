

# Increase Hero Header Height and Add Photo Tip

## Changes

### 1. Increase hero header height in Guest Live View
The hero section currently has minimal padding (`pt-3 pb-3`), making the background image appear cropped. Increase the vertical padding so more of the uploaded photo is visible.

**File:** `src/pages/GuestLookup.tsx` (line 557)
- Change `pt-3 pb-3 md:pt-4 md:pb-4` to `pt-8 pb-8 md:pt-12 md:pb-12` -- this roughly doubles the header height, showing significantly more of the background photo while keeping text centered.

### 2. Add "For best results" tip in the dashboard module card
A horizontal photo is 6x4 (6 inches wide, 4 inches tall -- landscape orientation). Add a visible tip next to the "Add Your Photo or Logo" title.

**File:** `src/components/Dashboard/QRCode/QRCodeMainCard.tsx` (lines 1448-1452)
- After the subtitle text, add a prominent tip in purple/bold text: **"For best results, use a horizontal (6x4) photo."**
- Use a larger, more visible style (e.g., `text-sm font-semibold text-purple-600`) so it stands out to the user.

### Files Modified
1. `src/pages/GuestLookup.tsx` -- increase hero section padding
2. `src/components/Dashboard/QRCode/QRCodeMainCard.tsx` -- add photo orientation tip

