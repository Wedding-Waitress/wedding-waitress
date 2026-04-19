
## Goal
Remove `whitespace-nowrap` from the "How It Works" subtitle paragraph so it wraps naturally on mobile.

## Investigation needed
Locate the exact element in `src/pages/Landing.tsx` (the homepage). The "How It Works" section subtitle currently has `whitespace-nowrap` forcing it onto one line, which causes horizontal overflow on small screens.

## Change
- **File:** `src/pages/Landing.tsx`
- **Edit:** In the "How It Works" section's subtitle `<p>`, remove only the `whitespace-nowrap` class. Keep all other classes (font, size, color, spacing, alignment) untouched.

## Out of scope
- No other text, classes, sections, or files changed.
- Locked public-surface rules: this is a class-only fix to restore proper mobile wrapping (a bug fix, not a copy/layout redesign), affecting only the offending utility.

## Verification
1. Desktop (≥1024px): subtitle visually unchanged.
2. Mobile (375px): subtitle wraps across multiple lines, no horizontal scroll.
3. No other section affected.
