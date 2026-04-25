# Fix: Brown Logo on Full Seating Chart A4 Preview

## Problem
The on-screen A4 preview at the bottom of the Full Seating Chart page still renders the **purple** logo, while the Single Page PDF, All Pages PDF, and print view already correctly use the **brown** logo.

## Root Cause
`src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx`:
- **Line 49**: imports `weddingWaitressLogoFull from '@/assets/wedding-waitress-logo-full.png'` (purple asset).
- **Line 595**: renders `<img src={weddingWaitressLogoFull} />` in the A4 screen preview footer.

## Fix (single file, two edits)

### `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx`
1. **Remove** the purple import on line 49:
   ```ts
   import weddingWaitressLogoFull from '@/assets/wedding-waitress-logo-full.png';
   ```
2. **Update** line 595 to reference the brown public asset (cache-busted to match the print version):
   ```tsx
   src="/wedding-waitress-logo-brown.png?v=2"
   ```

No other files require changes — PDF exporters and print version already use the brown logo.

## Note
`FullSeatingChartPreview.tsx` is listed as production-locked. This change is a brand-color correction explicitly requested by the owner and matches the previously approved swap already applied to the print footer (line 695).
