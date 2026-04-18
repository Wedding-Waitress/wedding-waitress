
## Goal
Thicker, darker brown borders on:
1. Sign-up form input fields (first name, last name, email, mobile) on the "Start Planning Free" homepage form.
2. The 6 OTP boxes on the email verification step of that same sign-up form.

## Findings
- Homepage "Start Planning Free" → renders `EmbeddedSignUpForm.tsx` (locked file, but visual border tweak is in scope of user's explicit request).
- Step 1 inputs use shared `<Input>` primitive → border is `border-input` (very light gray).
- Step 2 verification uses 6 `<Input>` elements (NOT `InputOTPSlot` — this is a different form than `SignInModal.tsx`, which is why the earlier OTP fix didn't apply here).

## Fix (scoped to `EmbeddedSignUpForm.tsx` only)
Override border on each input via `className`, matching the brand brown already used in `SignInModal.tsx`:
- Step 1 fields (4 inputs): add `border-2 border-[#967A59]/70 focus-visible:border-[#967A59]` to each `<Input>`.
- Step 2 OTP boxes (6 inputs): same classes appended to existing className.

No changes to shared `Input` primitive, no logic changes, no copy changes, nothing else.

## Files
- `src/components/auth/EmbeddedSignUpForm.tsx` — append border classes on 10 inputs total.

## Out of scope
Everything else.

## Verification
- Homepage → Start Planning Free → all 4 fields show thicker brown border.
- Submit email → OTP step → 6 boxes show thicker brown border matching sign-in modal.
- Mobile 375px renders cleanly.
