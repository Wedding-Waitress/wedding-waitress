

## Equalize Preset Zone Button Container Gaps

**Problem**: The preset zone button container stretches to full width, so the wrapped buttons leave a large uneven gap on the right side compared to the left.

**Fix in `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`:**

Line 282 — Change the flex-wrap container to constrain its width so buttons fit snugly:

```tsx
// Before
<div className="flex flex-wrap gap-2">

// After
<div className="flex flex-wrap gap-2 max-w-fit">
```

Adding `max-w-fit` ensures the container shrinks to fit its content width, making the visual gap on the right match the left padding naturally.

