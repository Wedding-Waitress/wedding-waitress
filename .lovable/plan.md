

## Fix: Sync Partner Names in Full Seating Chart

**Problem**: The Full Seating Chart shows only the relation role (e.g., "Guest", "Cousin") without the partner name (e.g., "Jack", "Fiona"). The guest list page correctly displays "Jack / Cousin" but the seating chart strips the partner name.

**Root Cause**: Both the preview component and PDF exporter use `guest.relation_role` (which only contains "cousin", "guest", etc.) instead of `guest.relation_display` (which contains the full "Jack / Cousin" string).

**Current output**: `Adam Saad (Vendor / Cousin)`
**Expected output**: `Adam Saad (Vendor / Jack / Cousin)`

---

### Changes

**File 1: `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx`** (line ~199-200)

- In `buildInlineInfo()`, change `guest.relation_role` to `guest.relation_display`
- This makes the preview show the full relation string including the partner name

**File 2: `src/lib/fullSeatingChartPdfExporter.ts`** (line ~298)

- In the PDF export inline info builder, change `guest.relation_role` to `guest.relation_display`
- This ensures the PDF export matches the preview

Both changes are one-line swaps — replacing `relation_role` with `relation_display` — which already contains the formatted "PartnerName / Role" string set by the guest list save logic.

