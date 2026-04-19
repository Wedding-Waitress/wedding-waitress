
## Goal
On the public homepage:
1. Delete the entire "Explore the Platform" section (heading, subtitle, 13 icon link cards).
2. Update the existing 13 image cards in "The wedding platform your guests will love." section with the exact new titles and descriptions provided.
3. Keep all images, links, order, layout, and surrounding sections untouched.
4. Lock the change.

## Card mapping (lower image cards → new copy)
The lower section renders `featureCards` in this order (from `featureCards` array, current order in code):
1. `guestList` → My Events? NO. Need to verify order. Code shows `featureCards.map((card)…)` — need to check actual order.

I'll match by feature key (the link target is the source of truth; titles are copy only):

| key | Route | New Title | New Description |
|---|---|---|---|
| myEvents | /products/my-events | My Events | Manage all your events in one place. |
| guestList | /products/guest-list | Manage Your Guest List Easily | Track RSVPs, organise guests, and send invitations in seconds. |
| tables | /products/tables | Plan Your Tables | Create tables, set guest limits, and organise your layout. |
| qr | /products/qr-code-seating-chart | QR Code Seating Chart | Let guests scan and find their seat instantly. |
| invitations | /products/invitations-cards | Send Digital Invitations | Create and send beautiful invites via SMS or email. |
| placeCards | /products/name-place-cards | Name Place Cards | Organise seating with clean and elegant place cards. |
| tableCharts | /products/individual-table-charts | Individual Table Charts | Print elegant per-table seating charts for every table. |
| floorPlan | /products/floor-plan | Wedding Floor Plan Tool | Design your ceremony and reception venue layout visually. |
| dietary | /products/dietary-requirements | Dietary Requirements | Track every guest's meal and dietary needs in one place. |
| seatingChart | /products/full-seating-chart | Full Seating Chart | Generate a complete printable master seating chart. |
| kiosk | /products/kiosk-live-view | Kiosk Live View | Let guests find their seat instantly at the venue. |
| djmc | /products/dj-mc-questionnaire | DJ & MC Questionnaire | Brief your DJ and MC with a structured digital form. |
| runningSheet | /products/running-sheet | Wedding Running Sheet Planner | Build and share a minute-by-minute wedding day timeline. |

Card order in the JSX array stays as currently coded — only text changes. Section heading and subtitle are kept verbatim.

## Files to change

1. **`src/pages/Landing.tsx`** — delete lines 401–443 (entire "Explore the Platform" `<section>` block including comment). No other JSX edits.

2. **`src/i18n/locales/en/landing.json`** — update the 13 entries inside `featureCards.*` with the new title/desc strings above. Leave `sectionTitle` and `sectionSubtitle` unchanged. Optionally remove the now-unused `explore` block (lines ~613+) to keep the locale clean.

3. **Other 16 locale files** (`{ar,de,el,es,fr,hi,it,ja,nl,tr,vi,zh}/landing.json`) — update the same `featureCards.*` title/desc keys with translated equivalents of the new copy so non-English visitors see the upgraded copy too. (If you'd rather leave non-English unchanged for now and translate later, say the word — but the keys won't visually drift since the structure is identical.)

4. **`LOCKED_TRANSLATION_KEYS.md`** — append a 2026-04-19 entry locking: (a) removal of "Explore the Platform" section from `Landing.tsx`, (b) the new `featureCards.*` titles/descriptions across all locales.

5. **Memory `mem://standards/locked-translations.md`** — refresh date and note the new lock entry.

## Out of scope
Header, footer, hero, How It Works, alternating sections, pricing, FAQ, CTA, contact form, all other pages, all backend logic, SEO, fonts, colors, spacing outside this section.

## Verification
1. Homepage: "Explore the Platform" section is fully gone (no heading, no subtitle, no 13 icon cards, no extra whitespace gap).
2. Lower image-card section "The wedding platform your guests will love." still renders with all 13 image thumbnails, original layout, original order, original links.
3. Each image card shows the new title + description from the table above.
4. Clicking each card lands on its existing `/products/*` page.
5. Mobile (375px), tablet, desktop layouts all render cleanly with no clipped or overflowing titles.
6. Language switcher: EN shows new copy; other locales show updated translated copy.
7. No other page or component changed.

## Question before I proceed
Should I translate the new copy into the other 12 non-English locales (recommended), or only update English and leave other languages with their current `featureCards` strings until you provide translations?
