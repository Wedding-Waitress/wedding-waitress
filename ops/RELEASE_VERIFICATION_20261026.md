# Wedding Waitress release verification — 26 October 2026

## Decision

**HOLD: no production deployment or merge.** The owner authorized deployment after all release gates pass. Full database replay and a genuinely isolated trial/payment E2E are still incomplete. Production customer data, schema, migration metadata, Stripe settings, secrets and deployed code were not changed during this investigation. Only the empty QA database was reset and partially replayed.

## Verified identifiers and pipeline

- Repository: Wedding-Waitress/wedding-waitress; draft release PR #3, branch `fix/stripe-live-catalogue-expo-2026`.
- Starting release-candidate commit: `e6b2d5edc426aa2c52fb1ce6e0914a2cfd7a3cd0`.
- Main branch at investigation start: `5b2a4d9671891dff500b355bd8eff8526f4c0e35`.
- Netlify site: `61e19ca1-620a-4431-9b50-39d90a8c94b6`, https://weddingwaitress.com.au .
- Still-published deployment: `6adb64d23b0756bd010f4db8`, published `2026-10-23T13:45:03.020Z`, state ready, source CLI, branch main, commit_ref null. The actual published bundle contains manual release suffixes. Its exact Git commit cannot be established from deployment metadata.
- GitHub status on the starting candidate confirms Netlify PR preview automation at https://deploy-preview-3--weddingwaitress.netlify.app .
- **Both the public production JS bundle and that preview bundle reference production Supabase `xytxkidpourwdbzzwcdp`. The preview is not isolated QA.** No synthetic signup or purchase was submitted there.
- Production Supabase ACTIVE_HEALTHY; 578 recorded migrations through `20261020065753`.

## Root causes and fixes prepared

1. Historical source and production migration timestamps diverge. Editing a repository migration alone does not repair the database's stored replay history. The previously corrected Storage DELETE statements were already removed in the candidate and the matching production history entry; they were not rerun on production.
2. The QA branch contained a manually preverified record for `20251019055707`; rebase initially failed with a duplicate history primary key. Resetting the verified empty QA branch exposed earlier, real replay failures.
3. Production-history migration `20250930015026` alters `live_view_settings` before `20250930054711` creates it. The repair introduces its historical base table with RLS before the ALTER, and makes the later CREATE conditional. No later security policies were removed. The corresponding source ALTER file is `supabase/migrations/20250930135028_4c6b60c1-b6cd-4f85-a2a9-9087f0b02144.sql`.
4. Bucket definitions can survive a development-branch reset. Historical invitations and event-media INSERTs failed on duplicate bucket IDs. Added conflict-safe INSERT behavior, preserving bucket contents and existing settings. No managed Storage rows were deleted.
5. Migration `20251023084541` seeds a production-specific administrator ID which is absent in a no-data branch. Prepared a guarded INSERT SELECT that seeds only the existing identity; it does not create an auth user or make another user an administrator.
6. Saving calendar dates west of UTC shifted existing ceremony/reception dates and the ceremony deadline backwards. Date-only fields now use local ISO date parsing. The existing preservation test passes under America/New_York. Admin date-only display was corrected too; timestamp parsing remains ISO-aware.
7. The plan registry advertised three users while the production plan table and access rules allow five. The three customer plans now display five without changing database entitlements.
8. The active package webhook was missing from Git. Captured its exact deployed version-25 handler and shared service into source, with the matching signature-authenticated gateway setting and contract tests. Deployed bundle hash: `2febfbd623715a0872f1849bd4a281f3e99d7d0ca2a6e0f308a570f325f9a42b`. This capture was not a backend redeployment.
9. Several tests still asserted retired Stripe IDs, pre-GST credit fulfillment, or a disabled renewal gate. Updated those expectations while preserving payment evidence, consent and retry checks. CI now runs the whole regression suite with synthetic client configuration.
10. Public pricing omitted explicit GST totals and promised monthly extensions/automatic expiry deletion despite the release's disabled extension controls and retained-content renewal flow. Added per-card GST totals and aligned renewal/expiry wording; no prices, storage allowances, trial terms or paid limits were changed.

## Current commercial configuration

| Offering | AUD before GST | AUD including configured 10% GST | Guests | Term |
| --- | ---: | ---: | ---: | --- |
| Seven-day Starter trial | 0 | 0 | 20 | 7 days |
| Essential | 199 | 218.90 | 100 | 365 days / advertised 12 months |
| Premium | 249 | 273.90 | 200 | 365 days / advertised 12 months |
| Ultimate (internal Unlimited) | 299 | 328.90 | 400 | 365 days / advertised 12 months |

The three paid packages are one-time Stripe prices, include one event, and have five account users in production configuration. Public included Email/SMS credits are 150/250/450 respectively. The old A$99/A$149/A$249 products are inactive. Vendor Pro is inactive in the production plan table. No catalogue or customer entitlement was modified.

The production signup hold is disabled. The browser successfully opened the landing page, public pricing and the free-account form advertising seven days, twenty guests and no card. An OTP was not sent and registration/onboarding/dashboard access was not completed.

There is no active promotion campaign in production; the sole returned internal verification campaign is inactive. No promotion was enabled or issued. Contract tests cover discount calculations and provider evidence; this is not a customer coupon/payment E2E.

## QA state and native blocker

QA project `ckmgjbwifbzzknnyxzqe`, branch ID `d2509e11-d20a-4bed-a1a8-b4676313d7cb`:

- Before reset, all listed public tables were empty; auth users, events, guests and Storage objects were each zero. No unique customer data was present in the checked branch.
- Successfully applied the repaired September sequence and the conflict-safe event-media migration, then continued native rebase.
- Last verified state: **MIGRATIONS_FAILED**, 91 applied migrations, latest `20251023082944`.
- Next migration fails its hardcoded administrator foreign key. Its repair is prepared in source and in `ops/migration-history-repairs/20261026-replay.json`.
- Three revised mutation attempts, including the supported apply_migration operation, returned `McpServerError: Invalid or expired requestState`. Read-only verification confirmed `public.app_role` is still absent and the repaired migration was not applied. This was not a successful replay or an explicit policy rejection.
- `ops/migration-history-repairs/qa-resume-20251023084541.sql` is a **prepared, not executed** native-dashboard continuation script. It checks zero auth users, the exact QA migration position, absent app_role, and empty legacy responses before proceeding. Select the named QA project in the dashboard; never execute it on production. It preserves the original migration version only after actually executing the corrected SQL.
- Main production history was not patched. The JSON preserves original/repaired statements for reviewed metadata-only repair after QA replay succeeds. Do not reset QA again and assume these repairs survive: the parent history must first be reconciled safely.

## Checks actually performed

- Clean `npm ci` using the repository's pinned npm 11.19.1: passed. Host npm 11.9.0 initially failed on an extraneous AIX esbuild lock entry; the pinned toolchain resolved the install without changing dependencies.
- Full regression: **450 files, 2,636 tests passed** with synthetic Supabase values and America/New_York time zone. This run includes the new webhook tests.
- Subsequent pricing/lifecycle changes: **24 focused tests passed**. CI must pass on the final committed files too.
- Application and Node TypeScript checks: passed.
- Vite production-mode build with synthetic client configuration: passed; existing bundle-size warnings remain. This is a compilation check, not a deployable production configuration or staging E2E.
- Event-selection storage ownership and `git diff --check`: passed.
- Webhook contract tests exercise original payment time, duplicate ledger replay, unpaid sessions, invalid amounts/refunds/disputes, unavailable access checks and separation of promotional purchases. Provider and DB adapters are fixtures; they do not prove live delivery or SQL idempotency.
- Production Stripe endpoints for ordinary packages, promotions and refunds are enabled. Each real handler rejected a missing and forged signature with HTTP 400 (six checks); no valid event or financial action was sent.
- Stripe returned no checkout.session.completed/async_payment_succeeded events in its available list, including the unsuccessful-delivery filter. There is therefore no observed successful live checkout delivery to cite.
- Production paid-plan and promotion atomic-fulfillment RPCs are executable by service_role only, not anon/authenticated.
- Security advisors were read. They report informational no-policy tables and numerous GraphQL/SECURITY DEFINER visibility warnings requiring individual review. A clean critical-security audit has not been established.
- A broad Netlify environment-variable listing was rejected by automatic approval review because it could expose live secrets. It was not bypassed. Safe public-bundle inspection established which database the preview uses, but did not prove server secret pairing or all redirect/environment settings.

## Remaining release gates and required access

1. Resolve the Supabase native mutation/confirmation failure, apply the guarded QA repair, and continue actual replay through all required migrations. Then verify schema, policies, functions, triggers, security and schema parity. Further historical defects may be exposed.
2. Configure a genuinely isolated preview against QA and the separate Stripe sandbox, with server-side test credentials, test webhook signing secret, catalogue IDs, tax configuration and callback URLs. Preserve production values. The current application has live-only catalogue/evidence checks; support a separately bound sandbox path without allowing test-mode evidence to grant production access.
3. Complete real signup/email OTP, onboarding, trial creation/dashboard/20-guest enforcement/expiry and returning login. Browser signup entails acceptance of terms and needs the native user step; no account was fabricated or OTP bypassed.
4. Complete actual sandbox payments for all three plans, valid/invalid/ineligible/expired offers when configured, declines, cancellation/retry, webhook delivery, duplicate SQL fulfillment, GST totals and no success-URL upgrade.
5. Establish safe production backups, validated migration impact, server-secret/webhook pairing, exact deployment configuration and a recoverable release path. No backup snapshot was created or restored in this run.
6. Only after those checks pass: reconcile historical metadata safely, merge, deploy through the verified pipeline, then smoke-test production and verify entitlement consistency without charging a real customer.

## Recovery / rollback readiness

No production release occurred, so production rollback is unnecessary. The existing deployment remains live. Keep main untouched until the gates above pass. For an eventual bad published frontend change, revert its exact Git commit and let the verified pipeline deploy the fix. Do not rerun the historical DROP SQL on production or reset the main database. Before future database changes, identify a valid provider backup and a tested forward/compensating migration; `20261026-replay.json` contains the before/after metadata statements but is not a database backup.

