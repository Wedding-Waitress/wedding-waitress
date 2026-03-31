

## Running Sheet: Button Labels & PDF Filename Changes

### What
Two cosmetic changes on the Running Sheet page:
1. Rename "Share with..." → "Share" and "Download entire running sheet PDF" → "Download PDF"
2. Change PDF filename from `Jason___Linda_s_Wedding-Running-Sheet-2026-03-31.pdf` to `Jason & Linda's Wedding - 20/12/2026.pdf` (using event date, formatted DD/MM/YYYY)

### Changes

**File 1: `src/components/Dashboard/RunningSheet/RunningSheetPage.tsx`**
- Line 180: Change `Share with...` to `Share`
- Line 188: Change `Download entire running sheet PDF` to `Download PDF`

**File 2: `src/lib/runningSheetPdfExporter.ts`**
- Line 272-273: Replace filename logic. Instead of sanitizing the event name and using ISO date, use the event name as-is and format the event date as DD/MM/YYYY:
  - From: `${eventName}-Running-Sheet-${new Date().toISOString().split('T')[0]}.pdf`
  - To: `${event.name} - ${formattedEventDate}.pdf` where `formattedEventDate` is the event's date (not today's date) in DD/MM/YYYY format
  - Since `/` is not allowed in filenames, use `-` instead: `DD-MM-YYYY`
  - Final example: `Jason & Linda's Wedding - 20-12-2026.pdf`

### Files modified
- `src/components/Dashboard/RunningSheet/RunningSheetPage.tsx`
- `src/lib/runningSheetPdfExporter.ts`

