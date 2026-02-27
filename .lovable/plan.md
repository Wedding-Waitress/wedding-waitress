

# Fix Font Size Sync Between Admin and User Invitation Previews

## Problem

The admin text zone editor renders font sizes at `font_size * 0.5` (half scale), while the user-facing `InvitationPreview` renders them at full pixel size (`font_size` px). This means a font set to 94px in the admin panel looks correct there, but appears roughly double the intended visual size in the user customizer.

Additionally, since the user preview container varies in width depending on screen size (constrained to `max-w-md`), absolute pixel font sizes produce inconsistent results across devices.

## Solution

Make `InvitationPreview.tsx` scale font sizes (and letter spacing) proportionally to the container's rendered width, using a `ResizeObserver`. This ensures text appears at the same relative size regardless of container dimensions.

### Reference Width

Define a reference width of **600px** (approximately the width at which the admin editor renders its preview content before the CSS `transform` zoom is applied). At this width, fonts render at the `* 0.5` scale the admin uses, so:

- Scale factor = `containerWidth / 600`
- Effective font size = `zone.font_size * scale`
- Effective letter spacing = `zone.letter_spacing * scale`

This produces visually identical output in both the admin and user views.

### File Changes

**`src/components/Dashboard/Invitations/InvitationPreview.tsx`**

1. Add a `useState` for `containerWidth` (default 600)
2. Add a `useEffect` with `ResizeObserver` on `containerRef` to track the container's actual width
3. Compute `scale = containerWidth / 600` 
4. In `getZoneStyle()`, multiply `font_size` and `letter_spacing` by `scale` before converting to px
5. This affects both the live preview AND exports (since the exporter renders `InvitationPreview` at a known size, the scaling will adapt automatically)

### Why This Works

- Admin sets 94px at 0.5x scale in their preview -- it looks like ~47px visually
- User preview at 400px wide: scale = 400/600 = 0.67, so 94px renders as ~63px in a smaller container -- visually proportional
- Exporter renders at a large fixed size, so fonts scale up correctly for high-res output
- No changes needed to stored data or admin editor

### Files Modified

1. `src/components/Dashboard/Invitations/InvitationPreview.tsx` -- add ResizeObserver-based font scaling
