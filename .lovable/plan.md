

## Image Gallery Layout: Vertical to Horizontal Thumbnails

### What's Changing

The gallery grid will switch from tall portrait thumbnails to wide landscape thumbnails, and from 6 columns to 5 columns. Each image will show its full content (no cropping) by using `object-contain` instead of `object-cover`, with a subtle background fill behind any letterboxing.

### Visual Summary

- **Current**: 6 columns, tall portrait boxes (`aspect-[5/7]`), images cropped to fill
- **New**: 5 columns, wide landscape boxes (`aspect-[7/5]`), full image visible with no cropping

### Technical Details

**File:** `src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx`

1. **Grid columns** (line ~121): Change from `grid-cols-3 md:grid-cols-4 lg:grid-cols-6` to `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`

2. **Thumbnail aspect ratio** (line ~123): Change from `aspect-[5/7]` (portrait) to `aspect-[7/5]` (landscape)

3. **Image fitting** (line ~128): Change from `object-cover` (crops to fill) to `object-contain` (shows entire image). Add a subtle neutral background (`bg-gray-100`) to the container so any empty space around the image looks clean rather than blank white.

No other files or features are affected. The hover overlay (View/Select buttons), preview mode, and all other gallery functionality remain untouched.

