
## Status
Both fixes are already applied from earlier turns this session:
- Footer grid: already `grid grid-cols-1 gap-6 sm:grid-cols-3` ✅
- Footer link tap targets: already `block py-3` on Explore / Support / Legal `<a>` tags ✅

I'll verify this is still the case, then add a lock marker so future edits to the footer require your explicit approval.

## Verification step
Read the footer block in `src/pages/Landing.tsx` to confirm both fixes are still present. If anything has drifted, restore to:
- Container: `grid grid-cols-1 gap-6 sm:grid-cols-3`
- Each link: includes `block py-3`

## Lock the footer
1. **Code-level lock marker** — wrap the footer JSX in `src/pages/Landing.tsx` with sentinel comments:
   ```
   {/* 🔒 LOCKED FOOTER — DO NOT MODIFY without explicit owner approval. See LOCKED_TRANSLATION_KEYS.md */}
   <footer ...>
     ...
   </footer>
   {/* 🔒 END LOCKED FOOTER */}
   ```
   No visual or behavioural change — comments only.

2. **Memory lock** — append the Landing footer to the existing locked-surface rules so every future session treats it as off-limits:
   - Update `mem://index.md` Core line for the locked public surface to explicitly call out "Landing.tsx footer (grid + link padding) locked 2026-04-19".
   - Update `mem://standards/locked-translations.md` with a new "Landing footer" subsection stating: footer grid must remain `grid grid-cols-1 gap-6 sm:grid-cols-3`; each footer link must keep `block py-3`; no changes without explicit owner approval.

3. **Spec doc** — append a short "Landing Footer (LOCKED)" section to `LOCKED_TRANSLATION_KEYS.md` documenting the two locked rules and the approval requirement.

## Out of scope
Footer brand block, colors, fonts, copy, translations, link destinations, bottom bar, any other section of the site.

## Verification after changes
1. Mobile (375px): footer columns stack; each link ≥44px tall.
2. Desktop (≥640px): 3-column layout unchanged; links visually grouped per column.
3. Sentinel comments present around `<footer>` in `Landing.tsx`.
4. Memory + spec doc reflect the lock so future sessions honour it.
