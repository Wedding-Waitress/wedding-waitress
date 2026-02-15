

# Fix: Intermittent "Expired Code" on Sign-In

## Root Cause

When the `send-auth-email` edge function cold-starts, it exceeds Supabase Auth's 5-second hook timeout. Supabase Auth then discards the OTP token, but the edge function still sends the email containing that now-invalid code. The user receives a code that was never saved, so it always fails with "Token has expired or is invalid."

## The Fix

### 1. Auto-retry on hook timeout (SignInModal.tsx)

Instead of proceeding to the verify step when a hook timeout occurs, **automatically retry the OTP request** after a short delay. The first request warms up the edge function, so the retry will succeed (responds in ~5ms when warm).

**Changes to `handleEmailSubmit` in `src/components/auth/SignInModal.tsx`:**

- When error contains "Failed to reach hook within maximum time":
  - Wait 2 seconds (let the function finish booting)
  - Silently retry `supabase.auth.signInWithOtp()` 
  - If retry succeeds: proceed to verify step with "Code sent!" toast
  - If retry also fails: show error asking user to try again
  - Do NOT proceed to verify step on the first timeout (the code in that email is invalid)

### 2. Improve error message for expired codes (SignInModal.tsx)

Update `mapSupabaseError` to handle the `otp_expired` error code with a friendlier message:

- Map "Token has expired or is invalid" to: "This code has expired. Please tap 'Resend code' to get a new one."

### 3. Keep the edge function warm (optional optimization)

No code changes needed for this -- the auto-retry approach solves the problem. The edge function already responds in 5ms when warm, and the retry acts as a self-warming mechanism.

## Files to Edit

| File | Change |
|------|--------|
| `src/components/auth/SignInModal.tsx` | Auto-retry on hook timeout instead of proceeding to verify; improve expired code error message |

## Technical Detail

```text
Current flow (broken):
  User submits email
    --> Hook times out (cold start)
    --> Frontend shows "Code may be on its way"
    --> Edge function sends email with dead OTP
    --> User enters code --> ALWAYS fails

Fixed flow:
  User submits email
    --> Hook times out (cold start, warms up function)
    --> Frontend waits 2 seconds
    --> Frontend retries OTP request (function now warm, ~5ms)
    --> Supabase Auth saves valid OTP
    --> Edge function sends email with valid OTP
    --> User enters code --> Works
```

## What stays the same
- Edge function code (no changes needed)
- Email template and delivery
- All other sign-in/sign-up flows
- Resend functionality

