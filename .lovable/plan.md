

# Running Sheet Public View — Button Styling and Footer Updates

## Changes

### 1. Upload the new Wedding Waitress logo
Copy the uploaded logo (`png-2.png`) to the public folder as a new file (e.g., `public/wedding-waitress-share-logo.png`) for use in the footer.

### 2. Update the footer
- Replace the current logo image (`/wedding-waitress-logo.png`) with the newly uploaded full Wedding Waitress logo
- Wrap both the logo image and "Powered by Wedding Waitress" text in a clickable link (`<a>`) that points to `https://www.weddingwaitress.com` and opens in a new tab

### 3. Style the "View Only" and "Download PDF" buttons
- Replace the `<Badge>` for "View Only" with a styled button/element that has a thick red border (e.g., `border-2 border-red-500`) and matching font size to "Download PDF"
- Add a thick green border to the "Download PDF" button (e.g., `border-2 border-green-500`)
- Both should appear as tablet-style bordered buttons at the same text size

## File Changed

| File | Change |
|------|--------|
| `public/wedding-waitress-share-logo.png` | New file — uploaded logo |
| `src/pages/RunningSheetPublicView.tsx` | Footer logo + link, button border styling |

## Technical Details

**Footer** (lines 287-301):
```
<a href="https://www.weddingwaitress.com" target="_blank" rel="noopener noreferrer">
  <img src="/wedding-waitress-share-logo.png" alt="Wedding Waitress" className="h-10 w-auto" />
  <p>Powered by Wedding Waitress</p>
</a>
```

**Buttons** (lines 171-203):
- "View Only": Change from `<Badge variant="secondary">` to a `<span>` or `<div>` with classes `inline-flex items-center px-4 py-2 text-sm font-medium border-2 border-red-500 rounded-full text-red-500`
- "Download PDF": Add `border-2 border-green-500` classes, ensure same `text-sm` font size

