

# Fix Mobile Dropdown Navigation Links

## Problem
Radix UI `DropdownMenuItem` with `asChild` wrapping `<a href="#section">` intercepts click events. The dropdown closes but `preventDefault()` is called internally by Radix, so the browser never scrolls to the anchor target. Sign In/Sign Up work because they use explicit `onSelect` handlers.

## Solution
Replace `asChild` + `<a>` pattern with `onSelect` handlers that programmatically scroll to the target section after the menu closes.

## File: `src/components/Layout/Header.tsx`

**Change**: For every anchor-based menu item (How it Works, all productLinks, Pricing, FAQ, Contact), replace:
```tsx
<DropdownMenuItem asChild className="!py-1 !px-3 text-[13px]">
  <a href="#how-it-works" className="w-full cursor-pointer">...</a>
</DropdownMenuItem>
```
With:
```tsx
<DropdownMenuItem
  className="!py-1 !px-3 text-[13px] cursor-pointer"
  onSelect={() => {
    setTimeout(() => {
      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }}
>
  {t('nav.howItWorks')}
</DropdownMenuItem>
```

The `setTimeout` gives the dropdown time to close before scrolling. Apply this pattern to all ~17 anchor links in the mobile menu (How it Works, 13 product links, Pricing, FAQ, Contact).

## What does NOT change
- Desktop navigation (already works with plain `<a>` tags outside dropdowns)
- Sign In / Sign Up (already working)
- No layout, design, color, or text changes
- Homepage content untouched

