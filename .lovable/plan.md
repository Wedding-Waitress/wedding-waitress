
## Goal
Increase the "Used by real couples..." microcopy under each pricing card from `text-[10px]` to `text-xs` (12px) for better mobile readability.

## Change
- **File:** `src/pages/Landing.tsx`
- **Edit:** Replace every `text-[10px]` occurrence in the Pricing section with `text-xs`. All other classes (`text-gray-400 text-center mt-1`) untouched.

## Out of scope
Copy, translation keys, other text sizes, other sections.

## Verification
1. Mobile (375px): the microcopy under each pricing card is legibly sized at 12px.
2. Desktop: minor visual change only, layout unaffected.
