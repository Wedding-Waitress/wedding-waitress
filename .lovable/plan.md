

## Update Default Fonts & Sizes for Name Place Cards

### Changes

Three sets of defaults need updating across two files:

**1. `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`**

- **Initial defaults** (~lines 108-114): Change `guest_font_family` from `'Inter'` to `'Great Vibes'`, `info_font_family` to `'ET Emilia Grace Demo'`, `guest_name_font_size` from `24` to `40`, `info_font_size` from `12` to `16`.
- **Reset defaults** (~lines 147-155): Same changes — `'Arial'` → `'Great Vibes'` / `'ET Emilia Grace Demo'`, sizes `24→40`, `12→16`.
- **Fallback values** (~lines 301, 312): Change `|| 'Inter'` to `|| 'Great Vibes'` and `|| 'ET Emilia Grace Demo'` respectively.

**2. `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`**

- **Fallback defaults** (~lines 49-55): Same font family and size changes.

Font color default is already `#000000` (black) — no change needed.

