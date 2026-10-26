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

Full regression completion and independent release-candidate integration. PDF approved-layout comparisons, broader function review, email/browser E2E, backup verification and Stripe gates remain open. Do not deploy based only on these checks.
