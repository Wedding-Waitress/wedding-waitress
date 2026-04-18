
## Goal
Darken the OTP input box borders in the sign-in verification modal so they're clearly visible.

## Finding
The OTP slots use `border-input` (very light gray) in `src/components/ui/input-otp.tsx`. The modal at `src/components/auth/SignInModal.tsx` renders `<InputOTPSlot>` for the 6 boxes.

## Fix
Override the border on the OTP slots in `SignInModal.tsx` only — pass `className="border-[#967A59]/60"` (brand brown at 60% opacity, matching brand) to each `InputOTPSlot`. This keeps the change scoped to the sign-in modal and does not touch the shared `input-otp.tsx` primitive or any other surface.

## Files
- `src/components/auth/SignInModal.tsx` — add brown border class to the 6 `InputOTPSlot` elements.

## Out of scope
Everything else — modal layout, copy, button, spacing, other auth surfaces.

## Verification
- Visual check: borders are clearly visible brown on the 6 boxes.
- No other modal/page changes.
