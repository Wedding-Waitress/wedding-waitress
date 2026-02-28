

# Fix Category Tabs Bar Height

## Problem
The grey background behind the category tabs is still too narrow despite adding `py-4`. The base `TabsList` component has a fixed `h-10` height that constrains it. The up/down scroll arrows on the right are unnecessary.

## Fix
One change in `PlaceCardGalleryModal.tsx`, line 95:

- Add `h-auto` to the `TabsList` className to override the default `h-10` height, allowing `py-4` to take effect and double the visible grey background
- Add `flex-wrap` so all categories wrap naturally instead of needing scroll arrows
- Remove `overflow-x-auto` since wrapping eliminates the need for horizontal scrolling

**Current (line 95):**
```
<TabsList className="w-full justify-start overflow-x-auto flex-shrink-0 py-4">
```

**New:**
```
<TabsList className="w-full justify-start flex-wrap flex-shrink-0 h-auto py-4">
```

This makes the grey bar tall enough to fully contain the purple active pills, and categories wrap to multiple lines if needed -- no scroll arrows required.

