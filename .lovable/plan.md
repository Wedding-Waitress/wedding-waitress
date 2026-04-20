

## Heads-up: locked surface
The homepage (`Landing.tsx`), `index.html` SEO, and `src/i18n/locales/*/landing.json` are part of the **LOCKED PUBLIC SURFACE (2026-04-18)** per project memory and `LOCKED_TRANSLATION_KEYS.md`. Your approval here counts as the explicit owner authorization required to proceed. Layout, styling, components, and CTAs stay exactly as-is — this is text-only.

## Goal
Update SEO copy, hero H1/subtitle, and ensure the four required H2s exist on the homepage. No design or layout changes.

## Changes

### 1. `src/i18n/locales/en/landing.json`
- `heroMain.title1` → `"All-In-One Wedding Seating Chart & Event Planning Tool (Australia)"`
- `heroMain.title2` → `""` (cleared so the second `<br />` line collapses; H1 stays one line as requested)
- `heroMain.subtitle` → `"Create your wedding seating chart, manage guests, and plan your entire event — all in one place."`
- Update the 4 existing section H2 keys to the required wording (these sections already exist — only the heading text changes, layout untouched):
  - `featureCards.sectionTitle` → `"Wedding Seating Chart Made Simple"`
  - `howItWorks.title` → `"QR Code Wedding Seating Chart for Guests"`
  - (Guest list section already covered by an existing alternating feature heading) → set the relevant `alternating.guestList.title` to `"Manage Your Wedding Guest List Easily"`
  - `finalCta.title1` / `title2` → `"Plan Your Wedding or Event in One Place"` / `""`

Only English (`en`) is modified — other locales remain untouched to preserve translations.

### 2. `index.html`
- `<title>` → `"Wedding Seating Chart Australia | QR Code Seating Planner | Wedding Waitress"`
- `<meta name="description">` → `"Create a wedding seating chart online with QR code access. Plan your wedding, manage guests, and organise seating easily across Australia."`
- Mirror the same values into the OG and Twitter `title`/`description` meta tags for consistency.
- Leave keywords, structured data, GA, fonts, verification tags untouched.

### 3. Keyword coverage
The new H1, subtitle, H2s, meta title, and meta description naturally include: *wedding seating chart*, *wedding seating chart Australia*, *QR code wedding seating chart*. No keyword stuffing, no new sections.

## Out of scope
- No JSX/component edits in `Landing.tsx` (the existing `<h1>`/`<h2>` tags already render these translation keys).
- No changes to other locale files, design tokens, CTAs, images, or routing.
- No edits to `SeoHead.tsx` or any locked component file.

## Verification after apply
1. Homepage hero shows the new H1 + subtitle, identical styling.
2. Browser tab title and `<meta description>` match the new SEO copy.
3. Four required H2s appear in document order on `/`.
4. No visual diff vs. previous build (spot-check hero, How it Works, Features, Final CTA).
