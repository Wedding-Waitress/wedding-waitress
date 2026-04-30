# Match Sign In / Sign Up pills to "1 Event Created" badge (Mobile only)

## Reference: exact specs of the "1 Event Created" badge

Source: `src/components/Dashboard/EventsTable.tsx` line 260, using shadcn `Badge` (`src/components/ui/badge.tsx`).

The badge is built from these classes:
```
inline-flex items-center rounded-full border
px-2.5 py-0.5 text-xs font-semibold
bg-white border-primary text-primary
+ text-sm  (overrides text-xs to 14px)
```

Resolved values:
- Border: `1px` solid, brown primary color
- Radius: `rounded-full` (9999px)
- Horizontal padding: `px-2.5` = 10px
- Vertical padding: `py-0.5` = 2px
- Font size: `text-sm` = 14px, `font-semibold` = 600
- Line height: `text-sm` default = 20px
- Background: white

**Exact rendered height:** `2px (top pad) + 20px (line-height) + 2px (bot pad) + 1px×2 (border) = 26px`

(The icon inside the dashboard badge is `w-4 h-4` = 16px which fits inside the 20px line box, so the badge stays 26px tall regardless of icon. Sign In / Sign Up have no icon, so they will also be 26px.)

## Current state (problem)

`src/components/Layout/Header.tsx` lines 224–245 render the pills with:
```
px-4 py-1.5
fontSize: 13px, fontWeight: 600, lineHeight: 18px
border color #967A59
```
Resolved height = `6 + 18 + 6 + 2 = 32px` — too tall, padding too big.

## Change (mobile dropdown only — desktop/tablet untouched)

In `src/components/Layout/Header.tsx`, update both Sign In and Sign Up `<button>` elements inside the mobile menu (lines ~228–245):

1. Replace classes `px-4 py-1.5` → `px-2.5 py-0.5`
2. Replace `pillStyle` inline style:
   - `fontSize: '13px'` → `'14px'`
   - `lineHeight: '18px'` → `'20px'`
   - keep `fontWeight: 600`, `color: '#967A59'`, `borderColor: '#967A59'`
3. Keep `rounded-full border bg-white`, `inline-flex items-center justify-center`
4. Keep both buttons side-by-side in the existing flex row — no spacing/layout changes elsewhere.

Result: pills render at exactly **26px tall** with **10px horizontal padding**, identical geometry to the "1 Event Created" badge.

## Scope guard

- Only the two pill buttons inside the mobile dropdown (`lg:hidden` block) are modified.
- Desktop header buttons (lines ~170–185), tablet view, dropdown menu items, Products list, and every other page remain untouched.
- No memory updates required (these pills are not part of a locked surface).

## Verification

After implementing, I'll open the preview at mobile width (375px), open the menu, and confirm:
- Sign In and Sign Up pills match the "1 Event Created" badge height (26px) and padding visually.
- Desktop header at ≥1024px is unchanged.
