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
