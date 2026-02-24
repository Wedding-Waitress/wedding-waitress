

# Match DJ-MC Public View Buttons to Running Sheet Size

## What's changing
The "View Only" and "Download PDF" buttons on the DJ-MC questionnaire public view are too small compared to the Running Sheet public view. They need to use the same sizing and styling.

## File to modify
**`src/pages/DJMCPublicView.tsx`** (lines 307-314)

### Current (too small)
- `h-7 px-2.5 text-xs` with `w-3 h-3` icon

### Target (matching Running Sheet)
- `px-4 py-2 text-sm` with `h-4 w-4` icon

Specifically:
1. **View Only span** (line 307): Change from `h-7 px-2.5 text-xs` to `px-4 py-2 text-sm` and change `text-red-600` to `text-red-500` to match Running Sheet exactly
2. **Download PDF button** (lines 310-314): Change from `h-7 px-2.5 text-xs` to `px-4 py-2 text-sm`, and change the Download icon from `w-3 h-3` to `h-4 w-4 mr-2`

