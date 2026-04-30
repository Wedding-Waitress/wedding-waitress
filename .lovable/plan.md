## Homepage mobile dropdown — final alignment & spacing fix

Scope: `src/components/Layout/Header.tsx` only, mobile dropdown (`lg:hidden` block, lines 221–318). Desktop, tablet, all other pages, and `index.css` untouched.

### Change 1 — itemStyle (line 223)

Replace the `itemStyle` const with:

```ts
const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '13px',
  fontWeight: 500,
  lineHeight: '20px',
  paddingTop: '6px',
  paddingBottom: '6px',
  margin: 0,
  minHeight: 0,
  height: '32px',
};
```

`minHeight: 0` + fixed `height: 32px` overrides the global mobile 48px floor that anchors and role=button inherit. `display: flex` + `alignItems: center` keeps text vertically centered in the fixed row so How It Works, Products, Pricing, Blog, FAQ, Contact and the expanded Products links all match exactly.

### Change 2 — Sign In / Sign Up pill row (lines 227–243)

- Container: change `flex items-center gap-2 px-1 pb-2` → `flex items-center justify-center gap-3 px-1 pb-2`.
- Both pill `<button>` elements: add `style={{ minWidth: '100px' }}`. Pill class `ww-small-pill` unchanged.

Result: pills perfectly centered, equal left/right space, slightly wider, same pill style.

### Out of scope

- No changes to `index.css`, button variants, `.ww-small-pill`, fonts, colors, or layout structure.
- No changes to desktop or tablet header.
- No changes to any other page or component.

### Verification

Open `/` at 390px width, open the mobile menu, confirm:
- Sign In / Sign Up pills are centered with equal spacing on both sides and slightly wider.
- All six menu items have identical 32px row height and identical vertical gaps.
- Desktop at 1440px is visually unchanged.