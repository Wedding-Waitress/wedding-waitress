## Goal

Improve visual hierarchy of the mobile Products dropdown in `src/components/Layout/Header.tsx` (`lg:hidden` block only). No items removed, no spacing changes — visual only. The divider above Pricing is conditional on Products being open.

## Single file: `src/components/Layout/Header.tsx`

### 1. Products parent row active state (~lines 260–271)

Append/merge classes on the Products `<button>` based on `mobileProductsOpen` (keep existing `w-full flex items-center justify-between px-3` and any focus-visible styles):
- Open: add `bg-[#FAF6EF] text-gray-950 font-semibold rounded-xl` (no hover)
- Closed: keep current `hover:bg-gray-50 rounded-xl`

`itemStyle`, `<span>{t('nav.products')}</span>`, and `<ChevronDown>` (size, rotation, alignment) untouched.

### 2. Wrap the 13 product links (~lines 272–286)

Inside the existing `{mobileProductsOpen && (...)}` block, wrap the children with the indent + cream left border:
```
<div className="pl-2 my-1 border-l border-[#E8E1D6]">
  {productLinks.map(...)}
</div>
```
In each child `<Link>`, swap `hover:bg-gray-50` → `hover:bg-[#F8F5F0]`. `itemStyle`, padding, font size, spacing, and white background untouched.

### 3. Conditional divider before Pricing (~line 288)

On the Pricing `<Link>` only, conditionally append `mt-2 pt-2 border-t border-[#E8E1D6]` when `mobileProductsOpen === true`. When Products is closed, Pricing renders normally with its existing classes (no divider, no extra spacing).

## Untouched

- `itemStyle` constant; all heights / font sizes / paddings.
- Sign In / Sign Up pill row.
- How It Works, Blog, FAQ, Contact links.
- Desktop dropdown (~lines 127–204).
- Every other file and page.

## Result

- "Products" row highlights cream + semibold when open.
- 13 children render as an indented sub-group with a thin cream left border.
- Thin cream divider appears above Pricing only while Products is expanded; disappears when collapsed.
