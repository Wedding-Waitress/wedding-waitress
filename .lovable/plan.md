

## Plan: Increase Hero Image Height

### Change (in `src/pages/GuestLookup.tsx`)

Line 569: Increase the vertical padding on the hero section to give more room for landscape (4x6) photos.

Change:
```tsx
<div className="w-full px-4 pt-8 pb-8 md:pt-12 md:pb-12">
```
To:
```tsx
<div className="w-full px-4 pt-16 pb-16 md:pt-24 md:pb-24">
```

This roughly doubles the vertical padding, giving landscape photos much more visible area. The mobile view gets `pt-16 pb-16` (4rem each) and desktop gets `pt-24 pb-24` (6rem each), making the hero section tall enough to showcase a horizontal 4x6 photo properly.

