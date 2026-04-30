## Root cause (why nothing visibly changed)

The mobile dropdown Sign In / Sign Up buttons are styled correctly in `src/components/Layout/Header.tsx` (line 225) — `paddingTop/Bottom: 1px`, `lineHeight: 14px`. The computed pill height should be ~18–20px.

But `src/index.css` lines 868–882 contains a **global mobile rule**:

```css
@media (max-width: 639px) {
  button, a, [role="button"], select, input, textarea {
    min-height: 48px;
  }
}
```

This rule forces every `<button>` on mobile to be at least 48px tall — and it wins over my inline `padding`/`line-height` because `min-height` is a separate property, not overridden by padding. That's why each iteration "looked the same" to you no matter what padding I reduced.

This rule comes from the "MOBILE PERF/UX" project memory ("min 44px touch targets"). I can't remove the global rule (it protects every other button in the app), so the fix is a **scoped opt-out** for just these two pills.

## Fix

In `src/components/Layout/Header.tsx`, add `min-height: 0 !important` (and an explicit `height`) to the `pillStyle` object so these two buttons escape the 48px floor:

```ts
const pillStyle: React.CSSProperties = {
  color: '#967A59',
  borderColor: '#967A59',
  fontSize: '13px',
  fontWeight: 500,
  lineHeight: '14px',
  paddingTop: '2px',
  paddingBottom: '2px',
  minHeight: '0',     // escape the global 48px floor
  height: '22px',     // pill total height = 22px
};
```

Because React inline `style` can't emit `!important`, I'll also add a tiny scoped CSS rule in `src/index.css` right under the global block:

```css
/* Override 48px touch-floor for the mobile header auth pills only */
@media (max-width: 639px) {
  .mobile-auth-pill {
    min-height: 0 !important;
    height: 22px !important;
  }
}
```

…and add `className="mobile-auth-pill ..."` to both pill `<button>` elements.

## Scope guard

- Only `src/index.css` (one new rule, ~5 lines, appended near the existing global block) and `src/components/Layout/Header.tsx` (pillStyle + className on two buttons inside the `lg:hidden` block) are touched.
- Desktop header, all other mobile buttons, locked dashboard / public pages — untouched.
- Global 48px touch target rule remains in force everywhere else.

## Verify

After the change I will reload the preview at 390px width with hard cache bypass, open the menu, and confirm the two pills render at exactly 22px tall with the brown border, fully rounded, text centered.