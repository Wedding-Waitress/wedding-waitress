# Promotional codes — local implementation status

## Initial hosted database installation checkpoint (historical)

After explicit approval of the exact six-migration scope, all six prerequisite/promotional migrations applied successfully to the existing hosted Wedding Waitress project. Post-install read-only checks confirm 11 Auth identities and 11 immutable trial records, zero original-trial date mismatches, zero paid-access grants, zero campaigns/redemptions, and no missing RLS on promotional tables. Anonymous reservation and authenticated fulfillment execution are denied; service-role fulfillment execution is allowed. The security advisor was run and reports broader database notices; this is not a clean security audit. Backend Edge Functions have not yet been deployed, so the connected promotional browser workflow remains unverified. Website deployment and Stripe testing/changes remain on hold. Earlier local-only and blocked-install notes below are historical checkpoints.

## Latest backend installation checkpoint

Current connected checks: owner campaign create/list/pause persistence and read-only positive offer validation across all three packages passed. One internal campaign remains paused; promotional redemptions and paid-plan purchases remain zero. Signup code handoff is automated-test verified, not yet a real new-account/OTP browser test. Real Stripe sandbox checkout, redemption, webhook completion, and activation remain unverified and deferred. Frontend deployment remains on hold.

All six promotional Edge Functions are now installed and ACTIVE on the existing hosted backend: admin-promotions, validate-promotion, get-promotion-state, create-promotion-checkout, verify-promotion-payment, and stripe-promotion-webhook. Anonymous HTTP checks confirm management denial, disabled state, and blocked checkout/verification/fulfillment without starting payment. No Stripe webhook registration, Stripe calls, or website deployment occurred.

Connected browser review identified that the immutable-trial migration's replacement pre-request guard granted execution only to authenticator, not the API caller roles. The additive account_request_guard_execution migration restores execution of this no-result guard to anon/authenticated/service_role, leaving its private wrapper, entitlement checks, and RLS unchanged. Post-install checks confirm caller guard execution is allowed while private guard and promotional fulfillment remain denied to authenticated callers. Browser account verification still needs successful confirmation; a subsequent attempt timed out.

After refreshing, the authenticated dashboard loads with Platform Owner Access. Admin entry correctly requires fresh verification; the owner's verification-code prompt is open. Connected campaign management/offer verification awaits that owner step. Latest targeted regression tests: 63 promotional tests and one new request-guard execution contract test passed. Whitespace checks passed. Earlier statements that backend functions are not installed or that all work remains local-only are historical and superseded by the owner's hosted-backend approval. Promotional checkout remains unactivated. Real provider end-to-end verification has not occurred.

## Implemented and checked

- With explicit owner approval to briefly reactivate the internal campaign, connected read-only browser validation passed for Essential/Premium/Ultimate at 51%: A$97.51/A$122.01/A$146.51 excluding GST, each zero included shared credits and unchanged limits/twelve-month term. Checkout remained disabled. The admin route returned to dashboard during cleanup, so the approved pause was performed through a narrowly scoped database update of this exact internal campaign (active=false); no authentication or entitlement guard was changed. The internal code must not be distributed.
- Latest targeted sign-up/handoff/admin/consent/workflow run: 31 tests passed. TypeScript, targeted whitespace checks, and the latest local production build passed. Existing CSS syntax, stale browser-data, and large-chunk warnings remain. These checks do not include a real new-account signup/OTP flow or Stripe provider testing.

- Non-Stripe connected checkout-page check: the signed-in Essential offer form submits the paused internal campaign to the hosted validator and receives the server's first-purchase offer rejection, with no discount confirmation or checkout activation. The validator's authentication failure path uses a different unavailable response. Frontend now reads safe non-2xx error bodies from the Supabase error context rather than incorrectly presenting all rejected codes as service outages; five focused component tests and TypeScript pass.
- Latest sign-up/handoff/consent/workflow run: 25 tests passed. These use mocked identity/provider responses and do not constitute a real new-account signup/OTP flow. No new account or signup email was created during connected review.
- Positive hosted active-offer validation remains blocked by the safety reviewer: briefly reactivating the internal campaign requires explicit owner approval because the code would become usable. The attempt was rejected before changing state; no alternative path was used. Campaign remains paused. Stripe testing and frontend deployment remain deferred.

- Connected hosted admin verification passed after fresh owner verification: loading campaigns, manually creating the internal 51% campaign `WWINTERNALCHECK0913`, pausing it, and reloading the persisted paused campaign. A separate read-only database query confirms 51%, active=false, and zero total promotional redemptions. The internal campaign remains paused and must not be distributed. This verifies management connectivity, not Stripe checkout, redemption, or paid activation.

- Optional promo input below Mobile in both public sign-up forms.
- Pending sign-up code travels in OTP metadata as untrusted input only.
- Authenticated first-package checkout pre-fills that pending code and permits manual entry after the trial.
- Read-only server offer validation checks confirmed identity, account-master eligibility, first-purchase history, campaign status, approved package and exact credit threshold.
- Checkout preview discards stale responses after input or package changes; editing the code invalidates previous checkout consent.
- Manual campaign-code and name inputs in Subscriptions & Payments.
- Whole-number percentage-only offers, from 1 through 100.
- Offer previews show package price excluding GST, guest capacity and shared sending credits.
- Exactly 1–50% keeps normal included credits; 51–100% previews zero new included credits.
- A permanent admin reminder explains both credit thresholds and preservation of purchased credits.
- Owner management endpoint checks current confirmed identity, platform-owner authorization and signed recent admin verification.
- Prepared migration contains protected campaign and durable email-redemption tables, service-only management and serialized first-purchase reservations.
- Data-preserving rollback disables management/reservation and pauses campaigns; it does not erase histories.
- Checkout rejects supplied promo codes while fulfillment is unfinished, rather than silently charging the full price.
- Provider-evidence fulfillment verifier and concrete adapters are connected to dedicated creation/verification handlers, including discounted/captured payments, no-cost completion, identity/product/coupon/session binding, original completion time, scheduled trial-end start and twelve-calendar-month expiry. Expired terms are never described as active.
- Service-only atomic completion and due activation are prepared. The entitlement hook requests due activation before the existing authoritative entitlement RPC; promotion state cannot bypass denied access.
- Existing-credit baselines and a server-side grant trigger preserve retained balances/usage and purchased top-ups while preventing normal allowance restoration for zero-credit offers.
- Dedicated promotional return routing, correct no-cost/pending/scheduled wording, and verified trial/activation notices are connected. Both sign-up verification views explain pending-code handling without claiming redemption.
- Signed promotional webhook source is prepared to reuse the atomic evidence verifier. It is not registered or deployed.
- Provider-confirmed expired unpaid attempts are archived, with distinct subsequent idempotency keys and coupons. Paid/uncertain attempts are not recycled; repeated recovery cannot reset history.
- Reopened checkouts must match the stored account, package, purpose, explicit consent, customer, product, coupon, currency and discount. Uncertain bindings fail closed without creating replacement checkout sessions.
- Four local Deno tests use the real Stripe SDK signature verifier with disposable signatures: intact completion succeeds; tampered bodies, wrong secrets and stale signatures fail before fulfillment; sandbox/unrelated events cannot grant access; unconfirmed fulfillment remains retryable. These tests make no Stripe API or database requests.
- The existing admin snapshot contract merges verified promotional purchases server-side, including zero-amount no-cost records. Paid promotional refund lookup uses the existing real-charge checks; no-cost records cannot be refunded.
- Combined promotion-focused run: 115 tests passed. Subsequent admin/refund-focused checks: 40 tests passed. Final complete suite: 445 files and 2,582 tests passed. Latest production build passed; existing CSS syntax, stale browser-data and large-chunk warnings remain.
- Browser review confirmed owner-verified navigation and 50%, 51% and 100% previews without creating campaigns or checkouts. At a 390px viewport, the document had no horizontal overflow and all three inputs fit within the promotional panel. Desktop viewport restored afterwards.
- Application TypeScript, Deno checks of all six promotional entry points and updated refund entry point, and `git diff --check` passed.
- Local transaction tested migration creation, management, invalid percentages, null/non-owner denial, and public execute denial; all changes rolled back.

## Still required before calling the feature complete

- Complete full browser workflow verification against an isolated, functioning local backend. The current local frontend uses the existing backend; new promotional endpoints and schema are deliberately not installed there.
- Validate real provider behavior in a separately authorized isolated sandbox before production activation. Current provider tests are mocks; database verification uses rollback-only fixtures.
- Owner declined Docker/staging setup. A subsequent instruction superseded hosted-testing approval: all current work is local-only, with no hosted database changes or backend/website deployment. No system installation has occurred.
- Future deployment requires independently verified backend secrets, registrations, migration dependencies and webhook activation. Paid checkout remains disabled, and none of these production steps is authorized now.

Production deployment, production database changes, live Stripe catalogue changes and charges remain on hold.

Hosted-testing follow-up: owner subsequently selected and approved the existing hosted backend path instead of Docker. A fresh schema-only native backup completed (1,221,284 bytes; SHA256 FB5B908CB44323F6017E72FB0491BAF86D1CA0156E34A2BA25627957FDF436FB). The application/Auth/Storage schema was restored into a disposable local database; hosted-only extension workers, ownership ACLs, and cluster-wide authenticator changes were excluded and hosted pre-request configuration was checked separately. All six migrations compile there; synthetic existing-account backfill tests preserve signup times, expire old trials without granting paid access, and confirm promotional RLS/service-only boundaries. Fixtures were removed. The first hosted migration attempt was rejected by platform safety review because prerequisite authentication triggers, account-wide RLS and pre-request behavior require explicit expanded-scope approval. No hosted migration was applied and no backend function deployed. Stripe and website deployment remain excluded.

Latest completion scope: finish local implementation and non-provider checks; real Stripe sandbox verification is explicitly deferred. A fresh run of all ten promotion-focused test files passed (123 tests), and application TypeScript passed. The planned source implementation is written. Full browser-to-running-backend verification remains outstanding because the local frontend targets the hosted backend, where promotional dependencies are not installed. This limitation is separate from deferred Stripe testing; do not describe all non-Stripe end-to-end checks as complete.

Additional verification: 57 tests across checkout handoff, checkout consent, promotion rules, admin controls and public sign-up passed. A local rollback transaction also verified confirmed-email offer quotes, exact 51% pricing/zero credits, no consumption on quote, repeat reservation identity, pause rejection and blocked public quote execution.

Historical completion-verifier checkpoint: 72 focused tests across six files passed. A guarded local transaction validated 100% completion recording, immutable binding and idempotent replay before later activation connections were added.

Current local database verification: `scripts/validate-local-promotions.ps1` guards the exact localhost fixture database, validates promotional amounts in the original admin snapshot contract, rejects revoked reporting sessions and unsafe recovery, preserves expired-attempt history, and applies the data-preserving rollback inside one rollback-only transaction. Reporting restoration and retained histories pass. Post-run checks confirm no promotional or paid-purchase fixture tables remain.

Latest checkpoint after checkout-reopening and webhook-handler improvements: all 445 application test files / 2,598 tests pass, plus four real-SDK local signature tests. Application TypeScript, all six promotional backend entry-point Deno checks, the guarded rollback-only database validation, whitespace checks, and the local production build pass. Existing build warnings remain unchanged. This is not real-provider end-to-end or production verification.

Additional local verification after reconnection:

- Twelve combined service-workflow fixtures cover all three packages at 50%, 51% and 100%, stored reuse, completion/replay, uncompleted no-cost denial, substituted-customer denial, and correct post-trial dates. They do not represent a running Supabase backend or a real provider transaction.
- `scripts/validate-local-promotion-concurrency.ps1` creates a uniquely named local schema-only fixture database, copies no customer rows, and removes only that database afterwards. Eight concurrent reservations return one identity; account-return lock contention and retry pass; six expiry recoveries archive once; six completions record once; changed replay amounts are rejected; completed email use survives auth deletion/re-registration. Existing reserved-package substitution is deliberately rejected, not automatically switched.
- No-cost completions now reject a payment-intent reference in both shared rules and prepared SQL. Local database checks accept no-cost evidence without a payment reference and reject an invented reference.
- Focused latest run: 69 tests passed; TypeScript, updated backend Deno checks, and whitespace checks pass. Latest full suite: 446 files / 2,611 tests passed. Latest local production build passes with the existing warnings.

Hosted preflight (read-only): the Wedding Waitress project is healthy, but promotional tables/functions, the verified `paid_plan_purchases` ledger, `private.account_trial_history`, `private.account_planning_blocked`, `private.admin_deleted_planning_blocked`, and `get_my_customer_entitlement` are absent. The last applied September migration is the admin customer data foundation. Applying the promotional migration alone is unsafe. The prerequisite account-suspension, logical-deletion, retained-closure, immutable-trial and original-paid-fulfillment migrations affect broader account-access and entitlement behavior, so they require explicit expanded-scope review/approval. No hosted mutation or backend deployment has occurred during this preflight; a fresh backup has not yet been taken.
