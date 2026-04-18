
## Goal
On `/contact` header:
1. Swap purple logo → brown wordmark logo (`/wedding-waitress-logo-full.png`), match homepage size.
2. Remove the "Wedding Waitress" text span next to the logo.
3. Keep top-right "Back to Home" button untouched.
4. Re-lock.

## Plan
Edit `src/pages/Contact.tsx` header block (lines 92-99):
- `src` → `/wedding-waitress-logo-full.png`
- `className` → `h-12 lg:h-14 w-auto` (matches homepage)
- Delete `<span className="font-semibold text-lg">Wedding Waitress</span>`
- Keep `<Link to="/">` wrapper (logo still navigates home).

Update lock comment header with 2026-04-18 logo swap note. Append entry to `LOCKED_TRANSLATION_KEYS.md`.

## Files
- `src/pages/Contact.tsx`
- `LOCKED_TRANSLATION_KEYS.md`

## Out of scope
Form, body, footer, "Back to Home" button, every other page.

## Verification
1. `/contact` top-left: brown wordmark logo only, no "Wedding Waitress" text beside it.
2. Logo size matches homepage.
3. Click logo → navigates to `/`.
4. Top-right "Back to Home" button still present and working.
5. Mobile renders cleanly.
