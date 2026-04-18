
## Goal
Three pieces, scoped tightly:
1. **Free trial countdown** in Subscription card → "Free (X days left)" or "Free (Expired)".
2. **Welcome email** to new user on signup.
3. **Admin notifications** to support@weddingwaitress.com on signup + payment.
All failsafe — email errors must never block signup or payment.

## Findings
- `useUserPlan` already fetches `user_subscriptions.created_at`-derived data + `expires_at` + `status`. Good base.
- `SubscriptionCard.tsx` already renders status badges (Active/Trial/Expired/Cancelled) and pulls `startDate` from `user_subscriptions.created_at`.
- No transactional email infra exists yet — must scaffold Lovable's transactional email system (`scaffold_transactional_email`) which depends on `setup_email_infra` + a verified sender domain.
- `weddingwaitress.com` is the published custom domain → need to check if email domain is configured. If not, show the email setup dialog first.
- Signup: `EmbeddedSignUpForm.tsx` uses `supabase.auth.signUp` + OTP. Best trigger point for welcome + admin-signup emails = right after successful OTP verification (when `data.session` exists), client-side invocation of `send-transactional-email`. This avoids needing auth webhooks.
- Payment: `verify-payment` edge function runs after Stripe checkout → ideal place to invoke admin payment notification (server-side, one-shot, idempotent via session_id).

## Plan

### Part 1 — Trial countdown (scoped to Subscription card only)
File: `src/components/Account/SubscriptionCard.tsx`
- Compute `daysLeft = max(0, ceil((expires_at - now) / 1day))` for Free/Starter plan.
- If plan is Free/Starter and not expired → label = `"Free (${daysLeft} days left)"` (singular "1 day left"), green Active badge.
- If expired → label = `"Free (Expired)"`, red Expired badge.
- Auto-refresh: small `useEffect` with `setInterval(60_000)` to recompute `daysLeft` (cheap, no fetch needed; date math only).
- Source of truth for trial expiry: `plan.expires_at` from `useUserPlan` (already wired). If null for legacy free users, fall back to `user.created_at + 7 days`.

### Part 2 — Email infrastructure setup
Sequence (no shortcuts):
1. Check email domain status. If no domain configured → show `<lov-open-email-setup>` dialog and stop. (Required before any send works.)
2. If domain exists (any status) → call `setup_email_infra` (idempotent), then `scaffold_transactional_email`.
3. Create three React Email templates in `supabase/functions/_shared/transactional-email-templates/`:
   - `welcome.tsx` — user welcome (uses `firstName`)
   - `admin-new-signup.tsx` — to admin (uses `fullName`, `email`, `date`)
   - `admin-new-payment.tsx` — to admin (uses `name`, `email`, `amount`, `plan`, `date`)
4. Register all three in `registry.ts`.
5. Style templates with Wedding Waitress brand: white body, `#967A59` brown buttons, Inter font.
6. Deploy `send-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`.

### Part 3 — Wire triggers

**Welcome + admin-signup email** (client-side, after successful OTP verification):
File: `src/components/auth/EmbeddedSignUpForm.tsx`
- After `supabase.auth.verifyOtp` success and profile creation, fire-and-forget two invocations wrapped in try/catch (errors → `console.error` only, never thrown):
  ```ts
  supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'welcome',
      recipientEmail: email,
      idempotencyKey: `welcome-${user.id}`,
      templateData: { firstName },
    },
  }).catch(e => console.error('welcome email failed', e));

  supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'admin-new-signup',
      recipientEmail: 'support@weddingwaitress.com',
      idempotencyKey: `admin-signup-${user.id}`,
      templateData: { fullName: `${firstName} ${lastName}`, email, date: new Date().toISOString() },
    },
  }).catch(e => console.error('admin signup email failed', e));
  ```
- No await blocking. Signup flow continues regardless.

**Admin-payment email** (server-side, in `verify-payment`):
File: `supabase/functions/verify-payment/index.ts`
- After successful Stripe session verification + `user_subscriptions` update, invoke `send-transactional-email` for admin only (user receipt comes from Stripe per the brief).
- Idempotency key: `admin-payment-${session_id}` so retries don't duplicate.
- Wrap in try/catch — payment success response must not fail if email fails.

### Part 4 — Lock
- Stamp `🔒 PRODUCTION-LOCKED` on `SubscriptionCard.tsx`, `EmbeddedSignUpForm.tsx`, `verify-payment/index.ts`, and the three new templates.
- Append entries under Account/Auth section in `LOCKED_TRANSLATION_KEYS.md`.

## Files modified
- `src/components/Account/SubscriptionCard.tsx` — trial countdown label + auto-refresh.
- `src/components/auth/EmbeddedSignUpForm.tsx` — fire-and-forget welcome + admin-signup email after OTP success.
- `supabase/functions/verify-payment/index.ts` — fire-and-forget admin payment email after sub update.
- `LOCKED_TRANSLATION_KEYS.md`

## Files created
- `supabase/functions/_shared/transactional-email-templates/welcome.tsx`
- `supabase/functions/_shared/transactional-email-templates/admin-new-signup.tsx`
- `supabase/functions/_shared/transactional-email-templates/admin-new-payment.tsx`
- `supabase/functions/_shared/transactional-email-templates/registry.ts` (updated by scaffold + extended)
- `supabase/functions/send-transactional-email/` (scaffolded)
- `supabase/functions/handle-email-unsubscribe/` (scaffolded)
- `supabase/functions/handle-email-suppression/` (scaffolded)

## Out of scope
- Stripe receipt/invoice emails (user toggles those in Stripe Dashboard per brief).
- Daily cron for trial expiry — countdown is computed live, no cron needed.
- Auth email customization (separate system).
- Any other page, sidebar, or pricing change.

## Prerequisite check (first action in implementation)
Confirm sender domain is configured for `weddingwaitress.com`. If not, surface the email setup dialog before scaffolding — implementation pauses until domain is set.

## Verification
1. Free user → Subscription card shows "Free (7 days left)" → green Active.
2. Wait past expiry → shows "Free (Expired)" → red Expired badge.
3. New signup → welcome email arrives in user inbox + admin-signup email at support@weddingwaitress.com.
4. Test payment → admin-payment email at support@weddingwaitress.com.
5. Disconnect email infra mid-test → signup + payment still complete; only console errors.
6. Mobile 375px → Subscription card label wraps cleanly.
