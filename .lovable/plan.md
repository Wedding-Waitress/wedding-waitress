
## Goal
Add one new line of text under the existing hero subtitle on the homepage, above the CTA buttons. No other changes.

## Heads-up: locked surface
The hero lives in `Landing.tsx` (LOCKED PUBLIC SURFACE) and uses i18n keys from `src/i18n/locales/en/landing.json` (also locked). Your approval here authorizes this text-only addition.

## Investigation needed
I need to confirm the exact JSX structure of the hero (between subtitle and CTA buttons) and whether there's already an unused i18n key I can repurpose, or whether I must add a new key + render it.

## Changes (planned)

### 1. `src/i18n/locales/en/landing.json`
Add one new key under `heroMain`:
- `heroMain.tagline` → `"Create your QR code wedding seating chart in seconds."`

(Only English updated, matching prior pattern.)

### 2. `src/pages/Landing.tsx`
In the hero block, immediately after the existing subtitle `<p>` and before the CTA button group, insert:
```jsx
<p className="<same classes as subtitle, smaller/lighter or identical per existing theme> mt-3">
  {t('heroMain.tagline')}
</p>
```
- Reuses the existing subtitle's typography classes so font, color, alignment (centered) match exactly.
- Adds `mt-3` (or matching existing rhythm) for small spacing before the buttons; the buttons already have their own top margin which is preserved.

No other JSX, no new sections, no styling tokens, no other locale files touched.

## Out of scope
Existing H1, existing subtitle, CTAs, images, animations, other locales, SEO meta, layout.

## Verification after apply
1. New line appears centered directly below the subtitle on `/`.
2. Same font + color as subtitle.
3. Visible spacing between new line and CTA buttons.
4. No other visual diff.
