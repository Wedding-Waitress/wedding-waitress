# Production release — 27 October 2026, Melbourne

Owner explicitly authorized publishing all prepared changes, including PDF.js. Owner stated the previously outstanding journeys/checks had passed in their own testing; that is owner-reported evidence, separate from agent-run verification.

Published source: 152a12ad0624ad1a7b0982ac7fcc28efc02cde19.
Netlify production deploy: 6adfdfaa6e766d90c615b3d9.
Netlify reports ready and published_at 2026-10-26T23:19:40.077Z.
Live domain: https://weddingwaitress.com.au/

Merged PRs 5 (validation and permission fixes), 4 (PDF.js upgrade) into release candidate, then PR 3 into main. Existing prices/catalogue were preserved.

Five forward production migrations applied successfully: guest lookup postal privacy; guest token event scope; legacy communication credit RPC restrictions; empty guest relation preservation; notification and SMS helper restrictions. Historical migration replay fixes and QA bootstrap/catalogue/grant setup were not replayed on production.

Eight production Edge Functions deployed ACTIVE: verify-payment v126; admin-promotions v28; verify-promotion-payment v29; stripe-access-extension-webhook v26; validate-promotion v26; create-checkout v118; create-promotion-checkout v31; stripe-promotion-webhook v29. Existing JWT-verification settings preserved. Dependencies not present in repository were preserved from the existing deployed bundle; promotionAudienceRules.ts is restored alongside this record for reproducibility.

Verification: live home and pricing render; live ww-backend-origin is https://xytxkidpourwdbzzwcdp.supabase.co (production). Current pricing displays A$199/249/299 excluding GST and A$218.90/273.90/328.90 including configured 10% GST. Production SQL confirms restricted credit/SMS RPCs deny anon/customers and retain service_role, settings deny anon, token crypto is qualified and required empty relation fields are preserved. Security advisors read after DDL.

Before release, validation branch passed 453 files / 2650 tests and build. PDF upgrade had separate calibration/44 print tests and build evidence; owner authorized release and reported remaining checks passed. Agent did not independently perform real OTP, full authenticated browser customer journey, valid Stripe purchase/webhook settlement, backup restoration or approved-layout comparisons during this release. No live customer charged, no real message sent, and no customer records deleted.

A production migration attempt encountered a same-second metadata version collision; failed transaction was retried successfully after subsequent operations. First admin-promotions deployment failed to bundle a missing repository helper; existing deployed function remained active, missing helper was preserved from its original bundle and deployment then succeeded. Netlify environment-variable listing was rejected by automatic approval review; no values were retrieved or bypassed, and Git-based continuous deployment completed without it.
