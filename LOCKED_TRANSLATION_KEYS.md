# 🔒 LOCKED TRANSLATION KEYS

**STATUS: PRODUCTION-LOCKED — DO NOT MODIFY without explicit owner approval.**

This document tracks translation key sets that have been reviewed and signed off
by the project owner. Future edits to these keys risk regressing previously
fixed copy and must be approved before changes are made.

When working in any locale file under `src/i18n/locales/<lang>/landing.json`,
check this list before editing.

---

## Locked key sets

| # | Key path | Locales | Locked on | Notes |
|---|----------|---------|-----------|-------|
| 1 | `blog.posts.*` (body content) | all 12 non-EN | 2026-04-17 | Full body translations |
| 2 | `products.*` (entire subtree) | all 12 non-EN | 2026-04-17 | All 13 product pages localized |
| 3 | `products.qrSeating.h1` | zh, ar, hi | 2026-04-18 | Native-script overrides for "QR Code" |
| 4 | `products.djMc.*` | all 12 non-EN | 2026-04-18 | Full DJ-MC fix incl. localized "Running Sheet" term |

## Locked code wiring

| File | What is locked | Locked on |
|------|---------------|-----------|
| `src/components/auth/AuthGatedCtaLink.tsx` | `alwaysSignUp` prop behavior | 2026-04-18 |
| `src/components/Layout/Header.tsx` | `alwaysSignUp` on getStarted CTA | 2026-04-18 |
| `src/pages/Landing.tsx` | `alwaysSignUp` on all hero/repeat/final CTAs | 2026-04-18 |
| `src/components/Layout/ProductPageLayout.tsx` | `alwaysSignUp` on primary + final CTAs | 2026-04-18 |

---

## Rules

1. **Never silently change** any value listed above.
2. If a fix is genuinely required, ask the owner first and add a row to the
   table with the new lock date.
3. When adding a new locked key set, append a row — do not rewrite history.
4. The English source (`src/i18n/locales/en/landing.json`) is the source of
   truth; non-English locked keys must stay semantically aligned with EN.
