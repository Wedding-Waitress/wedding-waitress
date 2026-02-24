

# Enlarge Kiosk Buttons and Restyle Copy Button

## What's changing

The three action buttons ("Open Kiosk", "Launch Fullscreen", "Generate QR") and the "Copy" button on the Kiosk Live View page will be made significantly larger -- approximately double in height, font size, and icon size. The Copy button will also be restyled from its current outline `Button` component into a tablet-shaped (rounded-full) button matching the other three.

## Technical Details

**File:** `src/components/Dashboard/Kiosk/KioskSetup.tsx`

### Copy button (lines 195-203)
- Change from `<Button variant="outline" size="sm">` to a plain `<button>` with tablet styling
- Apply: `h-14 px-5 text-base font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50`
- Icon size: `w-5 h-5` (up from `w-4 h-4`)

### Three action buttons (lines 208-233)
- **Height**: `h-7` changes to `h-14` (double)
- **Padding**: `px-2.5` changes to `px-5`
- **Font size**: `text-xs` changes to `text-base` (double)
- **Icon sizes**: `w-3 h-3` changes to `w-6 h-6` (double)
- All other styling (colors, borders, rounded-full) stays the same

### Summary of size changes

| Property | Current | New |
|----------|---------|-----|
| Button height | h-7 (28px) | h-14 (56px) |
| Font size | text-xs (12px) | text-base (16px) |
| Icon size | w-3 h-3 | w-6 h-6 |
| Padding | px-2.5 | px-5 |

## Files Modified
- `src/components/Dashboard/Kiosk/KioskSetup.tsx`
