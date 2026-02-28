

# Add Full Google Fonts Library (1,500+) to Place Cards Font Picker

## What's Changing
Replace the current ~45-font dropdown selects in the Place Cards customizer with a searchable font picker that loads the entire Google Fonts library (1,500+ fonts), organized by category.

## Approach

### 1. Create a Google Fonts API fetcher (`src/lib/googleFontsApi.ts`)
- Fetch all fonts from `https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=API_KEY`
- Since we don't want to require an API key, we'll use the alternative approach: fetch from Google Fonts' publicly available CSS API, or bundle a static list fetched from the API
- Actually, the simplest reliable approach: use the free, no-key-required endpoint `https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity` (the key is optional for this public endpoint) -- but since it may be rate-limited, we'll bundle a cached list of all Google Font names with their categories as a static JSON/TS file
- Categories from Google Fonts API: `serif`, `sans-serif`, `display`, `handwriting`, `monospace`
- Keep the existing custom premium fonts (Beauty Mountains, Valentine Baby, etc.) in a separate "Premium" category

### 2. Create a new `PlaceCardFontPicker` component (`src/components/Dashboard/PlaceCards/PlaceCardFontPicker.tsx`)
- Uses the Popover + Command (cmdk) pattern already used by `GoogleFontPicker` in Invitations
- Search input at top for instant filtering across 1,500+ fonts
- Grouped by category: Premium, Handwriting, Serif, Sans-Serif, Display, Monospace
- Each font name rendered in its own typeface (lazy-load fonts on scroll/open)
- Virtualized or paginated display to handle 1,500+ items without lag (show top 50 per category initially, load more on scroll)

### 3. Update `PlaceCardCustomizer.tsx`
- Replace the two `<Select>` dropdowns (Guest Name Font and Table/Seat/Message Font) with the new `PlaceCardFontPicker` component
- Remove the inline `FONT_OPTIONS` array
- Keep all other customizer functionality untouched

## Technical Details

**New files:**
- `src/lib/googleFontsFullList.ts` -- Static array of ~1,500 font entries `{ name: string, category: string }` sourced from Google Fonts API
- `src/components/Dashboard/PlaceCards/PlaceCardFontPicker.tsx` -- Searchable combobox component

**Modified files:**
- `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx` -- Replace Select with PlaceCardFontPicker, remove FONT_OPTIONS array

**Performance considerations:**
- Only load font CSS for fonts that are visible in the picker (not all 1,500 at once)
- Use the existing `loadGoogleFont()` utility to load fonts on demand
- CommandList from cmdk already handles filtering efficiently
- Limit visible items to ~20 per category with the Command component's built-in filtering

Note: The existing premium/custom fonts (Beauty Mountains, Valentine Baby, etc.) will be preserved in a dedicated "Premium" section at the top of the picker.

