
## Goal
Three small, independent fixes — no other changes:

1. **QR Seating hero heading**: still contains the Latin fragment "QR Code" (or "QR") in non-English `products.qrSeating.h1` — replace with the native-script equivalent in each language.
2. **"Start Planning Free"** header button: when clicked it currently goes straight to `/dashboard` for logged-in users. Make it ALWAYS open the Create Account (SignUp) modal regardless of auth state.
3. **"Start Planning Your Event"** buttons (used in Landing hero, Landing repeat sections, all 13 product pages, NotFound, etc.): same change — ALWAYS open the SignUp modal instead of routing to `/dashboard`.

## Findings

### Issue 1 — `products.qrSeating.h1`
Current values still embed Latin "QR" or "QR Code":
- zh: `您的婚礼专属 QR 码座位表` → user sees "QR Code" in screenshot (likely older cache, but to fully localize will use `二维码` which is the standard Chinese term — matches sidebar nav already using `二维码座位表`).
- ja: `QRコード座席表` (already native — keep).
- ar: `مخطط الجلوس برمز QR` → replace `QR` with `كيو آر` or keep brand-style; using fully native `رمز الاستجابة السريعة` is too long — keep `QR` since Arabic commonly uses Latin "QR". User wants it changed → use `مخطط الجلوس برمز كيو آر`.
- hi: `QR कोड` → `क्यूआर कोड` (native Devanagari).
- de/es/fr/it/nl/tr/vi/el: "QR" is universally used as-is in these Latin/Greek-script languages and is not "English" — these read naturally. But user explicitly asked for it changed on the QR page, so for el: `Κωδικό QR` is already mixed; will keep "QR" in Latin-script langs (de, es, fr, it, nl, tr, vi) and Greek (el) since "QR" is the international standard term used natively in those languages — same convention as "PDF", "USB". Will only change zh, ja, ar, hi where a native-script equivalent exists and is in common use.

Final mapping for `products.qrSeating.h1`:
| lang | new h1 |
|---|---|
| zh | `您的婚礼专属二维码座位表` |
| ja | `あなたのウェディングのためのQRコード座席表` (unchanged — already native katakana+kanji) |
| ar | `مخطط الجلوس برمز كيو آر لحفل زفافك` |
| hi | `आपकी शादी के लिए क्यूआर कोड सीटिंग चार्ट` |
| de, es, fr, it, nl, tr, vi, el | unchanged ("QR" is the native term in these languages) |

### Issue 2 & 3 — CTA buttons go to dashboard for logged-in users
`AuthGatedCtaLink` (`src/components/auth/AuthGatedCtaLink.tsx`) currently:
- If session exists → `navigate(to)` (goes to /dashboard).
- If no session → opens SignUpModal.

User wants the SignUpModal to open **always** for these two CTAs.

Approach: Add a new opt-in prop `alwaysSignUp?: boolean` to `AuthGatedCtaLink`. When true, skip the auth check and always trigger the hidden SignUpModal. Default `false` preserves existing behavior everywhere else (so we don't accidentally break other flows).

Apply `alwaysSignUp` to:
- **Header.tsx** line 166 — the "Start Planning Free" / `nav.getStarted` button.
- **Landing.tsx** lines 162, 520, 551, 578, 607, 841 — every "Start Planning Your Event" / hero / final CTA button.
- **ProductPageLayout.tsx** lines 123, 140, 216 — primary CTA + final CTA on every product page (these render the "Start Planning Your Event" button).

Do **NOT** touch:
- `NotFound.tsx` (different button "Go to Dashboard").
- Any other links to `/dashboard`.

## Files to modify
1. `src/components/auth/AuthGatedCtaLink.tsx` — add `alwaysSignUp` prop, when true short-circuit to open SignUpModal.
2. `src/components/Layout/Header.tsx` — pass `alwaysSignUp` to the getStarted CTA.
3. `src/pages/Landing.tsx` — pass `alwaysSignUp` to all 6 AuthGatedCtaLink usages.
4. `src/components/Layout/ProductPageLayout.tsx` — pass `alwaysSignUp` to all 3 AuthGatedCtaLink usages.
5. `src/i18n/locales/{zh,ar,hi}/landing.json` — update `products.qrSeating.h1` only.

## Out of scope
- English file.
- ja, de, es, fr, it, nl, tr, vi, el (already native).
- NotFound page CTA.
- Any other code, layout, or text.

## Verification
- Click "Start Planning Free" in header (logged in or out) → SignUp modal opens.
- Click "Start Planning Your Event" on Landing hero, every product page, and final CTA → SignUp modal opens.
- Switch to ZH/AR/HI → `/products/qr-code-seating-chart` → hero shows fully native heading.
- Existing English copy unchanged.
