
# Lock QR Code Seating Chart Page for Production

Add production-lock warning headers to all QR Code Seating Chart files, matching the same pattern used on the Tables page, Individual Table Charts, and other locked features.

## Files to Lock (7 files)

**Components (6 files):**
1. `src/components/Dashboard/QRCode/QRCodeSeatingChart.tsx`
2. `src/components/Dashboard/QRCode/QRCodeMainCard.tsx`
3. `src/components/Dashboard/QRCode/QRCodeFeatureGrid.tsx`
4. `src/components/Dashboard/QRCode/AdvancedQRCustomizer.tsx`
5. `src/components/Dashboard/QRCode/DietaryChartCustomizer.tsx`
6. `src/components/Dashboard/QRCode/KitchenDietaryChart.tsx`

**Hook (1 file):**
7. `src/hooks/useQRCodeSettings.ts`

## What Gets Added

Each file will receive a comment block at the top (matching the existing locked-file pattern):

```
/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * The QR Code Seating Chart feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break QR code generation and customisation
 * - Changes could break the guest lookup link system
 * - Changes could break real-time event syncing
 *
 * Last locked: 2026-02-19
 */
```

No functional or visual changes -- only protective comment headers added.
