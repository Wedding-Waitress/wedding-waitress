

# Add Light Purple Background to Modal Header

## What changes
A single CSS change to the `DialogHeader` element in `PublicAddGuestModal.tsx` to give the sticky header area (containing "Add Extra Guest" title and the subtitle text) a light purple background color.

## Technical Details

**File:** `src/components/GuestLookup/PublicAddGuestModal.tsx`

**Line 186** -- Change:
```tsx
<DialogHeader className="pt-4">
```
to:
```tsx
<DialogHeader className="pt-4 bg-purple-50 -mx-4 sm:-mx-10 px-4 sm:px-10 pb-3 rounded-t-lg">
```

This adds:
- `bg-purple-50` -- a light purple/lavender background
- Negative margins (`-mx-4 sm:-mx-10`) to extend the background edge-to-edge within the modal, countering the parent padding
- Matching horizontal padding (`px-4 sm:px-10`) to keep the text aligned
- `pb-3` for a bit of bottom spacing
- `rounded-t-lg` to match the modal's top corners

Nothing else in the modal changes -- just this one line.

