

# Fix Slow Media Loading on Homepage and Feature Pages

## Problem
All images and videos on the homepage load with a visible blank/grey delay before appearing. This affects:
1. **Hero section** — static image + video (desktop), slideshow images (mobile)
2. **Feature card images** — 13 cards with `loading="lazy"` 
3. **Alternating feature section images** — 13 sections with `loading="lazy"`
4. **CTA video** — bottom section video loaded from asset URL
5. **Feature pages** (Learn More destinations) — background images set via CSS `background-image` with no preloading

## Root Causes
- Hero video has a 4.5s artificial delay before playing, showing a static image first with no preload link
- All feature images use `loading="lazy"` even for above-the-fold content
- No `<link rel="preload">` for critical hero assets
- Feature page backgrounds use CSS `background-image` with no eager loading — browser discovers them late
- No `fetchpriority="high"` on any critical images
- Video `preload="auto"` is set but no preload hint in `<head>`

## Plan

### 1. Add preload hints in `index.html`
Add `<link rel="preload">` for the hero image (`hero-wedding.jpg`) so the browser fetches it before React even renders.

### 2. Optimise hero section in `Landing.tsx`
- Add `fetchPriority="high"` and `decoding="async"` to the hero static image
- Add `fetchPriority="high"` to the first mobile slideshow image
- Remove the artificial 4.5s delay for showing the video — instead, show video immediately when `canplaythrough` fires (video is already preloaded with `preload="auto"`)
- Add poster frame to the hero video element so there's no blank frame

### 3. Fix feature card and alternating section images in `Landing.tsx`
- Change first 3 feature card images from `loading="lazy"` to `loading="eager"` (they're above the fold on desktop)
- Keep remaining images as `loading="lazy"` (correct for below-fold)
- Add `decoding="async"` to all feature images for smoother rendering

### 4. Fix CTA video section in `Landing.tsx`
- Already has `poster={ctaImg}` — this is correct
- Add `preload="metadata"` instead of default to reduce initial bandwidth while still showing poster

### 5. Fix Feature Page Layout (`FeaturePageLayout.tsx`)
- Replace CSS `background-image` with a real `<img>` tag using `loading="eager"` and `fetchPriority="high"` — this lets the browser discover and fetch it immediately
- Add a solid background color fallback so there's no white flash

### 6. Test all changes
- Test desktop hero: image appears instantly, video transitions smoothly
- Test mobile hero: first slideshow image appears instantly
- Test feature cards: visible cards load without delay
- Test each "Learn More" feature page: background image loads instantly
- Test CTA section: poster image shows immediately while video loads

## Files Modified
- `index.html` — add preload link
- `src/pages/Landing.tsx` — hero timing, fetchPriority, loading attributes
- `src/components/Layout/FeaturePageLayout.tsx` — replace CSS background with eager `<img>`

## What Will NOT Change
- No layout, design, spacing, text, or color changes
- No changes to mobile menu or navigation
- No changes to any other pages

