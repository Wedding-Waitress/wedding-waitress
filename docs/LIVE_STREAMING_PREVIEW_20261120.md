# Live Streaming: local design preview

## Archived on 23 November 2026

The owner paused this feature to focus on existing Wedding Waitress tools. The preview is archived in place, not deleted. Its components, styles, tests, model, specification, pricing layout and browser localStorage key remain intact. No data is cleared and no backend resources are changed.

The existing feature-flag module now keeps liveStreamingPreview false. This hides the dashboard entry and disables both preview entry points; saved streaming links return to the dashboard. To resume after owner instruction, set that flag to true in src/lib/featureFlags.ts. The original development-only boundary still applies. This archive does not authorize further development or publication.

## Release boundary

Owner authorised an interface/workflow preview only on 20 November 2026. Do not publish, deploy, activate AWS resources, take payments or modify production entitlements. AWS account creation and Stripe catalogue/checkout wiring are deferred. This work is guarded by `import.meta.env.DEV`; the private review route is `/dev/live-streaming`. The existing dashboard gets a development-only Live Streaming entry after Photo & Video Sharing.

The internal English pricing-layout preview shows the fourth Live Streaming card. The actual multilingual public pricing page is unchanged. Public integration must include all supported translations before release.

## Agreed product specification

- Standalone Live Streaming or optional add-on to a planning package. Streaming-only accounts will see other tools muted/locked; buying Essential/Premium/Ultimate unlocks the planning tools for 12 months. Enforce permissions server-side as well as in the UI when backend work begins.
- One free ten-minute test per account, including existing seven-day planning trial accounts. One broadcaster and up to 100 simultaneous viewing devices, including the free test. Show a paid-package prompt after test exhaustion.
- Final AUD prices, excluding GST: 720p two/five/eight hours $300/$400/$500; 1080p $400/$500/$600. GST is to be calculated at Stripe checkout, not guessed by the local preview.
- Owner tests 720p throughout and 1080p throughout before deciding the final customer quality offering. No hybrid mode in this design.
- Paid package expiry is exactly 90 days from successful purchase, never from first broadcast. Actual live broadcasting consumes time; pauses do not. Time remaining and recording/download access end at the same expiry. Late recordings do not extend it.
- Usage panel: selected package, start/purchase date, time used, remaining countdown/progress and exact expiry. Show reminders before expiry.
- Each purchase is a separate package: separate allowance, expiry, five downloads and combined recording. No extension or carry-over into the old package.
- Two distinct event/package links: password-protected broadcaster link and password-free viewer link. One active broadcasting iPhone. Viewers are live-only, with no replay, recording download or recording purchase.
- Recording and download are included automatically, never sold as a separate required add-on. Join all sessions in a package in chronological order, omitting offline gaps. Only the account holder can access/download the combined file. Five downloads per package.
- Instructions beside actions; tips cover a tripod, lighting, tested compatible external microphone, connection testing, power and keeping the browser open.
- Required unticked acknowledgement covers permission to broadcast/record and possible independent viewer captures. Legal review before production. Do not claim a checkbox removes statutory consumer rights.

## What this preview actually does

Package selection and confirmation, final quality-dependent prices, event details, mandatory acknowledgement, distinct demonstration links, simulated allowance usage, pause/resume timer, automatic allowance/expiry stop, combined-session summary, trial-used state, download counter simulation, expiry simulation, streaming-only sidebar simulation and planning-upgrade dialog. Preview state is isolated under `ww:live-streaming-design-preview:v1` in this browser's localStorage; it is not an authoritative account record. Role pages synchronise within the same local browser origin. Optional camera/microphone check is local only and stops its tracks on unmount.

The broadcaster's demonstration password is visibly labelled `preview`. It is not authentication. The link tokens are not usable on another device because no backend is connected. Server-side trial enforcement, device leases, viewer counting, private storage, permanent recording ownership, notifications and download permissions remain backend work.

No real broadcasting, payment, recording, merging or video download occurs. Those controls are simulated or disabled and clearly labelled. Never market the local simulation as a working streaming service.

## Later integration and verification

Provision AWS only with the owner's account/billing approval. Implement authenticated organiser ownership, single broadcaster lease with reconnect recovery, server-authoritative time, viewer admission capped at 100, webhook-idempotent purchases and independent streaming entitlements. Use private recordings, signed organiser-only downloads, chronological processing and a consistent download allowance for retries/resumes. Enforce expiry across the API, media tokens and storage lifecycle. Verify storage deletion and any version retention rather than simply hiding files.

Test real iPhones with permissions, external audio, backgrounding, interruption/reconnect, power/heat and network loss. Verify the measured source and downloaded resolution and compare on a TV. Do not promise 1080p that the source/network did not supply. Cost actual processing, reprocessing after added sessions, requests, notifications, downloads and the 90-day retention. Prior cost estimates excluded processing/application overhead and assumed only two months; they are not a maximum bill or guaranteed margin.

The trial's calendar expiry (as distinct from its ten-minute usage cap) has not been specified; the preview does not invent a deadline. Before production, confirm that operational detail without repeating settled requirements.

Only after owner design approval, AWS/Stripe setup, integration tests, real-device review, all public translations, normal GitHub save and verified encrypted backup may a separate production release be considered.
