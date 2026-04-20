

## Goal
Create ONE shared `ContactForm` component used by both the homepage (`Landing.tsx`) and the standalone `Contact.tsx` page, with the requested field updates: rename "Name"→"Full Name", change email placeholder to `username@example.com`, add a new "Type of Event" field under Email, keep Message unchanged. Then lock it.

## Investigation summary
- **Homepage form**: `src/pages/Landing.tsx` lines 747–812 — inline JSX, `<form onSubmit={handleContactSubmit}>` with state `contactForm` (name/email/message), wired to send-transactional-email via existing handler.
- **Contact page form**: `src/pages/Contact.tsx` (locked file) — its own inline form with own handler, also calling `send-transactional-email` template `contact-form-message` to `support@weddingwaitress.com`.
- **i18n**: `landing.json` → `contact.*` keys provide labels/placeholders; mirrored across all locale files.
- **Styling to preserve exactly**: `bg-white rounded-[20px] p-5 sm:p-8 md:p-10 shadow-[...]`, inputs `w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FAFAFA] text-gray-900 text-sm focus:ring-primary/30...`, button unchanged.

## Changes

### 1. New shared component — `src/components/ContactForm.tsx`
- Self-contained: owns its own state (`fullName`, `email`, `eventType`, `message`), zod validation, submit handler that calls `supabase.functions.invoke('send-transactional-email', { templateName: 'contact-form-message', recipientEmail: 'support@weddingwaitress.com', templateData: { name, email, eventType, message, date } })`.
- Renders the exact card markup currently used (white card, same padding/shadow, same input classes, same Button with Send icon).
- Field order: Full Name → Email → Type of Event → Message → Submit button.
- Uses i18n keys `contact.fullName`, `contact.email`, `contact.emailPlaceholder`, `contact.eventType`, `contact.eventTypePlaceholder`, `contact.message`, `contact.messagePlaceholder`, `contact.sendButton`, `contact.sending`, `contact.sent`.
- Header lock comment: `🔒 SHARED CONTACT FORM — single source of truth for homepage + /contact. DO NOT MODIFY without explicit owner approval.`

### 2. `src/pages/Landing.tsx`
- Replace lines 756–810 (the inline `<form>...</form>`) with `<ContactForm />`.
- Remove now-unused `contactForm`, `setContactForm`, `contactSending`, `contactSent`, `handleContactSubmit` state/handler (and the `Send` import if no longer used elsewhere — verify first).
- Heading + subtitle (`contact.title`, `contact.subtitle`) untouched.

### 3. `src/pages/Contact.tsx`
- Remove the file's inline form (the `<form onSubmit={handleSubmit}>...</form>` block) and replace with `<ContactForm />`.
- Remove now-unused state (`name`, `email`, `message`, `errors`, `submitting`, `handleSubmit`, `contactSchema` import) and unused imports (`useState`, `z`, `supabase`, `toast`, `Send`).
- Heading, subtitle, header, footer untouched.
- Update the file's lock header comment to note: "Body uses shared `ContactForm` component (locked 2026-04-20)."

### 4. i18n updates — `src/i18n/locales/en/landing.json`
Inside `"contact"` block:
- Add `"fullName": "Full Name"`
- Change `"emailPlaceholder"` from `"you@example.com"` → `"username@example.com"`
- Add `"eventType": "Type of Event"`
- Add `"eventTypePlaceholder": "Wedding, Engagement, Birthday, etc."`
- Keep `name`, `namePlaceholder` keys (back-compat / no removal needed; harmless).

For the other 14 locale files (de, es, fr, it, nl, ar, el, hi, ja, tr, vi, zh), add the same 3 new keys and update `emailPlaceholder` to `username@example.com` (which is already locale-neutral). Use locale-appropriate translations for `fullName` and `eventType`/`eventTypePlaceholder` (standard dictionary translations).

### 5. Lock
- Add `mem://standards/locked-translations.md` entry: "Shared `ContactForm` component (`src/components/ContactForm.tsx`) is the single source of truth for both the homepage Get-in-Touch section and `/contact`. Field order, labels, placeholders, validation, styling, and submit wiring are LOCKED. Any change requires explicit owner approval."
- Update `mem://index.md` Core line covering locked public surface to add: "Shared ContactForm (`src/components/ContactForm.tsx`) locked 2026-04-20 — used by Landing + Contact."
- Append a "Shared Contact Form (LOCKED)" section to `LOCKED_TRANSLATION_KEYS.md`.
- File-level header comment in `ContactForm.tsx` (see §1).

## Out of scope
Heading/subtitle copy, button styling, success toast wording, Contact.tsx header/footer, send-transactional-email function, all other sections of the site.

## Verification
1. Homepage Get-in-Touch section: 4 fields in order Full Name / Email (placeholder `username@example.com`) / Type of Event (placeholder `Wedding, Engagement, Birthday, etc.`) / Message — visually identical card/spacing/colors/button to before.
2. `/contact` page: same 4-field form, identical styling.
3. Submit on either page sends email to `support@weddingwaitress.com` containing all 4 fields including event type.
4. Validation errors render inline; button disabled while sending; success toast appears.
5. Editing `ContactForm.tsx` updates both pages simultaneously (proves single source of truth).
6. No regressions to other Landing/Contact sections.

