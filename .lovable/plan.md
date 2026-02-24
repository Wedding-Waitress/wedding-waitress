
# Redesign Seating Chart Public View to Match PDF Layout

## What's Changing
The public shared view at `/seating-chart/:token` currently shows a plain single-column HTML table. It needs to be redesigned to visually match the PDF output: a two-column A4-style layout with colored headers, circle checkboxes, bold guest names, and table assignments -- exactly like screenshot 2 the user provided.

## Visual Changes
- **Header**: Purple event name, bold "Full Seating Chart - [Date]" subtitle, venue/stats/page info line with bottom border
- **Guest list**: Two-column grid layout with circle checkboxes, bold first names on the left, colored "Table X" or "Unassigned" on the right
- **Multi-page**: All pages rendered vertically (scrollable), matching the PDF's pagination logic (auto-fit based on font size)
- **Footer**: Wedding Waitress logo centered at the bottom of each page
- **Page container**: White A4-proportioned cards with shadow, displayed on a light background

## Technical Details

### File to Modify
**`src/pages/SeatingChartPublicView.tsx`**

The entire guest display section (lines 130-151) will be replaced with a multi-page A4-style layout that reuses the same pagination logic from `FullSeatingChartPreview.tsx`:

1. Calculate `guestsPerColumn` and `guestsPerPage` using the same row height formula (medium font = 11mm rows, 155mm available height)
2. Split guests into pages, each page into two columns
3. Render each page as a white card with:
   - Purple event name (centered)
   - "Full Seating Chart - [formatted date]" (centered, bold)
   - "[Venue] - Total Guests: X - Page Y of Z - Generated on: [timestamp]" with bottom border
   - Column headers: "GUESTS 1-14" / "GUESTS 15-28"
   - Guest rows: purple circle + bold name + colored table badge
   - Wedding Waitress logo at bottom
4. Keep the top header bar with "View Only" and "Download PDF" buttons
5. Keep the bottom footer with logo link

The page will NOT use the locked `FullSeatingChartPreview` component directly (it has interactive checkboxes and dashboard-specific features). Instead, it will render a read-only version with the same visual structure.
