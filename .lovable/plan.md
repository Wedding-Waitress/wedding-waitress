

## Fix Invitation Canvas Vertical Centering on Zoom Out

**Problem**: When zooming out, the canvas stays anchored at the top of its container instead of centering vertically.

**Root cause**: The outer flex container on line 164 has `items-center` but the scaled div shrinks visually while still occupying its full original height in the layout. CSS `transform: scale()` doesn't change the element's layout size, so the flex centering has no effect.

**Fix in `src/components/Dashboard/Invitations/InvitationCardPreview.tsx`:**

Give the canvas wrapper container a fixed height so the scaled content can center within it. The simplest approach: set `min-height` on the flex container and keep `items-center`, but the real fix is to ensure the outer container has a defined height for centering to work against.

**Change**: On line 164, add a fixed height to the flex container so vertical centering works:

```tsx
<div className="flex-1 flex justify-center items-center" style={{ minHeight: '70vh' }}>
```

This gives the container enough height for the scaled-down canvas to visually center within it as zoom decreases.

