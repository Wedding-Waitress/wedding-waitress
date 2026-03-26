

## Apply Purple Pill-Border Heading Style to Place Cards Customizer

### What
Apply the same purple text + thin purple pill-shaped border heading style (as seen on "You Are Invited" in the Invitations page) to specific section headings across all four tabs of the Place Cards customizer.

### Headings to style (8 total)

**Design tab:**
1. "Guest Name" (line 282) — wrap in purple pill border, purple text
2. "Table & Seat" (line 348) — same treatment

**Text Position tab:**
3. "Text Edit Mode" (line 431) — wrap in purple pill border, purple text

**Background tab:**
4. "Background Image" (line 478) — wrap in purple pill border, purple text
5. "Card Background Color" (line 666) — wrap in purple pill border, purple text

**Messages tab:**
6. "Mass Message (applies to all cards)" (line 690) — wrap in purple pill border, purple text
7. "Individual Messages" (line 699) — wrap in purple pill border, purple text

### Styling pattern
Each heading gets: `text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center gap-2 text-sm font-semibold`

This matches the Invitations "You Are Invited" pill style — purple text, thin purple border, rounded-full (pill shape), inline-flex so it hugs content width.

### Changes — `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`

1. **Line 282**: Change `<Label className="text-sm font-semibold">Guest Name</Label>` to `<span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Guest Name</span>`

2. **Line 348**: Same for "Table & Seat"

3. **Line 431**: Change `<Label className="text-sm font-semibold">Text Edit Mode</Label>` to `<span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Text Edit Mode</span>` (keep the Type icon inside)

4. **Lines 476-478**: Change the "Background Image" label to use purple pill style

5. **Line 666**: Change "Card Background Color" label to purple pill style

6. **Lines 688-690**: Change "Mass Message (applies to all cards)" label to purple pill style (keep MessageSquare icon)

7. **Line 699**: Change "Individual Messages" label to purple pill style

### File modified
- `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`

