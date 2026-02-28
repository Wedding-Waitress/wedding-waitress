

# Image Gallery Modal UI Tweaks

## 4 Changes

### 1. Title: Show count with "Cards" label
Change `Image Gallery (162)` to `Image Gallery (162 Cards)` so users understand what the number represents.

**File:** `PlaceCardGalleryModal.tsx`, line 50

### 2. Category tabs: Increase height/padding
The `TabsList` grey background is too narrow, clipping the purple active indicator. Add more vertical padding (`py-2`) to the `TabsList` so the purple pill has room.

**File:** `PlaceCardGalleryModal.tsx`, line 95

### 3. Show full 3 rows of cards
The third row is cut off at the bottom. Two changes needed:
- Increase the modal's max height from `max-h-[90vh]` to `max-h-[95vh]` to give more vertical space
- Increase ScrollArea height from `h-[420px]` to `h-[480px]` so 3 full rows of cards are visible without overlapping the Cancel button

**File:** `PlaceCardGalleryModal.tsx`, lines 45 and 120

### Technical Summary

| Line | Current | New |
|------|---------|-----|
| 50 | `Image Gallery ({images.length})` | `Image Gallery ({images.length} Cards)` |
| 95 | `TabsList className="w-full justify-start overflow-x-auto flex-shrink-0"` | Add `py-2` |
| 45 | `max-h-[90vh]` | `max-h-[95vh]` |
| 120 | `h-[420px]` | `h-[480px]` |

