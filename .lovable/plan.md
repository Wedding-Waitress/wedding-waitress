

# Google Fonts Picker for Invitations

## What We're Building
Replace the current basic font dropdown (15 hardcoded fonts) with a searchable Google Fonts picker that loads 50+ curated wedding-appropriate fonts, dynamically loads them from Google's CDN, and shows each font name rendered in its own typeface for easy browsing.

## How It Works for You
- When customising a text zone, the font selector becomes a searchable dropdown
- Each font name is displayed in its own typeface so you can preview before selecting
- Fonts are grouped into categories: Serif, Sans-Serif, Script/Handwriting, Display
- Selected fonts are loaded on-demand from Google Fonts CDN (no performance hit for unused fonts)

## Technical Plan

### 1. Create `GoogleFontPicker` Component
**New file:** `src/components/Dashboard/Invitations/GoogleFontPicker.tsx`

- Searchable input using the existing `Command` (cmdk) component pattern
- Curated list of ~50 wedding-appropriate Google Fonts, categorised:
  - **Serif**: Playfair Display, Cormorant Garamond, Lora, Libre Baskerville, Cinzel, EB Garamond, Merriweather, Crimson Text, Spectral, DM Serif Display
  - **Sans-Serif**: Montserrat, Raleway, Inter, Josefin Sans, Poppins, Quicksand, Nunito, Lato, Open Sans, Work Sans
  - **Script/Handwriting**: Great Vibes, Dancing Script, Alex Brush, Parisienne, Sacramento, Tangerine, Allura, Satisfy, Pinyon Script, Rouge Script
  - **Display**: Italiana, Poiret One, Tenor Sans, Cormorant SC, Marcellus, Forum, Yeseva One
- Each option renders its label in the font itself (using inline `@import` or `<link>` injection)
- Uses Popover + Command pattern (already available in project)

### 2. Create Font Loading Utility
**New file:** `src/lib/googleFonts.ts`

- `loadGoogleFont(fontName: string)` — injects a `<link>` tag for that font from `fonts.googleapis.com` if not already loaded
- `loadMultipleFonts(fonts: string[])` — batch loader
- Tracks loaded fonts in a Set to avoid duplicate link tags
- Called when: a font is selected, and when the preview/exporter renders

### 3. Update `InvitationCustomizer.tsx`
- Replace the current `<Select>` for font family with the new `<GoogleFontPicker>` component
- Remove the hardcoded `FONT_OPTIONS` array

### 4. Update `InvitationPreview.tsx`
- On mount/update, call `loadGoogleFont()` for each font used across all text zones (from zone defaults + custom overrides)
- Ensures fonts are loaded before rendering the preview

### 5. Update `InvitationExporter.tsx` / `invitationExporter.ts`
- Before capturing with `html2canvas`, ensure all used fonts are loaded via `loadMultipleFonts()`
- Add a small delay after loading to let fonts render before canvas capture

### Files Changed
| File | Change |
|------|--------|
| `src/lib/googleFonts.ts` | New — font loading utility |
| `src/components/Dashboard/Invitations/GoogleFontPicker.tsx` | New — searchable font picker |
| `src/components/Dashboard/Invitations/InvitationCustomizer.tsx` | Replace font Select with GoogleFontPicker |
| `src/components/Dashboard/Invitations/InvitationPreview.tsx` | Add font loading on render |
| `src/lib/invitationExporter.ts` | Ensure fonts loaded before export |

