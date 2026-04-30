## Global small pill button system

### 1. Update `src/index.css`

- Modify the global mobile rule (lines ~868–882): remove `button` from the `min-height: 48px` selector list. Keep `a`, `[role="button"]`, `select`, `input`, `textarea`.
- Remove the one-off `.mobile-auth-pill` override (lines ~884–890).
- Add a new reusable `.ww-small-pill` utility:
  - `display: inline-flex; align-items: center; justify-content: center;`
  - `height: 24px; min-height: 0;`
  - `padding: 0 10px;`
  - `border-radius: 9999px;`
  - `border: 1px solid #967A59;`
  - `background: #FBF7F2;`
  - `color: #6B5638;`
  - `font: 500 12px/1 Inter, sans-serif;`
  - `white-space: nowrap;`
  - Optional `.ww-small-pill--active` variant: `background: #967A59; color: #fff;`

### 2. Remove `max-sm:min-h-[48px]` from shared button components

- `src/components/ui/button.tsx` line 8: remove `max-sm:min-h-[48px]` from base classes.
- `src/components/ui/enhanced-button.tsx` line 7: remove `max-sm:min-h-[48px]` from base classes.

This restores variant `size` heights (`h-7`, `h-9`, `h-10`, `h-11`) on mobile, allowing both small pills and large action buttons to render at their declared height. Default action buttons (`Save`, `Cancel`, `Create`, etc.) without explicit size keep `h-10` (40px), which is unchanged from desktop and is the locked-page baseline. Locked stable pages (Homepage, Dashboard shell, My Events, Tables) already render these buttons at `h-10` on desktop, so behavior remains identical there.

### 3. Apply `.ww-small-pill` to small tablet-style controls

- `src/components/Layout/Header.tsx` (mobile dropdown): replace the inline `pillStyle` and `mobile-auth-pill` className on the Sign In / Sign Up buttons with `className="ww-small-pill"`. Remove the `pillStyle` const.
- `src/components/Dashboard/GuestListTable.tsx` (line ~1945): replace the "Select Guest" / "✓ Selected" pill className with `ww-small-pill` (active variant when selected). Preserve the brown active state already used.

### 4. Do NOT touch

- Status badges (Attending, Pending, Not Attending, Couple, Family, SMS Sent, Email Sent, Both Sent, etc.) — colors and shapes preserved.
- Large action buttons (Save, Cancel, Create, Update, Continue, Start Planning, Accept All, etc.).
- "Event Created" badge in `EventsTable.tsx` (locked My Events page) — leave untouched.
- Desktop header, dashboard sidebar, modal footers, locked page layouts.

### 5. Verification

- Open `/` at 390px width, open the mobile menu, confirm Sign In / Sign Up render as ~24px slim pills matching the reference.
- Confirm desktop header at 1440px is unchanged.
- Open Guest List in mobile view, confirm "Select Guest" pill matches the same compact style.
- Confirm Save/Cancel/Create buttons in modals still render at 40–44px height.