# Full Seating Chart - Technical Specifications

## Overview
This document contains the exact specifications for the Full Seating Chart feature. These measurements and configurations have been finalized and should not be modified without owner approval.

**Status:** FINALIZED  
**Last Updated:** 2025-10-08  
**Owner:** Project Owner (user approval required for changes)

---

## Component Files

### Core Components
1. **FullSeatingChartPage.tsx** - Main page component
2. **FullSeatingChartPreview.tsx** - Screen and print preview
3. **FullSeatingChartExporter.tsx** - PDF generation
4. **FullSeatingChartCustomizer.tsx** - Settings panel

---

## Critical Measurements

### PDF Export (FullSeatingChartExporter.tsx)

#### Logo Specifications
- **Size:** 35mm width × 10.5mm height
- **Position:** margin - 2mm from top
- **Bottom Margin:** 22mm gap after logo

#### Page Layout
- **Page Margins:** 12mm on all sides
- **Column Gap:** 6mm between left and right columns
- **Column Width:** (pageWidth - margins - columnGap) / 2

#### Spacing (Vertical)
```
Logo (35mm × 10.5mm)
  ↓ 22mm gap
Event Name (20pt, purple)
  ↓ 4mm gap
Chart Date (15pt, bold)
  ↓ 4mm gap
Venue/Stats Line (12pt)
  ↓ 8mm gap (with border-bottom)
Guest Count Header (11pt, uppercase)
  ↓ 10mm gap ⚠️ CRITICAL - Changed from 5mm
First Guest Name
```

#### Pagination
- **Guests per column:** 11
- **Guests per page:** 22 (2 columns)
- **Automatic page breaks:** When exceeding 22 guests

#### Font Sizes (PDF)
| Setting | Guest Name | Details (Dietary/Relation) |
|---------|-----------|---------------------------|
| Small   | 10.5pt    | 9pt                       |
| Medium  | 12pt      | 10.5pt                    |
| Large   | 13.5pt    | 12pt                      |

---

### Screen Preview (FullSeatingChartPreview.tsx)

#### A4 Paper Dimensions
- **Width:** 794px (210mm at 96 DPI)
- **Height:** 1123px (297mm at 96 DPI)
- **Margins:** 45px (12mm converted to pixels)

#### Layout Structure
```
Container: 794px × 1123px
  ↓
Content Area: 794px - (45px × 2) = 704px width
              1123px - (45px × 2) = 1033px height
  ↓
Header: 120px minimum height
Guest List: 913px available height
```

#### Print Styles
- **@page size:** A4 portrait
- **@page margin:** 0 (prevent browser headers)
- **Print margins:** 12mm
- **Column gap:** 12mm
- **Logo height:** 48px (print version)

#### Font Sizes (Screen)
| Setting | Class      | Size |
|---------|-----------|------|
| Small   | text-sm   | 14px |
| Medium  | text-base | 16px |
| Large   | text-lg   | 18px |

---

## Feature Specifications

### Sorting Options
1. **First Name** - Sorts by "FirstName LastName" alphabetically
2. **Last Name** - Sorts by "LastName, FirstName" alphabetically  
3. **Table Number** - Sorts by table number, then first name

### Display Options
- **Show Dietary:** Displays dietary requirements below guest name
- **Show Relationship:** Displays guest relationship below guest name

### Paper Size Options
- A4: 210mm × 297mm
- A3: 297mm × 420mm
- A2: 420mm × 594mm
- A1: 594mm × 841mm

### Interactive Features
- **Checkboxes:** Each guest has a checkbox for check-off
- **Pagination:** Multi-page support (22 guests per page)
- **Print:** Browser print with optimized settings
- **Export:** PDF generation with jsPDF

---

## File Naming Convention

### PDF Export
```
{EventName}-Full-Seating-Chart-{YYYY-MM-DD}.pdf
```
Example: `Wedding 2025-Full-Seating-Chart-2025-10-08.pdf`

---

## Date Formatting

### Format Pattern
```
{Weekday} {Day}{Ordinal}, {Month} {Year}
```

### Examples
- Monday 1st, October 2025
- Tuesday 22nd, December 2025
- Wednesday 3rd, January 2026

### Ordinal Suffixes
- 1, 21, 31 → st
- 2, 22 → nd
- 3, 23 → rd
- 4-20, 24-30 → th

---

## Color Specifications

### PDF Colors (RGB)
- **Event Name:** RGB(139, 92, 246) - Purple
- **Text:** RGB(0, 0, 0) - Black
- **Details:** RGB(102, 102, 102) - Gray

### Screen Colors
- Uses design system tokens from index.css
- Primary color for event name
- Foreground/muted-foreground for text

---

## Print Instructions

### Optimal Print Settings
For perfect output, users should:
1. **Turn OFF** "Headers and footers" in print dialog
2. **Turn ON** "Background graphics" in print dialog
3. Select A4 paper size
4. Use Portrait orientation

### Toast Message
```
"For perfect output: in the print dialog turn OFF 'Headers and footers' 
and turn ON 'Background graphics'."
```
- Duration: 8000ms
- Shows once per session

---

## Change Log

### 2025-10-08
- **Spacing Update:** Increased gap after guest count header from 5mm to 10mm
  - Location: `FullSeatingChartExporter.tsx` line 205
  - Reason: Improved readability and visual separation
  - Changed: `yPosition += 5;` → `yPosition += 10;`

### Initial Finalization
- Established all core measurements
- Fixed pagination at 11 guests per column
- Set logo dimensions to 35mm × 10.5mm
- Configured three font size options
- Implemented multi-page PDF generation

---

## Maintenance Notes

### Before Making Changes
1. **Get owner approval** for any modifications
2. Review impact on PDF generation
3. Test print output on actual printer
4. Verify multi-page pagination still works
5. Check all font sizes render correctly
6. Ensure spacing matches specifications

### Testing Checklist
- [ ] PDF generates without errors
- [ ] Print preview matches screen preview
- [ ] All pages have correct headers
- [ ] Guest count headers show correct ranges
- [ ] Logo displays at correct size
- [ ] Spacing matches specifications
- [ ] Multi-page documents paginate correctly
- [ ] Optional fields (dietary/relation) display when enabled
- [ ] All three font sizes work correctly

---

## Related Files

### Hooks
- `useFullSeatingChartSettings.ts` - Settings management
- `useRealtimeGuests.ts` - Guest data loading
- `useEvents.ts` - Event data loading

### Assets
- `wedding-waitress-logo-full.png` - Logo file used in charts

### Types
- `FullSeatingChartSettings` interface defined in hook

---

**⚠️ WARNING:** These specifications are locked. Do not modify without explicit owner approval.
