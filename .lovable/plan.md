
## Goal
Add a working contact form to `/contact` that emails `support@weddingwaitress.com` with Name / Email / Message, shows the success toast, and does NOT change the existing UI/layout of the page or anything else in the app.

## Findings
- `src/pages/Contact.tsx` is **PRODUCTION-LOCKED** but currently has NO form — only static contact info cards. User is asking to add functionality, which by definition requires touching the locked file. This is in scope of their explicit request.
- Email infra is already set up (`notify.weddingwaitress.com`, `send-transactional-email` deployed, registry exists with welcome / admin-new-signup / admin-new-payment templates).
- Per transactional-email rules: contact form confirmation is a valid transactional use case. But user wants the email to go to **admin** (`support@weddingwaitress.com`) containing the visitor's details — this is "contact form notification to site owner", also valid transactional (1:1, triggered by specific user action).
- User did NOT ask for a confirmation email back to the submitter — only an in-page toast. So we send ONE email: to support.

## Plan

### 1. New transactional template
File: `supabase/functions/_shared/transactional-email-templates/contact-form-message.tsx`
- Subject: `New contact message from {name}`
- Body (brand styled, white bg, brown #967A59 accents, Inter): Name, Email (as mailto link), Message (preserve line breaks), submitted timestamp.
- Props: `{ name, email, message, date }`.

Update `registry.ts` — add import + `'contact-form-message'` entry. Keep all existing entries untouched.

### 2. Contact page form (minimal addition, no layout change to existing cards)
File: `src/pages/Contact.tsx`
- Add a new `<Card>` BELOW the existing "How Can We Help?" block (and above the CTA button) containing:
  - Heading "Send us a message"
  - Name input, Email input, Message textarea
  - Submit button (uses existing `Button` primitive, brown brand styling consistent with site)
- Validation with zod: name 1–100, email valid 1–255, message 1–2000, all `.trim()`.
- On submit:
  ```ts
  await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'contact-form-message',
      recipientEmail: 'support@weddingwaitress.com',
      idempotencyKey: `contact-${crypto.randomUUID()}`,
      templateData: { name, email, message, date: new Date().toISOString() },
    },
  });
  ```
- Wrap in try/catch. On success: toast "Thank you, your message has been sent. We will reply within 24 hours." + reset form.
- On failure: error toast, log to console. Form state remains so user can retry.
- Loading state on button (disabled + "Sending…").
- Fully responsive: stacks on mobile (already inside `max-w-4xl` container with px padding).

**No other change to Contact.tsx** — header, contact info grid, "How Can We Help?", footer, SEO, lock comment all preserved.

### 3. Lock
- Update the existing lock comment header on `Contact.tsx` to reflect the form addition is now part of the locked surface.
- Append to `LOCKED_TRANSLATION_KEYS.md`:
  - New row in "Locked transactional emails" section listing `contact-form-message.tsx` template.
  - New row noting the Contact form wiring on `src/pages/Contact.tsx` is locked as of 2026-04-18.
- Stamp lock comment on the new template file.

### 4. Deploy
Deploy `send-transactional-email` after registry update.

## Files modified
- `src/pages/Contact.tsx` — add form section + submit handler. NO change to existing cards, header, footer, SEO, layout.
- `supabase/functions/_shared/transactional-email-templates/registry.ts` — register new template.
- `LOCKED_TRANSLATION_KEYS.md` — log new locks.

## Files created
- `supabase/functions/_shared/transactional-email-templates/contact-form-message.tsx`

## Out of scope
- Confirmation email to submitter (not requested).
- Storing submissions in DB (not requested).
- Any change to other pages, sidebar, navigation, pricing, header.
- Any visual change to existing Contact page sections.

## Verification
1. Visit `/contact` → existing layout unchanged → new "Send us a message" card visible below help list.
2. Submit valid form → button shows "Sending…" → success toast appears → form resets.
3. Inbox at support@weddingwaitress.com receives branded email with Name / Email (clickable) / Message / timestamp.
4. Submit invalid (empty message, bad email) → inline validation errors, no send.
5. Mobile 375px → form stacks, inputs full width, button full width.
6. Email service down → error toast, no crash, console logged.
