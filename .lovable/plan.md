

# Fix Category Tabs Height in Image Gallery

## Problem
The grey background behind the category tabs (All, Black, Blue, Brown, etc.) is too narrow -- the purple active pill is clipped at top and bottom.

## Fix
Two changes in `PlaceCardGalleryModal.tsx`:

1. **Double the TabsList padding** -- Change `py-2` to `py-4` on line 95 to give the category bar more vertical breathing room
2. **Increase ScrollArea height** -- Bump from `h-[480px]` to `h-[500px]` to compensate for the taller tabs bar and keep 3 full rows visible

| Line | Current | New |
|------|---------|-----|
| 95 | `py-2` | `py-4` |
| ~120 | `h-[480px]` | `h-[500px]` |

