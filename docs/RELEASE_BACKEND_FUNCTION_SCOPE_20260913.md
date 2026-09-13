# Remaining backend release scope — 13 September 2026

Deploy updated source for these 34 existing production backend functions in Supabase project `xytxkidpourwdbzzwcdp`. This includes shared prelaunch access enforcement and prepared customer/admin changes. Installation only: do not invoke purchase, refund, deletion, or messaging operations; do not change secrets, Stripe settings, checkout/refund activation switches, scheduled jobs, or issue promotional codes. Preserve customer records. No pruning. Monthly extension/reminder/purge activation is excluded.

- delete-event-media
- delete-welcome-video
- create-promotion-checkout
- djmc-pronunciation-media
- admin-promotions
- delete-guestbook-submission
- create-checkout
- check-welcome-video-status
- classify-invitation-image
- guest-addition-sms-enrolment
- gallery-live-feed
- get-promotion-state
- fix-gallery-upload
- optimize-signage-image
- manage-account-members
- generate-seating-suggestions
- get-account-billing
- create-welcome-video-upload
- optimize-image
- send-invitation-email
- floor-plan-share
- send-transactional-email
- send-venue-invitation
- send-rsvp-sms
- send-rsvp-email
- validate-promotion
- verify-gallery-password
- verify-payment
- venue-floor-plan-request
- verify-promotion-payment
- admin-operations-snapshot
- admin-customer-preview-media
- admin-customer-preview-billing
- admin-payment-refund

The first attempt was rejected pending exact authorization. Following direct approval in this task, all 34 listed functions were installed successfully and verified ACTIVE. `register-prelaunch-interest` was separately approved and installed successfully. All eight prepared database migrations are installed, including the prelaunch hold; canonical owner access is verified and customer/media records preserved. No purchase, refund, deletion or messaging operation was invoked, and no Stripe or activation settings were changed. Website publication follows final source/staged-index checks.

Requested approval: I approve installing the exact 34 production backend functions listed in docs/RELEASE_BACKEND_FUNCTION_SCOPE_20260913.md, including shared prelaunch guards and disabled refund/checkout capabilities. Do not invoke refunds, purchases, deletion or messaging operations, change activation switches or Stripe, or send launch emails. Continue the approved website release after verification.
