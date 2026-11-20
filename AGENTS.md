# Protected feature baselines

## Public multilingual content contract

- Every future public frontend copy addition or change must include reviewed translations for every language offered by the shared header dropdown. This includes headings, paragraphs, navigation, buttons, form validation, placeholders, captions, meaningful image alt text and accessible labels. Keep the source and translations synchronized in the same change; missing translations are unfinished work, not an acceptable silent English fallback.
- Reuse shared header, footer and copy catalogues. Preserve the selected public language across navigation, Arabic RTL and responsive usability. Dashboards/admin remain English. Blog article bodies are intentionally excluded; the blog index/interface, header and footer remain multilingual.
- Share images without meaningful embedded text. Prefer translated HTML text outside images; otherwise provide reviewed localized assets and translated alt text. Do not translate customer-entered data or identifiers.
- Run `npm.cmd run check:public-translations` and relevant source-based translation tests for each public copy change, followed by browser review of the affected sections in the selected languages. A coverage check does not establish linguistic accuracy or full visual correctness.
- These requirements are a development contract, not runtime automatic translation. Do not introduce paid external translation services without explicit approval. Do not change deployment authorization.

## Preview–Print–PDF mirror contract

All printable document work must follow [docs/PRINT_PDF_MIRROR_CONTRACT.md](docs/PRINT_PDF_MIRROR_CONTRACT.md). A preview, browser print, and PDF must use one authoritative renderer and intrinsic geometry. Export-only code may neutralise external preview presentation, but must not alter document content or layout. Every printable change requires a rendered-PDF comparison; passing unit tests alone is not sufficient.

## Individual Table Charts

Treat the Individual Table Charts feature as an approved, protected baseline.

- Do not change its visual output or behaviour unless a future user prompt explicitly requests changes to this feature.
- Protected behaviour includes its exact A4 dimensions, browser-preview/PDF parity, Round/Square/Long Table layouts, seat distribution and geometry, typography, colours, footer, export controls, and PC/tablet/mobile rendering.
- Any change to shared A4, print, PDF-generation, or export code must preserve the Individual Table Charts page exactly.
- After any authorized change that could affect this feature, run its focused regression suite with `npx.cmd vitest run src/lib/individualTableChartA4.test.tsx` and keep the suite passing.

## Run Sheet shared-view consistency
- Changes to the main Run Sheet's schedule content, row controls, styling, and responsive layout must also be reflected in the shared Run Sheet. Reuse the shared components and theme; verify both views for applicable changes.
- Preserve recipient permissions: view-only links must remain read-only, and account navigation, event selection, and share management remain owner-only.


## Approved Run Sheet template
- Preserve the approved 13-row schedule in src/lib/runningSheetDefaults.ts as the single default for new Run Sheets and confirmed owner/shared resets. Keep its times, rich event descriptions, responsibilities, and row order unless the user requests a template change.
- Shared links display the same saved schedule. Do not replace customized schedules or intentionally blank rows with defaults on page load.


## Approved DJ and MC Questionnaire defaults
- The owner locked all nine section templates in `src/lib/djMCQuestionnaireTemplates.ts` as the approved default baseline on 8 September 2026. Preserve their labels, order, row labels, row counts, and field capabilities unless the owner explicitly requests a default-template change.
- The sections are Ceremony Music, Cocktail Hour Music, Bridal Party Introductions, Speeches, Main Events Songs, Background Dinner Music, Dance Music, Traditional/Multicultural Music, and Do Not Play List.
- Event-specific editing or deletion must never alter these source templates. Restore a missing default section from its template only when requested, without resetting other sections or guest submissions.
- Guest Song Requests is a separate guest-submission section; preserve its availability and do not treat submitted requests as default sample data.
- This baseline is not a backup of edited event data and does not guarantee Undo recovery. Do not describe it as such. Do not automatically repopulate intentionally deleted sections on fetch.

## Approved green action-button reference
- On 8 September 2026, the owner selected the DJ & MC Questionnaire top Export Controls buttons as the reference for future green Share, Save, Download, and similar action-button styling. Apply page by page when requested; this note does not authorise a site-wide restyle.
- Pill shape (fully rounded ends / rounded-full), minimum height 40px, automatic height for wrapped labels, padding 10px vertically and 16px horizontally; preserve responsive usability.
- Embossed green background: linear-gradient(180deg, #7bd880, #55a447); no border. Existing surface emboss/shadow: inset 0 1px 0 #ffffff80, inset 0 -2px 0 #37652d66, 0 4px 10px #426a2a30.
- Left icon: dark espresso #2f1b14, 16px, stroke width 1.8, NO icon drop shadow.
- Wording to its right: white, Manrope 14px semibold (600), text shadow 0 1px 2px rgba(0,0,0,.55). The label shadow must not be applied as a filter to the entire button or icon.
- Reference implementation: src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnairePage.tsx and DJMCQuestionnaireTheme.module.css. Current export hover brightens slightly (brightness 1.04); separate Add Bottom Row hover is darker and must not be confused with this export reference.

## Popup form action order
- Owner approved on 8 September 2026: primary green Save/Create/confirm action goes to the left of Cancel in popup forms, matching Edit Event. On stacked mobile layouts keep primary before Cancel. Apply consistently when updating popup forms; preserve any separate destructive actions and existing behavior.

## Reset to Default button reference
- Owner approved: embossed red gradient #f85b53 to #d9342c, no border, white wording with text-only shadow 0 1px 2px rgba(0,0,0,.55), espresso #2f1b14 reset icon without shadow. Preserve current widths. Apply to Reset to Default controls page by page when requested.

## Export Controls heading reference
- Owner approved Event Budget as the reference across existing Export Controls panels on 8 September 2026: Manrope 14px semibold, 21px line height, espresso #2f1b14 text, left 16px printer icon in #806344, 6px icon gap, and 12px panel padding on every side.
- Use src/styles/exportControlsReference.css and the data-export-controls-heading / data-export-controls-panel attributes. Remove visible explanatory subheadings from these panels; preserve functional progress/error feedback and accessible descriptions.
- Budget's Print Budget and Download PDF buttons sit side by side in that order below its heading. Other action layouts remain page-specific.

## Public blog prose and CTA consistency
- Owner requested on 22 October 2026: avoid dash punctuation and hyphenated prose throughout the blog listing and article copy. Preserve slugs, URLs, dates and technical identifiers. Use cleanBlogPost/cleanBlogProse in the shared blog content path so future posts follow the same presentation rule.
- Every article planning CTA uses the shared embossed espresso gradient/shadow, white wording and a thin white outline through ww-blog-cta-button. Preserve its signup action.

## Automatic encrypted GitHub backup

- Keep Wedding Waitress work in either registered project folder or an associated Git worktree. The installed watcher covers `E:/Website Projects/wedding-waitress` and `E:/ChatGPT/wedding-waitress`; registered worktrees are discovered automatically. Cloud edits already committed to GitHub are online; unsaved editor buffers and edits outside covered roots are not captured.
- The owner authorizes routine automatic encrypted backups without repeated prompting. The watcher batches filesystem events for approximately two seconds, queues immutable encrypted checkpoints, uploads to the private `Wedding-Waitress/wedding-waitress-private-backup` GitHub releases, verifies remote SHA-256 bytes, retries failures and resumes at Windows sign-in. It never deploys production.
- Before reporting a change complete, check `E:/ChatGPT/wedding-waitress/backup-review-20261111/automatic-backup/STATUS.json`: the relevant checkpoint must be remotely verified, with no pending checkpoint or unresolved capture/upload failure for that change. Do not silently disable or bypass the watcher. Report actual failures and leave preserved queued checkpoints intact.
- Dependencies, runtime/browser caches, Git internals, generated backup/test directories and transient logs are excluded. Private project configuration and newly eligible project files are encrypted, not committed in plaintext. Never put the recovery private key, credentials or customer data into Git/logs/chat. Do not change original ACLs or delete original working files as part of backup.
- The owner specifically approved a one-time current-account read/list/traverse rule for `supabase/.temp/email-release-private` and inherited read-only access to future children. It was applied and verified on 11 November 2026: ownership, group, other users’ access rules and inheritance protection were preserved; an ordinary-user canary was automatically recovered from GitHub and cleaned by versioned deletion. The watcher remains unelevated and write/delete permission was not granted. This completed exception does not authorize any further ACL changes.
- GitHub remains the central source/history/recovery location. Commit reviewed code through normal history-preserving Git operations; retain uncommitted work. Backup upload is not permission to merge, force-push, publish to Netlify, change Supabase, rotate credentials or enable automatic production deployment.
- The watcher requires this PC to be running and signed in; offline edits remain queued until connectivity/credentials recover. Backup only confirms saved eligible files, not unsaved editor contents or continuously changing provider database/storage state. Do not describe it as literally instantaneous, online-only development, or an unqualified full-system restore guarantee.


## T7-only Wedding Waitress storage (owner instruction, 20 November 2026)

- Keep all Wedding Waitress project work on the NTFS Samsung T7, currently E:. Canonical application source: E:/Website Projects/wedding-waitress. Review/workspace material: E:/ChatGPT/wedding-waitress. Existing dated Codex projects: E:/Codex.
- Create and change project files, Git worktrees, builds, downloads for project tasks, browser outputs, dependency caches and temporary project material only on this T7. Use an explicit E: working directory for shell commands. Never recreate the removed C: project folders or use C: junctions or fallback copies.
- If the T7 is missing, disconnected, write-protected, not labelled T7, or not NTFS, stop project work and report the problem. Do not fall back to C:.
- For project commands that need temporary/cache paths, use E:/ChatGPT/wedding-waitress/backup-review-20261111/runtime-cache and set process-local TEMP, TMP and npm/browser cache variables there. Do not redirect unrelated Windows applications globally.
- The automatic encrypted backup runtime and STATUS.json are in E:/ChatGPT/wedding-waitress/backup-review-20261111/automatic-backup. Confirm the relevant checkpoint is remotely SHA-256 verified, pending checkpoints are zero and capture/upload errors are resolved before reporting a saved project change complete.
- Leave C:/Users/User__/Documents/3. Wedding Waitress and all Downloads contents untouched unless separately requested. Ordinary installed application files and operating-system data on C: are outside the project-storage rule.


## Approved release and T7 cleanup sequence (owner instruction, 20 November 2026)

- Obtain explicit user approval for the release scope before production publication. Approval already given for a named release remains valid; do not request it again for that same scope.
- Save and push the approved changes to GitHub, deploy/publish the approved scope live, and verify the live result before removing disposable local project material.
- Before reporting a saved/released change complete or cleaning its temporary outputs, verify the relevant automatic encrypted backup checkpoint remotely by SHA-256, with zero pending checkpoints and no unresolved capture/upload errors. Verify backup state again after cleanup.
- Only after those steps, remove identified session-generated build/QA/temp outputs and unused caches from the T7 when no longer needed. Verify each absolute cleanup target is inside the intended T7 project/review workspace before recursive removal; preserve shared or active runtime caches.
- Preserve canonical source, Git history/configuration, dependencies and runtime needed for development, automatic-backup runtime/STATUS, recovery and backup artifacts, approved reference assets and unrelated user files. A GitHub push never authorizes deleting the local project or backup/recovery material.
- Work stays local until release approval. Do not silently include unrelated changes or deferred features in a release. Report the release commit/deploy, live checks, cleanup scope and space reclaimed.
