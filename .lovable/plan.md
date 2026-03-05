

## Plan: Replace Canva square logo + button with single clickable Canva banner image

### Summary
Replace the current side-by-side layout (square logo + "Edit with Canva" button) with a single clickable image of the new Canva banner logo. Clicking the image opens Canva in a new tab.

### File Changes

#### 1. Copy uploaded Canva banner logo
- Copy `user-uploads://edit_with_canva_high_quality_1.png` to `src/assets/canva-edit-banner.png`

#### 2. `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`
- **Import** `canvaEditBanner` from `@/assets/canva-edit-banner.png`
- **Replace lines 429-440** (the flex container with square logo + button) with a single clickable image:
  ```tsx
  <img
    src={canvaEditBanner}
    alt="Edit with Canva"
    className="mt-2 h-12 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
    onClick={() => window.open('https://www.canva.com', '_blank')}
  />
  ```
- Remove `canvaSquareLogo` import if no longer used elsewhere (keep `canvaLogo` if still referenced).

#### 3. `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`
- **Import** `canvaEditBanner` from `@/assets/canva-edit-banner.png`
- **Replace lines 707-718** with the same single clickable image as above.
- Remove `canvaSquareLogo` import if no longer used.

### Result
Both pages will show the new Canva banner image (clickable, opens Canva) in place of the old square logo + button combo. No other changes.

