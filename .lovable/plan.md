

## Fix Place Cards PDF Download Filenames

### Current
- Single page: `Jason---Linda-s-Wedding-place-cards-page-1-17-03-2026.pdf`
- All pages: `Jason---Linda-s-Wedding-place-cards-all-pages-17-03-2026.pdf`

### Required
- Single page: `PlaceCards-WeddingWaitress-SinglePage-Jason & Linda's Wedding.pdf`
- All pages: `PlaceCards-WeddingWaitress-AllPages-Jason & Linda's Wedding.pdf`

### Changes — Single file: `src/lib/placeCardsPdfExporter.ts`

**1. Single page export (lines 84-87)** — Replace filename generation:
```ts
const fileName = `PlaceCards-WeddingWaitress-SinglePage-${event.name}.pdf`;
```

**2. All pages export (lines 124-127)** — Replace filename generation:
```ts
const fileName = `PlaceCards-WeddingWaitress-AllPages-${event.name}.pdf`;
```

Remove the `sanitizedName` and `today` variables in both functions as they're no longer needed.

