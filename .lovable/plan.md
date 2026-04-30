## Live View polish — brown branding + spacing

Scope: `src/pages/GuestLookup.tsx` (the `/s/:eventSlug` Live View page, RSVP Invite tab). Public surface only — no changes to layout, typography, button styles, or functionality. Applies to all devices.

### 1. Replace purple footer logo with brown logo

- Add the uploaded brown logo to `src/assets/wedding-waitress-brown-logo.png` (copied from `user-uploads://Wedding_Waitress._Brown._PNG-15.png`).
- In `GuestLookup.tsx`:
  - Replace the import on line 29 from `wedding-waitress-footer-logo.png` to the new brown asset (kept as `weddingWaitressFooterLogo` so JSX is unchanged).
- Same dimensions retained (`h-12 md:h-14 w-auto`) — no layout shift, sharp resolution (PNG is 1920px wide).

### 2. Search input border: green → brown

- Line 764 currently:
  ```
  className="pl-10 text-base md:text-lg h-11 md:h-12 border-green-500 border-2 focus-visible:ring-green-500"
  ```
- Change to use existing brand brown token (matches Ceremony / Reception Floor Plan buttons which use `border-primary` = `#967A59`):
  ```
  className="pl-10 text-base md:text-lg h-11 md:h-12 border-primary border-2 focus-visible:ring-primary"
  ```
- Keeps double border, thickness, rounded corners, height — only colour changes.

### 3. Increase spacing above the logo

- Line 830 currently: `<div className="flex justify-center mt-6">` (24px above logo).
- Change to `mt-12` (48px) — roughly doubles the breathing room between the "Share this invite" button and the logo. Centering and everything else unchanged.

### Out of scope (explicitly NOT changed)

- Tab pill styling on line 708 (still uses green active state) — user only asked about input + logo + spacing.
- Any other page, modal, or component.
- Header logo, button styles, typography, alignment.
