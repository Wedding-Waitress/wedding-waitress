# Validation dependency security update — 27 October 2026

Base release candidate: ce2e85ebe3fa26d86875526bb9f16ae1609bf58a.

Pins Zod 4.6.7 and compatible React Hook Form resolvers 5.2.2. Updates error customization and issue access, models guest form input/output separately, and preserves guest defaults and required-field messages. No prices, entitlement rules, PDF libraries, print layout, or production database changes.

## Verified

- Fresh production dependency audit removes Zod GHSA-mrhx-c7xc-m3w5: zero critical, one high (PDF.js) and two moderate (router packages) remain. This is not a clean release audit.
- 24 focused validation and authentication navigation tests pass, including missing seat message, invalid RSVP, resolver default transformation, and oversized scalar rejection.
- Production build passes.
- Explicit application type check still has 12 diagnostics outside changed files. The original source checked using the same installed dependencies produces exactly those same 12 unrelated diagnostics; the upgrade source adds none. The standard repository no-project tsc command is not evidence that all application types are clean.
- Read-only QA database checks: every public base table has RLS; examined fulfillment/credit mutation functions deny anon/customer EXECUTE; nine admin endpoints deny an ordinary authenticated identity; inspected wrappers enforce private.require_recent_admin_verification with owner, live session, verified email and non-expired grant checks. No real customer data or production mutations were used. This remains a focused permissions review, not a complete audit of all SECURITY DEFINER functions.

## Pending

Full regression completed: 453 files / 2650 tests passed with four fork workers. The first attempt hit a 180-second limit; the completed longer run took 129.71 seconds. Independent release-candidate integration remains pending. PDF approved-layout comparisons, broader function review, email/browser E2E, backup verification and Stripe gates remain open. Do not deploy based only on these checks.

## Notification and SMS helper permissions

The continued permissions review reproduced missing-identity authorization bypass in get_notification_settings using only a nonexistent synthetic UUID, without reading any real settings. Both notification helper definitions used nullable inequality. Migration 20261026230842_restrict_notification_and_sms_helpers.sql replaces that predicate with an explicit missing-identity rejection and IS DISTINCT FROM, revokes anonymous execution, and keeps authenticated own-account access. Two SMS status helpers lacked internal authorization and were publicly executable; restrict them to service_role, matching current Edge/webhook callers. Applied to QA only.

Read-only QA verification passed: anon notification read/write denied; own nonexistent-account lookup allowed; cross-account read/write denied; missing authenticated identity denied. SMS privileges confirm anon/customer denied and service_role retained. No real credentials were read, no SMS sent, and no production changes were made. This is a scoped correction, not completion of the entire database-function audit.
