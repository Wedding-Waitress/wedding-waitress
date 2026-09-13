# Pre-launch signup hold

All public signup CTAs use the shared free-account popup. The submit saves **interest**, not an Auth account. Only after a successful durable save is the launch thank-you notice displayed. Contact details, package intent and untrusted pending promo input are saved privately. Duplicate emails receive the same result without overwriting existing details. No email, code, checkout, trial or entitlement is created.

During the hold, only the single existing server-owned `private.platform_owners` identity, also retaining its existing admin role, is allowed into authenticated tools. The configured owner UUID is captured from that registry, never from user-editable metadata or submitted email. Normal owner sign-in and recent admin verification still apply. Existing nonowner records, roles, trials and subscriptions are preserved but temporarily inaccessible.

Enforcement: an Auth BEFORE INSERT trigger refuses new accounts before trial/profile triggers run; restrictive public/storage RLS policies protect authenticated queries; the existing PostgREST request hook is wrapped rather than removed; service-side customer and promotional handlers check the hold. Anonymous shared guest links retain their existing token-based permissions; public information pages remain public. No new permission is granted by the hold.

The registration function limits request bodies, validates required contact details, and uses a private service-only atomic persistence RPC. It keeps keyed source digests, not raw IP addresses, with 10 requests/source/minute and 300 globally/minute. Forwarding headers are not identity proof; global throttling bounds spoofed-source attempts. No CAPTCHA is configured. Interest emails are unverified and require a separately reviewed consent/verification and notification process before launch messaging.

## Controlled launch

There is no public switch or automatic enrollment. A later explicitly approved launch release must change `PRELAUNCH_SIGNUP_HOLD` to false and deploy the ordinary signup UI, then an authorized database operator sets `private.prelaunch_control.enabled=false` and `changed_at=now()`. Database hold remains authoritative during the transition. Verify legitimate nonowner login and fresh signup/trial behavior after release. This does not admit waitlist entries automatically or issue their rewards.

Apply this migration **after** the existing trial/access, promotional and approved reporting/media migrations. Deploy handlers importing the updated shared customer/promotion guards together. Preserve promotional snapshot wrappers. The data-preserving rollback retains every registration and previous customer record; it disables the hold and restores wrapped functions without sending anything.

The full Stripe checkout/redemption/activation verification remains separate and deferred. A production signup submission must not be used as a smoke test without explicit approval for its contact-data mutation.
