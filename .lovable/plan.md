

# Reduce Name Background Padding and Add Gold/Silver/White Font Presets

## What's Changing

Two small adjustments to the Place Cards feature:

1. **Smaller white background pill behind names** -- reduce the vertical padding so the white tablet behind guest names is less tall/chunky
2. **Add White, Gold, and Silver to the font color picker's standard colors** -- so you can easily pick these colors when using dark background images without needing to manually type hex codes

## Technical Details

### 1. Reduce name background padding (`PlaceCardPreview.tsx`, line 262)

Change the padding on the white pill behind names from `0.5mm 3mm` to `0.2mm 3mm` (reduce vertical padding by more than half while keeping horizontal padding the same). This makes the white background tablet tighter around the name text.

### 2. Add White, Gold, and Silver preset colors (`color-picker-popover.tsx`)

Add a new "Wedding Colors" row at the top of the Standard Colors grid containing:
- **White**: `#FFFFFF`
- **Gold**: `#D4AF37` (classic gold)
- **Light Gold**: `#FFD700`
- **Silver**: `#C0C0C0`
- **Champagne**: `#F7E7CE`

This gives quick one-click access to these popular wedding font colors, especially useful on dark backgrounds.

**Files modified:**
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` -- reduce vertical padding
- `src/components/ui/color-picker-popover.tsx` -- add wedding color presets row

Nothing else changes.

