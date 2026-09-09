# QR seating chart and guest app review - 5 September 2026

Local routes: `/dashboard?tab=qr-code` and `/s/wendy-toms-wedding`.
Database: `xytxkidpourwdbzzwcdp`; only Wendy & Tom's authorized test event data was edited.

## Verified

- Approved QR-settings uniqueness correction applied. Saved QR colours, shapes and centre logo load before autosave. Rounded dots persisted after reload; final square/black/white design restored.
- Rejected QR saves visibly report `QR design was not saved`. Verified with an isolated HTTP 400 response and DOM observation; no rejected design was persisted.
- Copy Link, PNG/JPG downloads, QR logo upload/removal passed.
- Module image references save before retired uploads are deleted. Cleanup is scoped to this event, preserves other module references, and propagates save failures.
- Retained sample RSVP invitation, uploaded ceremony and reception floor plans, menu, event logo and welcome video. Image removal/re-addition and custom-hero replacement passed.
- Actual local guest app opened the invitation, uploaded plans and menu. Two labelled song requests saved for Amelia Reed and reappeared on reopening.
- My Events photo upload saved a private original. The same image synchronizer is connected to guided-setup completion, with passing failure/recovery tests; full guided setup was not rerun and no second event was created.
- Default event image appeared automatically in the guest app. Existing/custom overrides survived reload. Removing the hero saved an explicit no-image choice that remained empty after reload despite the saved event image.
- Final review state uses the inherited Wendy & Tom event logo. Only its active public hero copy remains; private original retained.
- QR editor, guest app and welcome-video modal checked at 1440px desktop, 820px tablet and 390px mobile without page overflow. Final screenshots are in the local temporary `ww-my-events-qa` directory.
- Final local production build passed with existing Browserslist/chunk-size warnings. 111 focused tests passed across 14 files, including the protected Individual Table Charts suite. The 11 QR persistence/typography tests were rerun successfully after final styling changes. No application runtime errors were captured in successful final browser checks.
- All 11 review guests and 6 tables retained.

## Approved hosted video correction - applied and verified

Nader explicitly approved the reviewed database correction and three-function deployment, then instructed us to continue.

- Applied migration `welcome_video_upload_history`: removed the one-upload-per-event constraint and added the event/creation index. Existing records, ownership policy and other constraints were preserved.
- Deployed `create-welcome-video-upload` version 87, `check-welcome-video-status` version 88 and new `delete-welcome-video` version 1. All retain JWT verification and check authenticated ownership. Shared implementation: `supabase/functions/_shared/welcomeVideo.ts`.
- Upload registration failures are checked. Status processing verifies event/UID ownership, ignores stale uploads, rounds Cloudflare duration for the integer database field, and checks publication errors.
- Replacement publishes the ready new video before deleting retired hosted uploads. Failed remote cleanup retains tracking for retry. Removal uses conditional configuration writes and a unique removal marker against stale status responses.
- Real UI replacement succeeded. Original UID `53ae2cf3dbaa1d9640662f6d6fa03c8f` returned HTTP 404 from its playback manifest; replacement `3b3e1ab68ca7a7a8fb421d479cd918f5` returned HTTP 200. Only the replacement's ready tracking row remained.
- Replacement played in the actual local guest app at 640x360 with playback time advancing.
- Native removal confirmation: Cancel preserved the video; Confirm cleared the guest reference and removed upload tracking. The replacement's playback manifest subsequently returned HTTP 404. Reloaded guest app showed its existing empty-video message with no iframe.
- Re-upload after deletion succeeded. Retained final UID `b34c360eb5d7169592300d5ccf1220c2` is ready, duration stored as 3 seconds. Actual playback was 3.079645 seconds at 640x360 with advancing playback time.
- Local UI refreshes after confirmed video operations and reports failures instead of false removal success. Hosted create/status/delete functions were exercised successfully after deployment.

## Saved floor-plan connections and reception counts — completed

- Created two isolated saved-plan fixtures for this event, exercised them through the QR configuration and actual local guest app, then removed those exact fixture rows. Original uploaded ceremony/reception plan configurations were restored.
- Missing ceremony plans now produce an explanatory error without falsely publishing a saved-plan link. Read and save failures are covered; switching sources preserves the uploaded image.
- Saved ceremony seating names, bridal-party names and labels appeared in the guest app. Saved reception layout, six tables and current occupancy appeared correctly at desktop, tablet and mobile widths.
- Anonymous token access passed with no signed-in session. Disabled sharing and token rotation made the old reception link unavailable. Revocation was retested after the counts correction.
- Applied the expressly approved `reception_guest_live_counts` migration from `RECEPTION_GUEST_COUNTS_REVIEW.sql`. The token-gated RPC now supplies current table types, occupancy, occupied seats and accepted RSVP totals. Guest view uses the returned attendance count instead of a hard-coded zero.
- Temporarily accepted two existing sample guests: anonymous RPC and guest rendering showed Attending: 2 and occupancy 3/8, 2/8, 2/8, 4/8, 0/8 and 0/4. Restored both RSVP values to Pending; all 11 guests and six tables remain.
- Guest-dialog typography was overriding the authoritative reception document's headings and crowding its attendance line. Dialog theme selectors now exclude printable documents, preserving their own renderer styles.
- Actual reception PDF was generated and rendered back to PNG, inspected visually, and compared with its preview. Final meaningful pixel difference was **0.16896%**, passing the unchanged **0.25%** limit. Artifacts: temporary `ww-my-events-qa/reception-live-counts.pdf`, `reception-count-preview.png`, `reception-count-pdf.png`.

## QR generation, cleanup and final visual checks

- Actual QR image decoding found decorative dot styles could obscure required timing/alignment/format modules. The QR page now preserves those function patterns. All seven dot styles and all six border/centre marker combinations decoded to `https://weddingwaitress.com.au/qr/9YT9SI`. Other consumers of the shared generator keep their existing default behavior.
- Colour controls now enforce the existing automatic-contrast promise on foreground changes as well as background changes. White-on-white selections were corrected and decoded successfully for all four colour controls.
- QR centre-logo upload and minimum/maximum slider sizes (10 and 35) decoded successfully. Default size 25 and no centre logo restored.
- QR design writes are serialized; obsolete asynchronous renders cannot replace a newer preview. Reset/removal saves the new reference before deleting the old owned logo. Failed cleanup is retained for retry; cancelled uploads do not replace a later reset.
- Isolated rejected-save browser check confirmed the saved logo and storage file were preserved, with zero deletion requests. Retrying Reset cleared the reference and removed the retired file. Six focused persistence tests cover rejection, cleanup ordering, retry, ownership boundaries and overlapping saves.
- PNG and JPG exports both produced 512×512 images that decoded correctly. Real Copy Link click showed its success notification and the Windows clipboard matched the expected wedding URL.
- All six module visibility switches were turned off and back on; guest modules disappeared and returned after reload. Song-request limit changed from 2 to 1 and back to 2, verified in saved settings. Existing submitted sample requests were retained.
- Requested Open Live View App and all six Replace buttons now use dark-brown text, including WebKit text fill. Existing backgrounds/fonts remain. Module header controls wrap within their cards instead of extending into adjacent cards.
- Final dashboard and guest app checks at 1440, 820 and 390 pixels had no page overflow. Every visibility switch remained inside its card. Restored invitation, ceremony/reception images, menu and inherited hero loaded in the guest app.

## Deliberately not repeated

- Full guided setup was deliberately not rerun at Nader's request; its image completion path has automated coverage and uses the same browser-verified event image synchronizer.

Only the explicitly approved backend functions and database corrections were applied. No website deployment or push was performed. Styling changes are limited to the requested button contrast and fixes for overlapping controls/document theme interference. No important QR test remains blocked in this review; this is not a guarantee against every possible device or input combination. Wait for Nader's review and approval before moving to the next page.
