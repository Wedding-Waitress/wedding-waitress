# Name Place Cards QA — 5 September 2026

Scope: `http://localhost:8080/dashboard?tab=place-cards`. Existing work and card dimensions preserved. No push, deploy or migration.

## Changes

- Matched the approved designer treatment: transparent heading, borderless inactive tabs, embossed green active tab/upload/reset controls, white control icons and a warm brown Template Library button. Canva is unchanged.
- New uploads and library selections reset image opacity to 100%. Fixed zero opacity and zero image-position values being replaced with defaults. The user's existing front artwork is now saved at full opacity.
- Replaced the permanent hidden print collection with one authoritative 210 × 297 mm visible sheet. PDF export uses its reference at 300 DPI, includes the QR exactly once, waits for assets and restores the selected page after all-page capture or an error. Single-page export uses the selected page. Browser print uses the same sheet without editor controls.
- Prevented QR/message overlap by placing the back-of-card message in the largest clear area beside the QR.
- Serialized settings saves to prevent duplicate initial rows and out-of-order writes. Failed saves roll back the preview and cannot report QR success merely because database columns are unavailable. Reset/upload/template/message success notifications now respect save failure.
- Added an empty-table state and reset pagination when switching tables. Individual-message drafts synchronize with saved message changes.

## Verification

- Desktop 1920 × 1080, tablet 820 × 1180 and mobile 390 × 844: no page overflow; all five tabs available; intrinsic paper width stays 793.688 CSS pixels (210 mm).
- Live controls: font search/selection, name and table-information font sizes, text style, master text drag/save, all five background modes, both white text-background switches, image upload, zero/100% opacity and zero/50% horizontal positioning, mass and individual message save/reset, guest search, library opening, QR add/remove/move/reset/copy, PNG download and Open-button target.
- Invalid non-image and >5 MB uploads rejected before upload.
- Actual single/all PDF files downloaded (783,036 bytes each for the current one-page table). QR PNG downloaded (10,675 bytes).
- Five two-page fixtures: front, back, full, decorative and plain backgrounds. All rendered-PDF comparisons passed the unmodified 0.25% tolerance; worst measured difference 0.0635%. Actual downloaded PDF versus the live preview passed at 0.00374%.
- Browser print produced one A4 page and was rendered back to PNG and inspected. Rendered PDF images were visually inspected, including the corrected message/QR arrangement.
- Focused regression coverage includes single-page selection, all-page capture/restoration, failure restoration, preserved internal transforms, serialized first saves, rejected-save rollback, page lifecycle and protected Individual Table Charts.

## Test data and limits

Localhost uses `https://xytxkidpourwdbzzwcdp.supabase.co`. Live writes were confined to the explicitly authorized Wendy and Tom test event (`a5a944e6-b909-44d8-b1e8-669247fbcddb`). Its original place-card settings row is `933385a5-309f-41a1-b652-d445d0cf6f98`.

At the user's explicit approval, the existing Photo & Video Sharing setup was initialized for this event (gallery `2080c5d7-7205-4109-b482-c2034a2f5914`). The QR remains enabled for review. The only final place-card settings differences from baseline are opacity 20 → 100, QR disabled → enabled, and the update timestamp. Fonts, image URL, messages, positions and other settings are restored. The temporary QA image was removed from storage.

No shared template-library admin records were created, categorized or deleted. Physical printing, cutting, camera scanning, native operating-system share dialogs and guest uploads on the separate Photo & Video Sharing page were not tested here. Public QR link generation/copy/download was checked; the Open handler was checked without leaving this page. These are not claims of physical printer or other-page verification.

Rendered comparison artifacts and actual downloads: `%TEMP%\ww-signage-qa\place-*`, `%TEMP%\ww-signage-qa\PlaceCards-*`. Initial state: `%TEMP%\ww-place-baseline.json`; final data diff: `%TEMP%\ww-signage-qa\place-final-data-diff.json`.

Final focused run: 65 tests passed in 10 suites.
Final build passed (27.33 seconds), with only the existing Browserslist/chunk-size warnings. Generated CSS syntax warnings were eliminated. Final browser check: one authoritative sheet, opacity 1, one A4 print page, no runtime errors. Temporary browser fixture and CSS diagnostic files removed.

Auto-fit follow-up: front, back and full-card backgrounds now use contain instead of cover, preserving the entire image and its proportions. Decorative mode already used contain. Existing artwork rendered-PDF comparison passed at 0.0177% difference; 59 focused tests passed. Proportion differences may leave background space around the complete image.

Crop approval and guestbook follow-up (2026-09-05):
- Uploads, library selections and front/back/full background changes now use the Signs crop approval dialog. Cancel retains the existing artwork; approve fills the panel using the shown crop. Original gallery assets are unchanged. Approval is session-local.
- Live upload cancel/approve passed; temporary uploaded asset removed and original artwork restored. Dialog bounds checked at 1920x1080, 820x1180 and 390x844.
- Approved-crop rendered PDF comparison passed: 0.003733% different pixels; PDF image visually inspected. Artifacts: place-crop-approved-preview.png and place-crop-approved-pdf.png in the existing temporary QA directory.
- 76 focused tests passed in 12 suites, including public guestbook controls and protected Individual Table Charts.
- User confirmed scanning the printed-card QR with a real phone opens the expected app. On explicit approval, enabled the existing audio/video guestbook setting for the Wendy and Tom test event only. Read-back confirmed written and recording settings enabled; the actual public guestbook URL displayed Digital, Audio and Video message controls. No guest recording was submitted, so end-to-end microphone/camera recording and upload remain unverified.
- Requested 2 mm red inset guides remain pending the user's choice: preview only or included in PDF/print.

Guestbook repeat-message correction:
- Save submits a new message, then replaces the draft controls with Write Another Message (text) or Record Again (audio/video). Starting another draft never edits or deletes a previous submission. Name is retained.
- Failed submissions retain the draft. Save locks prevent duplicate in-flight submissions; text cannot be changed while saving.
- 13 focused guestbook/public-page tests passed, including repeat saves and failed text/audio/video submissions with simulated recording devices. Local build passed (25.89 seconds; existing Browserslist/chunk warnings).
- Actual local browser submitted two distinct QA text messages to the authorized test gallery; each hid the editor after success and offered Write Another Message. Both temporary messages were removed using their returned IDs. User's existing recordings were untouched.
- Real phone verification of the new audio/video flow remains pending: the public domain serves deployed code, and no deployment was performed. Audio/video repeat-save behavior was checked with simulated devices in automated tests.

Repeated image-fit dialog correction:
- Both approve and cancel choices are now remembered per event, image, panel type and crop position in browser-tab session storage, with an in-memory fallback. Remounting/reloading no longer asks again about the same choice. Export honours an existing uncropped choice without requesting approval again.
- Nine focused crop tests passed, including both choices across remount/export and a fresh prompt for different artwork. Browser tests confirmed zero dialogs after cancel/reload (contain) and approve/reload (cover). Build passed in 28.30 seconds with existing warnings.
