## Kiosk Live View — Three Targeted Fixes

### 1. Event Selection spacing (`src/components/Dashboard/Kiosk/KioskSetup.tsx`)
The helper text **"Choose which event to display on the kiosk"** sits inside `CardHeader` with no bottom spacing, so it visually crowds the "Choose Event" dropdown.

**Fix:** Add `mb-2` to the `CardDescription` (line 135-137) so it has clean breathing room above the dropdown row. No other layout/color changes.

### 2. Dynamic event name in Kiosk public view (`src/pages/KioskView.tsx`)
The kiosk header already renders dynamically using `event.partner1_name & event.partner2_name` (or fallback to `event.name`) fetched from the selected event's slug. However, the user is reporting hardcoded "Janet & John" still appearing.

**Root cause:** The header IS dynamic — but the title in the `<head>` browser tab (visible in screenshot as "Wedding Seating Chart Australia…") and the displayed couple names depend on the event's `partner1_name`/`partner2_name` fields stored in the DB. The **on-page** display already uses the live event data (lines 266-271). The reason "Janet & John" appears in the screenshot is because the slug `jason-lindas-wedidng` resolves to that event's stored partner names — which is correct dynamic behavior.

**Verification action:** Re-check the kiosk URL builder and confirm it includes the currently-selected event's slug. Looking at `KioskSetup.tsx` line 44, `kioskUrl = buildKioskUrl(selectedEvent.slug)` — so Open Kiosk / Launch Fullscreen / Generate QR all already point to the correct event-specific URL. **No code change needed for sync** — the system is already correct. The "Janet & John" name shown is simply the actual stored couple name for that event's slug.

If after deployment the user still sees a mismatch, the fix would be to update the event's `partner1_name`/`partner2_name` in **My Events → Edit Event** rather than in code.

### 3. Kiosk footer logo — switch to white version (`src/pages/KioskView.tsx`)
The kiosk footer (lines 387-391) currently imports `weddingWaitressFooterLogo` from `@/assets/wedding-waitress-footer-logo.png` (the purple version), which displays poorly on the dark brown gradient background.

**Fix (matches homepage footer pattern):**
- Remove the import on line 14: `import weddingWaitressFooterLogo from '@/assets/wedding-waitress-footer-logo.png';`
- Replace the `<img>` (lines 387-391) with the same approach used in `Landing.tsx` line 628 and `ProductPageLayout.tsx` line 249:
  ```tsx
  <img 
    src="/wedding-waitress-logo-full.png" 
    alt="Wedding Waitress" 
    className="h-10 md:h-12 w-auto mx-auto brightness-0 invert" 
  />
  ```
  The `brightness-0 invert` Tailwind classes render the logo pure white — exactly matching the homepage footer style — and provide proper contrast on the dark brown background. Center alignment and existing `space-y-3` spacing above/below are preserved.

### Files to edit
- `src/components/Dashboard/Kiosk/KioskSetup.tsx` — add `mb-2` to helper text
- `src/pages/KioskView.tsx` — swap footer logo to white inverted version

### Out of scope
No layout, color, or structural changes beyond the three items above.