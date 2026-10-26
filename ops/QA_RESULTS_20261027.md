# Independent QA verification — 27 October 2026, Melbourne

Production deployment remains on hold for the owner's final approval. This record does not certify the complete customer journey. No production writes, price changes, live charges, merge or production deployment were performed.

## Verified candidate and isolation

- Candidate tested: `76821208a19fa9ce4a7b3d893f98f30e2a7ecaa3`, draft PR #3, `fix/stripe-live-catalogue-expo-2026`.
- GitHub Actions run `40306187570`: completed successfully. This closes the prior record's pending latest-candidate CI gate.
- Netlify deploy `6adf289c91bf314e4134be60`: ready, deploy-preview context, matching candidate, `published_at: null`.
- Opened the customer preview. Its rendered `ww-backend-origin` metadata is exactly `https://ckmgjbwifbzzknnyxzqe.supabase.co`. Registration dialog renders with seven-day/20-guest wording. No signup form was submitted and no real email was sent.
- Supabase's branch listing confirms QA `ckmgjbwifbzzknnyxzqe` is ACTIVE_HEALTHY / FUNCTIONS_DEPLOYED. `get_project` cannot retrieve this branch, but branch listing and SQL access both work.

## QA environment repairs applied

1. Historical plan inserts generated different UUIDs and retained obsolete limits. Compared only the public production catalogue, then aligned the verified empty QA catalogue to those existing IDs, 100/200/400 paid guest limits, five-user allowance and inactive Vendor Pro. Prices were not changed. Guarded reproducible SQL: `qa-align-catalogue-20261027.sql`. This is QA setup, not a production migration.
2. Customer-role INSERT into `events` initially failed with a table privilege error. Core QA tables lacked CRUD grants that production already has. Confirmed RLS enabled, then restored the narrower customer workflow grants in `qa-core-table-permissions-20261027.sql`. Anonymous writes and customer subscription updates were not granted. Verified customer event INSERT allowed, customer subscription UPDATE denied.

## Passed database integration checks

Executed `qa-trial-verification-20261027.sql` on QA as a rollback-only transaction using synthetic `example.invalid` records. Actual authenticated database roles and existing policies/triggers were exercised, rather than only calling private functions as an administrator.

- Auth insert initializes the canonical free Starter subscription for exactly 604800 seconds.
- User-editable promo/intended-plan metadata does not grant a paid package or an administrative role.
- Fresh trial and customer entitlement RPCs report active.
- Eight-day-old trial reports expired. Updating sign-in timestamp and email case does not restart it.
- Attempted extension of authoritative trial history is rejected.
- Authenticated customer can persist profile, onboarding draft/update, first event and 20 guests.
- Guest 21 is rejected by the database capacity constraint.
- Customer cannot update their subscription to give themselves a paid plan.
- Another active customer cannot read the first customer's events, guests or draft, and cannot update their event.
- Expired customer can obtain its own expiry decision but cannot create a planning event.
- Separate rollback-only boundary test confirmed expiry at exactly seven days and rejection of anonymous trial/entitlement RPCs.

Executed `qa-guest-privacy-verification-20261027.sql` as a rollback-only transaction with synthetic addresses and invitation tokens:

- Public QR lookup retains all three synthetic seating entries but returns no postal fields or address-received flags.
- Invalid and expired invitation tokens return zero guest rows.
- Valid invitation returns only recipient and own household; unrelated guest is excluded.

After rollback, QA contained zero Auth users, events, guests and trial-history rows. All six inherited cron jobs remain disabled. QA's temporary disabled launch-control owner remains unbound because no permanent QA user was created; restore its NOT NULL constraint only after a controlled permanent QA user exists.

## Automated checks

Fresh focused run: **18 test files / 131 tests passed**. Covered public auth modals and access gates, onboarding validation/completion, entitlement hook, guided setup, guest capacity and public lookup privacy. Ran with the CI synthetic Supabase/public-base environment and America/New_York timezone. Latest-candidate CI already passed; the prior 2638-test full regression remains recorded separately.

## Security review — partial, not a clean gate

- Every public base table currently has RLS enabled (`rls_missing = 0`).
- QA permission checks for 11 administrative/payment fulfillment functions confirm anonymous and authenticated customers cannot execute them, and service_role can.
- Advisors continue to report 23 informational RLS/no-policy findings and broad SECURITY DEFINER warnings. Full function-by-function review is not complete.
- Fresh production-dependency audit: zero critical, two high and two moderate findings. Advisory references: PDF.js GHSA-hq66-cqwq-w95j, Zod GHSA-mrhx-c7xc-m3w5, React Router GHSA-wrjc-x8rr-h8h6 and GHSA-337j-9hxr-rhxg.
- Zod source imports reviewed are client-side scalar/object schemas; no application z.array/z.map/z.set schema found. This narrows the collection-exhaustion attack surface but does not clear the dependency advisory.
- PDF.js is used to rasterize uploaded venue PDFs via getDocument/getPage/canvas. Dependency remains flagged; script execution reachability and mitigation need further verification. No PDF/layout dependency upgrade was made, preserving protected print baselines.

## Unfinished gates and access limits

- Actual signup email delivery, valid OTP verification, session creation/returning browser login and complete browser onboarding are **not tested**. SQL Auth fixtures are not substitutes. No controlled reachable QA mailbox was available; the available browser sign-in flow requires private credential entry. Do not ask for codes in chat or silently mark these passed.
- Stripe test API/publishable keys and paired signing secret remain unconfigured. No valid signed webhook delivery, sandbox purchase, promo/expired/invalid promo checkout, GST payment settlement, decline/cancel/retry or automatic paid activation proof.
- Additional schema/grant parity outside core workflow, complete security review, dependency remediation and production backup/restore readiness remain unverified.
- Do not delete QA while these gates are open. No claim that all independent testing or launch verification is complete.

The owner explicitly authorized continuing routine QA fixes/tests without repeated confirmation. This does not waive missing authentication or the production deployment hold.

## Follow-up checks during the same session

- Additional rollback-only authenticated-role integration test passed: after authoritative trial history is moved to eight days earlier, existing event/guest edits and new guest inserts are blocked even while the subscription row still has a future expiry. Administrative inspection confirmed existing event/guest content remained unchanged. This verifies the authoritative server-side guard over stale subscription state, not merely a frontend lock.
- Netlify still returns the previous production deploy `6adb64d23b0756bd010f4db8` as ready, with its exact immutable deploy URL and publication timestamp. This establishes an available application rollback target, not that rollback has been rehearsed or that database recovery is proven.
- Attempted read-only inspection of the Supabase production Backups dashboard. It redirected to a sign-in form, so backup retention, latest successful backup and restore readiness cannot be verified through the available session. No sign-in request was sent to the driving owner and no restore operation was attempted.
- React Router is used as a client-side BrowserRouter; no SSR hydration entry was found in the application entry points. Authenticated return destinations are restricted to dashboard/account/admin paths. This narrows advisory reachability, but the package audit remains open.
- PDF rasterization is shared with print/PDF visual comparison as well as venue floor-plan upload. Do not make a dependency change without protected print baseline rendering/verification. No PDF changes were made.

## Guest-token security repair — continued non-Stripe work

Stripe work remains parked at the owner's explicit request.

- Reproduced `generate_guest_access_token` failing in QA because its public-only search path cannot resolve `extensions.gen_random_bytes`. A read-only production definition/schema check found the same function body and extension location. No production invocation or write was performed.
- A synthetic legacy/malformed token row paired one event with another event's guest. `get_guest_by_token` returned that unrelated synthetic guest before the fix. This establishes a missing event/recipient consistency guard, not proof of an exploit through the currently broken generator. Read-only production aggregate found zero currently mismatched token/event pairs; this does not establish historical absence of abuse.
- Applied candidate migration `20261026214721_guard_guest_token_event_scope.sql` to QA only using execute_sql. It qualifies the crypto function, verifies both current planning ownership and guest/event membership, emits URL-safe 43-character tokens, denies anonymous generation and uses empty search paths. Token reads and updates now require the guest to belong to the token's event. Existing public recipient read/update behavior is preserved for valid tokens.
- Rollback-only `qa-guest-token-scope-verification-20261027.sql` passed: own token generation and RSVP update; cross-event/other-owner generation rejection; malformed/invalid/expired/disabled-event token read/update rejection; anonymous generation rejection. Generated values never appeared in tool output. Fixtures were rolled back.
- Reran the prior trial integration and postal-privacy integration scripts after this change; both passed.
- Four relevant Vitest files / 27 tests passed (public lookup privacy, event-access migration, song prefill migration and authentication navigation). Fresh advisor counts: 23 INFO RLS/no-policy, 131 anon SECURITY DEFINER warnings and 181 authenticated SECURITY DEFINER warnings. This remains a partial security review, not a blanket all-clear.
- Source fix is queued for the existing draft release candidate. It has not been applied to production. A fresh candidate CI/preview must be checked after saving this commit.

## Continued verification after token fix commit

- Fix saved at source commit `ed4571c56c31e65376809bb39b05a7f847462767`. Netlify deploy `6adfcb0f2b21feeef304fe96` is ready in deploy-preview context at that exact commit; `published_at` is null. GitHub run `40407654308` was still running its full regression step at the latest check; no full-success claim yet.
- `qa-trial-event-limit-verification-20261027.sql` passed on QA as an authenticated-role rollback-only test: one trial event allowed, second event rejected with `WW_EVENT_LIMIT_REACHED`, reassignment of its owner rejected, and user-editable `role: admin`, `is_owner: true`, `plan: unlimited` metadata grants neither administrator nor platform-owner status.
- Browser check: direct navigation to preview `/dashboard` while unsigned redirected to the homepage and opened the Welcome back email-code sign-in modal. No dashboard or customer data rendered. No credential entry or email submission was attempted.
- QA has no public views; neither anonymous nor authenticated roles have CREATE privilege on public schema; anon has no USAGE on private schema. These are focused checks, not full function audit completion.
- The installed Supabase CLI supports backup listing, but a read-only production backup-list attempt returned `Access token not provided`. Browser backup inspection is likewise behind sign-in. Database-backup verification remains a concrete access blocker; no restore or further auth request was attempted.


## Fresh source-candidate CI result

GitHub Actions run `40407654308` for source commit `ed4571c56c31e65376809bb39b05a7f847462767` completed successfully. Locked dependency installation, storage ownership check, critical advisory check, complete regression suite, TypeScript check and production build all passed. This supersedes the in-progress observations above. The ready Netlify preview remains a non-production deployment. Email/browser E2Es, parked Stripe tests, remaining security review and database-backup readiness are not cleared by CI.


## Administrator and legacy communication-credit boundaries

- Reproduced an unsigned deduction against a synthetic QA ledger: starting credit 10 became 9 after calling legacy `deduct_communication_credit` as anon. The entire fixture was rolled back. No messages, provider calls, Stripe operations or real balances were involved.
- Read-only production permission inspection confirms both legacy `deduct_communication_credit` and `check_communication_credits` are currently executable by anon/authenticated/service_role. This is not evidence that production was exploited.
- Applied `20261026215644_restrict_legacy_communication_credit_rpcs.sql` to QA only: revoke legacy helper access from PUBLIC/anon/authenticated; retain service_role execution. No balance/rate/function-body changes. Repository search found no application or Edge caller of either legacy helper beyond generated types and historical migration definitions.
- Rollback-only `qa-admin-credit-boundary-verification-20261027.sql` passed: anon/customer calls denied, unchanged synthetic balance after denied calls, service_role check and deduction still work, and an ordinary customer is denied all nine checked administrator endpoints by the existing recent-owner-verification guard.
- Eight focused administrator/team/closure/suspension security test files: 80 tests passed. Fresh advisors: 23 informational RLS/no-policy notices, 129 anonymous and 179 authenticated SECURITY DEFINER warnings. These counts remain a partial-review indicator, not an all-clear.
- Final QA fixture counts: zero Auth users, events, guests, communication-credit rows and usage rows. The fix remains unapplied to production; a fresh candidate CI run is required after saving this source migration. Stripe remains parked.


## Trial eligibility reuse checks

Rollback-only `qa-trial-email-reuse-verification-20261027.sql` passed: an expired account changing its email retains the original expired trial; a new account reusing that account's now-vacant original email, including changed case, inherits the original eligibility deadline and does not obtain a fresh trial. Neither account receives an active Starter entitlement. No email was sent. A separate direct authenticated test confirmed the legacy `extend_starter_trial_once` call is already blocked by function privileges and cannot move the original expiry; no extra source change was needed.

Source commit `cfb8e73a63f47efe06e84d3e844a8306d6500f3c` has ready Netlify deploy-preview `6adfccf590b168954ca3d5ca`, with published_at null. Full CI run `40408742560` remains in progress at the latest check; it has not yet been marked passed. Stripe remains parked and all previously stated access/review blockers remain open.


## Latest credit-fix CI completion

Run `40408742560` for source commit `cfb8e73a63f47efe06e84d3e844a8306d6500f3c` completed successfully. Locked install, storage-ownership check, critical-advisory check, complete regression suite, TypeScript check and production build all passed. This supersedes earlier in-progress observations for that source commit. Subsequent commits contain test/evidence files only. The ready preview remains non-production. Real email/OTP/browser onboarding, parked Stripe work, remaining dependency/function security review and database-backup verification remain open. No release approval, merge, production deployment or production data modification occurred.


## Customer-facing pricing and FAQ check

- Browser inspection of isolated preview pricing confirmed package prices A$199/A$249/A$299 and displayed 10% GST-inclusive totals A$218.90/A$273.90/A$328.90, matching arithmetic from the QA catalogue. Seven-day/20-guest and 100/200/400 paid guest limits match. These are display checks, not Stripe tax settlement proof.
- Expanded/read FAQ content revealed two stale answers still offering A$20 monthly extensions and promising permanent automatic deletion after the recovery period. Corrected only these two answers in `src/pages/Faq.tsx` to match the candidate pricing/terms: available-package renewal with verified checkout; saved information retained and expiry alone does not automatically delete content. No prices, entitlements, layout or terms were changed.
- Three existing lifecycle/pricing test files / 24 tests passed, and QA-configured production build passed (26.47 seconds). Preview rebuild/rendered-content confirmation remains required after saving this copy-only change. Backend source CI at `cfb8e73` remains separately verified.
