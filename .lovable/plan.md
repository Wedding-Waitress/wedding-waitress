

## Plan: Replace Canva logo and restructure Edit with Canva layout

### Summary
Copy the uploaded square Canva logo into the project assets. In both Invitations and Place Cards pages, replace the current full-width button with a new layout: a large square Canva logo on the left, and a smaller "Edit with Canva" purple button on the right.

### File Changes

#### 1. Copy uploaded Canva logo
- Copy `user-uploads://Screenshot_2026-03-05_193717-removebg-preview.png` to `src/assets/canva-square-logo.png`

#### 2. `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`
- **Import** `canvaSquareLogo` from `@/assets/canva-square-logo.png` (replace old canvaLogo import if only used here, or add alongside).
- **Replace lines 428-437** (the full-width Button) with a flex row container:
  - Left: `<img src={canvaSquareLogo} className="h-14 w-14 rounded-lg object-contain" />` (large square logo)
  - Right: A smaller button (no `w-full`, just auto-width) with `size="sm" variant="gradient"` text "Edit with Canva" only (no logo inside the button)

#### 3. `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`
- **Import** `canvaSquareLogo` from `@/assets/canva-square-logo.png`.
- **Replace lines 705-714** with the same flex row layout as above.

### Layout Result
```text
[Square Canva Logo]  [Edit with Canva button]
 (large, ~56px)       (small purple gradient)
```

No other changes to any other files or sections.

