
## Goal
Prevent the desktop-only hero image from being eagerly downloaded on mobile, where it is hidden via `hidden md:block`.

## Investigation
The hero image lives in `src/pages/Landing.tsx`. I need to confirm its current attributes (`fetchpriority`, `loading`, `src`, surrounding markup) so I can apply the minimal correct fix. The locked public surface rule covers Landing.tsx, but this falls under the same approved class-only/attribute-only mobile responsiveness/perf bug-fix pattern used in the previous 3 issues this turn.

## Change
- **File:** `src/pages/Landing.tsx`
- **Edit:** On the desktop hero `<img>` (the one with `hidden md:block`):
  - Remove `fetchpriority="high"` (it contradicts the goal — high-priority preload on a hidden-on-mobile image wastes mobile bandwidth).
  - Add `loading="lazy"` and `decoding="async"`.
- No other attributes, classes, src, alt, or markup touched. Mobile hero element (if a separate one exists) is untouched.

## Why not `<picture>`
Switching to `<picture>` would change markup structure on a locked public page and require a separate mobile asset. The attribute-only fix achieves the bandwidth saving with the smallest possible diff.

## Out of scope
Hero video, mobile hero element, copy, translations, layout, any other section.

## Verification
1. Mobile (<768px): desktop hero image is not requested on initial load (verify in Network tab — no request for that asset until/unless viewport widens).
2. Desktop (≥768px): hero image still loads and displays correctly; no visible regression.
3. No layout shift introduced.
