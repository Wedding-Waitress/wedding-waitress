
## Goal
Replace the entire content of `/contact` (Company Details, ABN, "How Can We Help?" list, current form card) with a single section that is a pixel-match of the homepage "Get in Touch" form. Keep existing email wiring to `support@weddingwaitress.com` intact. Lock the new file.

## Findings
- Homepage "Get in Touch" lives in `src/pages/Landing.tsx` ~lines 761-820. Style signature: centered `h2` (`text-3xl sm:text-4xl md:text-5xl`), gray-500 subtitle, white card `rounded-[20px] p-8 md:p-10 shadow-[0_4px_30px_rgba(0,0,0,0.08)]`, inputs with `rounded-xl border border-gray-200 bg-[#FAFAFA]`, primary button `rounded-xl bg-primary text-white py-3`.
- Translation keys already exist under `landing.json → contact.*` (title, subtitle, name, email, message, placeholders, sendButton, sending, sent) — reuse them so labels match the homepage 1:1 across all locales.
- Existing `Contact.tsx` has working `send-transactional-email` invocation with the `contact-form-message` template → keep that handler unchanged (only swap the JSX).
- Existing header (logo + Back to Home), SeoHead, and footer on Contact.tsx must remain (the request only targets the *body* "Contact Us section" — header/footer chrome is shared site nav, not the contact section).

## Plan

### 1. Rewrite `src/pages/Contact.tsx` body
- Keep: lock comment header, imports, zod schema, submit handler (unchanged email wiring), SeoHead, top `<header>`, footer.
- Remove: Card wrapper, title block, Company Details box, Email Support box, "How Can We Help?" box, existing form card, bottom CTA "Back to Home" button.
- Replace `<main>` content with a single section mirroring Landing.tsx ~761-820:
  - `<section className="py-20 px-6 bg-white">` (matches homepage section bg)
  - `<div className="max-w-2xl mx-auto">`
  - Centered h2 + subtitle using `t('contact.title')` and `t('contact.subtitle')` (add `useTranslation` from `react-i18next`)
  - Form with identical classNames to homepage: white card, rounded-[20px], shadow, FAFAFA inputs, primary button.
  - Wire to existing `name`/`email`/`message` state and `handleSubmit`.
  - Keep zod inline validation error text below each field (subtle, doesn't disturb layout — small `text-xs text-destructive mt-1`).
  - Button label uses `t('contact.sending')` while submitting, otherwise `t('contact.sendButton')` + `<Send>` icon — exactly like Landing.

### 2. Translations
- No new keys needed — `contact.*` already exists in `en/landing.json`. Other locale files mirror this structure (they were created together). Use `useTranslation('landing')` so all 16 languages work automatically.

### 3. Email wiring
- Untouched. Same `supabase.functions.invoke('send-transactional-email', ...)` with `templateName: 'contact-form-message'` → still goes to `support@weddingwaitress.com`.
- Same success toast: "Thank you, your message has been sent. We will reply within 24 hours."

### 4. Lock
- Update lock comment header on `Contact.tsx` to note the redesign date (2026-04-18).
- Append entry in `LOCKED_TRANSLATION_KEYS.md` for the redesigned Contact page.

## Files modified
- `src/pages/Contact.tsx` — body replaced with homepage-style form; header/footer/SeoHead/handler preserved.
- `LOCKED_TRANSLATION_KEYS.md` — add 2026-04-18 redesign lock note.

## Out of scope
- Homepage "Get in Touch" section (already locked, untouched).
- Footer "Contact Us" link target — already points to `/contact`, no change needed.
- Email template, edge function, registry — all untouched.
- Any other page.

## Verification
1. `/contact` shows ONLY: site header → centered "Get in Touch" heading + subtitle → white form card identical to homepage → footer.
2. No Company Details, no ABN, no "How Can We Help?" list, no extra CTA button.
3. Submit valid form → success toast → email arrives at support@weddingwaitress.com.
4. Mobile 375px → form card fits with proper padding, button full width, identical to homepage mobile.
5. Switch language (e.g., FR) → labels translate via existing `landing.json contact.*` keys.
